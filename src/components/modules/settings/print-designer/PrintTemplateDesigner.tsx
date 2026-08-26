import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import {
  FiEye,
  FiEyeOff,
  FiLayout,
  FiMenu,
  FiPrinter,
  FiRotateCcw,
  FiSave,
  FiTrash2,
} from 'react-icons/fi';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { Select } from '../../../utils/fields/FormControls';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_PRINT_TEMPLATE_URL } from '../../../services/apiRoutes';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import {
  ADDABLE_BANDS,
  Band,
  DocType,
  InfoBand,
  NotesBand,
  PrintTemplate,
  SignatureBand,
  SpacerBand,
  TableBand,
  TitleBand,
  TotalsBand,
  defaultTemplate,
  nextBandId,
  normalizeTemplate,
  presetsFor,
} from '../../../utils/print-designer/printTemplate';
import {
  CheckRow,
  DocTypeContext,
  InfoBandEditor,
  NotesBandEditor,
  NumberBox,
  PANEL,
  SUB_LABEL,
  SignatureBandEditor,
  SpacerBandEditor,
  TableBandEditor,
  TitleBandEditor,
  TotalsBandEditor,
  reorder,
  useRowDrag,
} from './bandEditors';
import { sampleFor } from './sampleDocument';

/**
 * The papers this screen can lay out.
 *
 * ⚠️ A money receipt and a bill are SEPARATE entries and must stay so. They are
 * different documents with different legal weight -- the VAT falls due on the
 * bill and not on the receipt -- and one layout serving both is how a receipt
 * quietly acquires a tax line. The catalogues behind them differ for the same
 * reason: see HOTEL_RECEIPT_FIELDS, which offers no tax field at all.
 *
 * ⚠️ These ids are stored in print_templates.doc_type and are checked against
 * PrintTemplateController::DOC_TYPES. A new one needs a row in both lists.
 */
const DOC_TYPES: { id: DocType; name: string; hint: string }[] = [
  {
    id: 'sales_challan',
    name: 'Delivery Challan',
    hint: 'The paper that travels with the goods.',
  },
  {
    id: 'hotel_money_receipt',
    name: 'Hotel — Money Receipt',
    hint: 'Proof that money arrived. Carries no tax line, by design.',
  },
  {
    id: 'hotel_bill',
    name: 'Hotel — Bill',
    hint: 'What the stay was charged. The VAT falls due on this one.',
  },
];

const BAND_NAMES: Record<string, string> = {
  header: 'Letterhead',
  title: 'Document Title',
  info: 'Details',
  table: 'Product Table',
  totals: 'Totals',
  notes: 'Terms & Notes',
  signature: 'Signatures',
  spacer: 'Blank Space',
};

/**
 * Its name, and for the parts a tenant may have several of, which one it is.
 *
 * Three rows all reading "Blank Space" in a list whose whole purpose is
 * arranging them would leave nobody able to say which gap they were dragging.
 * The suffix comes off the id, which is where uniqueness already lives.
 */
const bandName = (band: Band) => {
  const name = BAND_NAMES[band.type] ?? band.type;
  const suffix = band.id.startsWith(`${band.type}-`)
    ? band.id.slice(band.type.length + 1)
    : '';
  return suffix ? `${name} ${suffix}` : name;
};

/** The parts that came with the paper. Anything added can be taken away. */
const isRemovable = (band: Band) => band.type !== 'header' && band.type !== 'table';

/** A4 at the 96dpi a browser lays out in: 210mm and 297mm, rounded. */
const PAPER_WIDTH_PX = { portrait: 794, landscape: 1123 };

/**
 * Where a tenant lays out their own delivery challan.
 *
 * The problem this exists for: this is multi-tenant software and no two
 * customers' challans look alike -- one wants weights and a truck fare, one
 * wants every field on its own boxed line in Bengali, one wants no prices on
 * the paper at all. Answering that with a template file per customer does not
 * end. Here the paper is described as bands of fields, the tenant drags them
 * into the order they want and renames every label into their own words, and
 * one renderer draws whatever the description says.
 *
 * Deliberately not a free canvas. A challan's row count is not known when it is
 * designed, so boxes placed at fixed points would ride over their own footer on
 * a long one and never reach a second page. Bands flow and the renderer
 * paginates them; what a tenant gives up is pixel placement, which is the thing
 * that would have broken on the printer anyway.
 *
 * The preview on the right is the SAME component that prints, on sample data --
 * not a drawing of it. There is no "it looked different on paper" to answer,
 * because there is only one renderer.
 */
const PrintTemplateDesigner = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: any) => state.settings?.data);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const sessionBranchId = settings?.branch?.id;

  const [branchId, setBranchId] = useState<string>('');
  /**
   * Which paper is being laid out.
   *
   * ⚠️ Changing it reloads from the server rather than converting what is on
   * screen. A challan's bands name a challan's fields, and carrying them over
   * to a hotel bill would produce a paper of blanks that looked designed.
   */
  const [docType, setDocType] = useState<DocType>('sales_challan');
  const [template, setTemplate] = useState<PrintTemplate>(() => defaultTemplate('sales_challan'));
  const [selectedBandId, setSelectedBandId] = useState<string>('table');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // What the server holds, so the page can say whether there is anything to
  // save rather than leaving a Save button that may or may not do something.
  const [saved, setSaved] = useState<string>('');

  const previewRef = useRef<HTMLDivElement>(null);
  const previewShellRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const { handlers, rowClass, dragging } = useRowDrag();

  const paperWidth = PAPER_WIDTH_PX[template.orientation];
  const [previewScale, setPreviewScale] = useState(0.6);
  const [paperHeight, setPaperHeight] = useState(0);

  // Re-measured on anything that changes either side of the sum: the panel
  // being resized, and the paper growing a band or a page. Both go through one
  // observer because both answers are read together.
  // useLayoutEffect, not useEffect: the spacer below is sized from what this
  // measures, and measuring after the browser has painted means one frame in
  // which the paper is inside a container of no height -- which the panel
  // clips, so the preview flashes empty every time the panel remounts.
  useLayoutEffect(() => {
    const shell = previewShellRef.current;
    const paper = paperRef.current;
    if (!shell || !paper) return undefined;

    const measure = () => {
      // Less the panel's own padding, so the paper does not sit under it.
      const available = shell.clientWidth - 24;
      setPreviewScale(available > 0 ? Math.min(1, available / paperWidth) : 0.6);
      setPaperHeight(paper.offsetHeight);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    observer.observe(paper);
    return () => observer.disconnect();
  }, [paperWidth, loading]);

  const dirty = useMemo(() => JSON.stringify(template) !== saved, [template, saved]);

  const printSample = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'Challan Layout Sample',
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (!branchId && sessionBranchId) setBranchId(String(sessionBranchId));
  }, [sessionBranchId, branchId]);

  // Loaded per branch: a head-office user designs one branch's paper at a time,
  // and switching the dropdown has to bring that branch's own layout with it
  // rather than leave the previous branch's on screen to be saved over.
  useEffect(() => {
    // No branch to load one for -- a user whose session carries none. The
    // designer still opens, on the default layout, rather than spinning
    // forever on a request that is never going to be made.
    if (!branchId) {
      setLoading(false);
      return undefined;
    }

    let live = true;
    setLoading(true);

    httpService
      .get(`${API_PRINT_TEMPLATE_URL}/${docType}`, { params: { branch_id: branchId } })
      .then((response) => {
        if (!live) return;
        const layout = response?.data?.data?.data?.layout ?? null;
        const next = layout ? normalizeTemplate(layout, docType) : defaultTemplate(docType);
        setTemplate(next);
        // A branch that has never saved one starts on the default and counts as
        // unsaved, so the first Save writes a row rather than looking like a
        // no-op to somebody who changed nothing.
        setSaved(layout ? JSON.stringify(next) : '');
      })
      .catch(() => {
        if (!live) return;
        setTemplate(defaultTemplate(docType));
        setSaved('');
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [branchId, docType]);

  const patch = (changes: Partial<PrintTemplate>) =>
    setTemplate((current) => ({ ...current, ...changes }));

  const replaceBand = (band: Band) =>
    setTemplate((current) => ({
      ...current,
      bands: current.bands.map((item) => (item.id === band.id ? band : item)),
    }));

  const toggleBand = (id: string) =>
    setTemplate((current) => ({
      ...current,
      bands: current.bands.map((item) =>
        item.id === id ? { ...item, show: !item.show } : item,
      ),
    }));

  const moveBand = (from: number, to: number) =>
    setTemplate((current) => ({ ...current, bands: reorder(current.bands, from, to) }));

  /**
   * Adds a part, and selects it.
   *
   * It lands at the end of the list rather than beside whatever was selected --
   * predictable, and the next thing anybody does with it is drag it where they
   * want it anyway. Selecting it is what makes the height box appear without a
   * second click, which for a spacer is the whole of the interaction.
   */
  const addBand = (type: string) => {
    const addable = ADDABLE_BANDS.find((item) => item.type === type);
    if (!addable) return;

    // Named from the template as it stands rather than from inside the state
    // updater: an updater must be a pure function of its argument, and React
    // runs it twice in development to prove it.
    const id = nextBandId(template, addable.type);

    setTemplate((current) => ({ ...current, bands: [...current.bands, addable.build(id)] }));
    setSelectedBandId(id);
  };

  const removeBand = (id: string) => {
    const remaining = template.bands.filter((item) => item.id !== id);

    setTemplate((current) => ({
      ...current,
      bands: current.bands.filter((item) => item.id !== id),
    }));

    // Never leave the right-hand panel pointing at something that is gone.
    if (selectedBandId === id) setSelectedBandId(remaining[remaining.length - 1]?.id ?? '');
  };

  const applyPreset = (presetId: string) => {
    const preset = presetsFor(docType).find((item) => item.id === presetId);
    if (!preset) return;
    setTemplate(preset.build());
    setSelectedBandId('table');
    toast.info(`${preset.name} loaded. Nothing is saved until you press Save.`);
  };

  const save = async () => {
    if (!branchId) {
      toast.error('Choose a branch first.');
      return;
    }

    setSaving(true);
    try {
      await httpService.post(API_PRINT_TEMPLATE_URL, {
        doc_type: docType,
        branch_id: Number(branchId),
        layout: template,
      });
      setSaved(JSON.stringify(template));
      toast.success('Saved. Challans from this branch print this way from now on.');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'The layout could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setTemplate(defaultTemplate(docType));
    setSelectedBandId('table');
  };

  const selected = template.bands.find((band) => band.id === selectedBandId);

  const bandEditor = () => {
    if (!selected) {
      return (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pick a part of the paper on the left to change it.
        </p>
      );
    }

    switch (selected.type) {
      case 'header':
        return (
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            The letterhead comes from <b>Branch → Print Setup</b>, not from here — the
            branch's own heading, the company's, an uploaded image, or blank space for
            paper that comes from the press with the letterhead already printed on it.
            One setting there heads every report, so it is not repeated per template.
          </p>
        );
      case 'title':
        return (
          <TitleBandEditor band={selected as TitleBand} onChange={replaceBand} />
        );
      case 'info':
        return <InfoBandEditor band={selected as InfoBand} onChange={replaceBand} />;
      case 'table':
        return <TableBandEditor band={selected as TableBand} onChange={replaceBand} />;
      case 'totals':
        return <TotalsBandEditor band={selected as TotalsBand} onChange={replaceBand} />;
      case 'notes':
        return <NotesBandEditor band={selected as NotesBand} onChange={replaceBand} />;
      case 'signature':
        return (
          <SignatureBandEditor band={selected as SignatureBand} onChange={replaceBand} />
        );
      case 'spacer':
        return <SpacerBandEditor band={selected as SpacerBand} onChange={replaceBand} />;
      default:
        return null;
    }
  };

  return (
    // ⚠️ The whole screen, so every field picker inside offers THIS paper's
    // catalogue. A receipt whose picker still offered the challan's fields
    // would let a tenant put a VAT line on a money receipt, which is the one
    // thing the two doc types exist to prevent.
    <DocTypeContext.Provider value={docType}>
      <div className="p-2">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Print Layout" screen="print-template-designer" />
      </div>

      {/* ------------------------- the strip ------------------------- */}
      <div className={`${PANEL} mb-3`}>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <span className={SUB_LABEL}>Branch</span>
            <BranchDropdown
              id="print_template_branch"
              name="branch_id"
              branchDdl={branchDdlData?.protectedData?.data ?? []}
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            />
          </div>

          <div>
            <span className={SUB_LABEL}>Paper</span>
            {/* ⚠️ Changing this RELOADS from the server rather than converting
                what is on screen: a challan's bands name a challan's fields,
                and carried over to a hotel bill they would draw a paper of
                blanks that looked designed. */}
            <Select
              value={docType}
              onChange={(event) => setDocType(event.target.value as DocType)}
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark"
              title={DOC_TYPES.find((item) => item.id === docType)?.hint}
            >
              {DOC_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <span className={SUB_LABEL}>Start from</span>
            <Select
              value=""
              onChange={(event) => {
                if (event.target.value) applyPreset(event.target.value);
              }}
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark"
            >
              <option value="">Choose a ready layout…</option>
              {presetsFor(docType).map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} — {preset.hint}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NumberBox
              label="Text size"
              value={template.fontSize}
              min={7}
              max={24}
              onChange={(fontSize) => patch({ fontSize })}
            />
            <NumberBox
              label="Rows per page"
              value={template.rowsPerPage}
              min={0}
              max={200}
              hint="0 = all on one page"
              onChange={(rowsPerPage) => patch({ rowsPerPage })}
            />
          </div>

          <div className="flex items-end justify-end gap-2">
            <ButtonLoading
              onClick={() => printSample()}
              label="Test Print"
              size="sm"
              className="whitespace-nowrap"
              icon={<FiPrinter className="mr-1" />}
            />
            <ButtonLoading
              onClick={resetToDefault}
              label="Reset"
              size="sm"
              className="whitespace-nowrap"
              icon={<FiRotateCcw className="mr-1" />}
            />
            <ButtonLoading
              onClick={save}
              label={dirty ? 'Save' : 'Saved'}
              size="sm"
              buttonLoading={saving}
              disabled={saving || !dirty}
              variant="primary"
              className="whitespace-nowrap"
              icon={<FiSave className="mr-1" />}
            />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 border-t border-[rgb(var(--c-border))] pt-2 md:grid-cols-2 lg:grid-cols-4">
          <NumberBox
            label="Left margin (mm)"
            value={template.marginLeft}
            min={0}
            max={60}
            step={1}
            hint="From the edge of the paper. Wider than the right by default — that is the edge that gets punched."
            onChange={(marginLeft) => patch({ marginLeft })}
          />
          <NumberBox
            label="Right margin (mm)"
            value={template.marginRight}
            min={0}
            max={60}
            step={1}
            hint="25 mm is about an inch. A4 is 210 mm across."
            onChange={(marginRight) => patch({ marginRight })}
          />

          <div className="flex flex-col justify-end">
            <CheckRow
              checked={template.orientation === 'landscape'}
              onChange={(landscape) =>
                patch({ orientation: landscape ? 'landscape' : 'portrait' })
              }
              label="Print sideways (landscape)"
            />
          </div>
          <div className="flex flex-col justify-end">
            <CheckRow
              checked={template.showFooter}
              onChange={(showFooter) => patch({ showFooter })}
              label="Print the page foot"
              hint="Software name, and page 1 of 2."
            />
          </div>
        </div>

        <p className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
          Top and bottom are set for every report in the app together, so they are
          not here — the page foot sits a fixed distance above the paper edge on
          all of them. For room at the top of this challan, add a{' '}
          <b>Blank Space</b> part instead.
        </p>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
          {/* --------------------- the parts --------------------- */}
          <div className={`${PANEL} xl:col-span-3`}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <FiLayout /> Parts of the paper
            </h3>

            <ul className="flex flex-col gap-1.5">
              {template.bands.map((band, index) => (
                <li
                  key={band.id}
                  {...handlers(band.id, (dragged, over) =>
                    moveBand(
                      template.bands.findIndex((item) => item.id === dragged),
                      template.bands.findIndex((item) => item.id === over),
                    ),
                  )}
                  // A drag that finishes on a row also fires a click, which
                  // would swap the editor just as the tenant let go of it.
                  onClick={() => {
                    if (!dragging) setSelectedBandId(band.id);
                  }}
                  className={
                    rowClass(band.id) +
                    (selectedBandId === band.id ? ' ring-1 ring-primary' : '') +
                    (band.show ? '' : ' opacity-50')
                  }
                >
                  <FiMenu className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-[rgb(var(--c-text))]">
                    {bandName(band)}
                  </span>

                  {/* A gap's whole nature is its size, and reading it off the
                      row saves opening each one to find the right gap. */}
                  {band.type === 'spacer' ? (
                    <span className="shrink-0 text-xs text-slate-400">{band.height} mm</span>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">{index + 1}</span>
                  )}

                  <Button
                    type="button"
                    draggable={false}
                    title={band.show ? 'On the paper' : 'Left off'}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleBand(band.id);
                    }}
                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-meta-4"
                  >
                    {band.show ? <FiEye /> : <FiEyeOff />}
                  </Button>

                  {/* The letterhead and the product table stay. Everything else
                      was added and can go -- and a part switched off with the
                      eye is still in the way of the one being dragged past it,
                      so hiding is not a substitute for removing. */}
                  {isRemovable(band) ? (
                    <Button
                      type="button"
                      draggable={false}
                      title="Remove from the paper"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeBand(band.id);
                      }}
                      className="rounded p-1 text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
                    >
                      <FiTrash2 />
                    </Button>
                  ) : (
                    // A slot held open, so the eye buttons stay in one column
                    // rather than stepping sideways on the two fixed rows.
                    <span className="w-6 shrink-0" />
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-3">
              <Select
                value=""
                onChange={(event) => {
                  if (event.target.value) addBand(event.target.value);
                }}
                className="w-full rounded-sm border border-dashed border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark"
              >
                <option value="">+ Add a part…</option>
                {ADDABLE_BANDS.map((addable) => (
                  <option key={addable.type} value={addable.type}>
                    {addable.name} — {addable.hint}
                  </option>
                ))}
              </Select>
            </div>

            <p className="mt-3 border-t border-[rgb(var(--c-border))] pt-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
              Drag a part where you want it on the paper. Everything above the product
              table repeats on every page; everything below it prints once, at the end.
              Anything you never use, switch off with the eye. Add a <b>Blank Space</b>
              {' '}and drag it above or below a part to push it up or down the page.
            </p>
          </div>

          {/* --------------------- its settings --------------------- */}
          <div className={`${PANEL} xl:col-span-4`}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {selected ? bandName(selected) : 'Nothing chosen'}
            </h3>
            {bandEditor()}
          </div>

          {/* --------------------- the paper --------------------- */}
          <div className={`${PANEL} xl:col-span-5`}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              What it will look like
            </h3>

            {/* Scaled, not shrunk. The paper is laid out at its true width and
                a transform stands it down to fit the panel, so every measurement
                inside is the measurement the printer gets -- a preview built at
                some smaller width would reflow the table and stop predicting
                where the page breaks fall.
                The spacer carries the scaled height, because a transform does
                not change the room an element takes and the panel would
                otherwise scroll a page and a half past the end of the paper. */}
            <div
              ref={previewShellRef}
              className="max-h-[75vh] overflow-auto rounded-sm border border-[rgb(var(--c-border))] bg-gray-100 p-3 dark:bg-meta-4"
            >
              {/* Only once there is a measurement to stand on.
                  Before that the spacer would be `height: 0`, and the panel
                  scrolls -- so a paper standing inside a container of no height
                  is clipped away entirely and the preview shows blank. Left
                  unset, the untransformed height stands: too tall by the scale
                  factor for one frame, which is a panel that is briefly too
                  long rather than one that is briefly empty. */}
              <div style={paperHeight ? { height: paperHeight * previewScale } : undefined}>
                <div
                  ref={paperRef}
                  className="bg-white shadow-lg"
                  style={{
                    width: paperWidth,
                    // Vertical only. The side margins are the template's own now
                    // and DocumentPrint draws them; padding here as well would
                    // show the preview a wider margin than the printer gets.
                    padding: '38px 0',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  <DocumentPrint template={template} data={sampleFor(docType)} preview />
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
              Sample figures — no real voucher is shown. This is the same component that
              prints the real challan, so what is here is what comes out of the printer.
            </p>
          </div>

          {/* Test Print takes this copy, not the one on show.
              The visible preview carries a page height and dashed rules between
              sheets so the panel can show where a page ends -- on screen the
              print stylesheet is asleep and nothing else would. Both are
              inline styles, and inline styles beat @page on the way to the
              printer, so printing the visible copy would put a sample on paper
              measured slightly differently from the real challan. This one has
              neither, which makes a test print exactly what a customer's
              challan will be. */}
          <div className="hidden">
            <DocumentPrint ref={previewRef} template={template} data={sampleFor(docType)} />
          </div>
        </div>
      )}
      </div>
    </DocTypeContext.Provider>
  );
};

export default PrintTemplateDesigner;
