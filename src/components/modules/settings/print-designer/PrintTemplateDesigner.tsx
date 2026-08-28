import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import {
  FiCheckCircle,
  FiCopy,
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
import { Input, Select } from '../../../utils/fields/FormControls';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_PRINT_TEMPLATE_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';
import DocumentPrint from '../../../utils/print-designer/DocumentPrint';
import {
  ADDABLE_BANDS,
  Band,
  DOC_TYPES,
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
 * Which paper is being designed.
 *
 * It was a constant while there was one paper. Now it is state, and everything
 * that used to read the constant -- the load, the save, the preset list, the
 * sample document, the field catalogue the band editors offer -- reads this
 * instead.
 *
 * ⚠️ The list of papers itself lives in printTemplate.ts, beside the DocType it
 * has to agree with. This screen kept a second copy of it for a while, which is
 * how a paper comes to exist in the type and not in the dropdown -- or worse,
 * the other way round, offering a doc_type the server refuses to store.
 */

/**
 * One layout a branch keeps for a paper, as the server holds it.
 *
 * The description travels WITH the list rather than being fetched when one is
 * picked. Comparing two arrangements is the whole reason for keeping two, and a
 * round trip on every flick between them would make it feel like loading two
 * screens instead of turning a page.
 */
interface SavedLayout {
  id: number;
  name: string;
  is_default: number;
  layout: any;
}

/**
 * A name no other layout of this branch's is using.
 *
 * ⚠️ The name is the second half of the unique key on the table, so a duplicate
 * is refused by the server. Handing somebody "Layout 2" when they already have
 * one, and letting them find out on Save, is a worse way to say the same thing.
 */
const freeLayoutName = (taken: SavedLayout[], base = 'Layout') => {
  const used = new Set(taken.map((one) => one.name.trim().toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;

  for (let n = 2; n < 200; n += 1) {
    const candidate = `${base} ${n}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }

  return base;
};

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
 * Which papers have an address of their own.
 *
 * ⚠️ Deliberately partial. The challan and the order are reached from the menu
 * by their own routes; the hotel's two ride on the challan's, so there is
 * nowhere to send them and the URL simply stays where it is. A full map with
 * the challan route filled in for all four would read as correct and would
 * quietly remount this screen on the wrong paper.
 */
const ROUTE_OF: Partial<Record<DocType, string>> = {
  sales_challan: routes.print_template_designer,
  sales_order: routes.order_template_designer,
};

/**
 * Where a tenant lays out their own printed papers.
 *
 * The problem this exists for: this is multi-tenant software and no two
 * customers' papers look alike -- one wants weights and a truck fare, one
 * wants every field on its own boxed line in Bengali, one wants no prices on
 * the paper at all. Answering that with a template file per customer does not
 * end. Here the paper is described as bands of fields, the tenant drags them
 * into the order they want and renames every label into their own words, and
 * one renderer draws whatever the description says.
 *
 * It began as the challan's screen and now edits the sales order too, chosen at
 * the top. Adding a third paper is a catalogue and a default template in
 * printTemplate.ts and nothing here -- which is the test of whether the idea
 * was worth building.
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
const PrintTemplateDesigner = ({ paper = 'sales_challan' }: { paper?: DocType }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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
   *
   * Starts from the `paper` prop, so a caller can open the screen on the paper
   * it is about rather than on the challan every time.
   */
  const [docType, setDocType] = useState<DocType>(paper);
  const [template, setTemplate] = useState<PrintTemplate>(() => defaultTemplate(paper));
  const [selectedBandId, setSelectedBandId] = useState<string>('table');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // What the server holds, so the page can say whether there is anything to
  // save rather than leaving a Save button that may or may not do something.
  const [saved, setSaved] = useState<string>('');

  /**
   * Every layout this branch keeps for this paper, and which of them is on
   * screen.
   *
   * ⚠️ `layoutId` NULL MEANS UNSAVED, and it is the difference between Save
   * writing over what is on the server and Save adding a layout beside it. A
   * branch that spent an hour on its order pad, then wanted to try a second
   * arrangement, used to have to destroy the first to see the second.
   */
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [layoutId, setLayoutId] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState<string>('Default');
  const [deleting, setDeleting] = useState(false);

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

  /**
   * What "unchanged" means, in one place.
   *
   * ⚠️ THE NAME IS PART OF IT. Renaming a layout and pressing Save has to
   * work, and with the signature taken from the bands alone the button sat
   * there saying "Saved" over a name the server had never heard of.
   */
  const signatureOf = (name: string, layout: PrintTemplate) =>
    JSON.stringify({ name: name.trim(), layout });

  const dirty = useMemo(
    () => signatureOf(layoutName, template) !== saved,
    [layoutName, template, saved],
  );

  /** The one that prints, as the server last told us. */
  const printingId = useMemo(
    () => layouts.find((one) => one.is_default)?.id ?? null,
    [layouts],
  );

  const printSample = useReactToPrint({
    contentRef: previewRef,
    documentTitle: 'Print Layout Sample',
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
      .get(`${API_PRINT_TEMPLATE_URL}/${docType}/layouts`, { params: { branch_id: branchId } })
      .then((response) => {
        if (!live) return;
        const list: SavedLayout[] = response?.data?.data?.data ?? [];
        setLayouts(list);

        // The one that prints, opened first: it is the paper coming out of the
        // printer today, so it is the one somebody who came here to change
        // something means. The server sorts it to the front; the fallback is
        // for a row whose flag was lost outside the app.
        const opening = list.find((one) => one.is_default) ?? list[0] ?? null;
        openLayout(opening);
      })
      .catch(() => {
        if (!live) return;
        setLayouts([]);
        openLayout(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });

    return () => {
      live = false;
    };
    // openLayout is stable enough for this: it only ever reads docType, which
    // is already a dependency. Listing it would remake the effect on every
    // render and reload the branch's layouts with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, docType]);

  /**
   * Puts one saved layout on screen, or a blank one when given nothing.
   *
   * ⚠️ It sets `saved` from the SAME pair it just put on screen, so nothing
   * arrives looking edited. A branch that has never saved one starts on the
   * built-in default with `saved` empty -- unsaved on purpose, so the first
   * Save writes a row rather than sitting there disabled in front of somebody
   * who changed nothing and simply wants their own layout kept.
   */
  const openLayout = (one: SavedLayout | null) => {
    const next = one?.layout ? normalizeTemplate(one.layout, docType) : defaultTemplate(docType);
    const name = one?.name ?? 'Default';

    setTemplate(next);
    setLayoutId(one?.id ?? null);
    setLayoutName(name);
    setSaved(one ? signatureOf(name, next) : '');
    setSelectedBandId('table');
  };

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

  /**
   * Writes what is on screen to the server.
   *
   * One button for both jobs, because from where the tenant sits there is only
   * one: an id on screen means save over that layout, no id means keep this as
   * a new one. `printing` is passed when the point of the press was to change
   * which layout comes out of the printer.
   */
  const save = async (printing = false) => {
    if (!branchId) {
      toast.error('Choose a branch first.');
      return;
    }

    const name = layoutName.trim();

    if (!name) {
      toast.error('Give this layout a name first.');
      return;
    }

    // Refused here as well as on the server. The server's answer arrives after
    // the request and says the same thing; this one arrives before it, which is
    // the difference between a warning and a rejection.
    const clash = layouts.some(
      (one) => one.id !== layoutId && one.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (clash) {
      toast.error(`This branch already keeps a layout called “${name}”. Give this one another name.`);
      return;
    }

    setSaving(true);
    try {
      const response = await httpService.post(API_PRINT_TEMPLATE_URL, {
        doc_type: docType,
        branch_id: Number(branchId),
        layout: template,
        name,
        // Absent on a new layout, so the server adds one rather than writing
        // over whichever it found.
        ...(layoutId ? { id: layoutId } : {}),
        // ⚠️ Sent only to CLAIM the printer. Sending the current state instead
        // would quietly hand it back to a layout the tenant had just moved it
        // away from, every time they saved a tweak to the old one.
        ...(printing ? { is_default: true } : {}),
      });

      const stored = response?.data?.data?.data ?? null;
      const id = stored?.id ?? layoutId;

      setLayoutId(id ?? null);
      setSaved(signatureOf(name, template));

      // Re-read rather than patched in place: the server moves the flag off
      // whichever layout used to print, and guessing that here would leave the
      // list claiming two of them do.
      await reloadLayouts();

      toast.success(
        stored?.is_default
          ? 'Saved. This is the layout this branch prints.'
          : 'Saved. It is kept, but the branch still prints the one marked below.',
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'The layout could not be saved.',
      );
    } finally {
      setSaving(false);
    }
  };

  /** The list again, without disturbing what is on screen. */
  const reloadLayouts = async () => {
    if (!branchId) return;

    try {
      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/${docType}/layouts`, {
        params: { branch_id: branchId },
      });
      setLayouts(response?.data?.data?.data ?? []);
    } catch {
      // The list going stale is not worth an error over the work on screen.
      // It is right again the next time the branch or the paper changes.
    }
  };

  /**
   * Starts a layout of its own, keeping the drawing as a head start.
   *
   * ⚠️ It does NOT clear the bands. Somebody presses this having got most of
   * the way to what they want and wanting to keep the old one too -- throwing
   * their work away and handing back an empty paper is the opposite of what
   * they asked for. Only the identity is dropped, so the next Save adds a
   * layout instead of writing over the one they started from.
   */
  const startNewLayout = () => {
    setLayoutId(null);
    setLayoutName(freeLayoutName(layouts));
    setSaved('');
    toast.info('A new layout, started from what is on screen. Name it, then Save.');
  };

  /** Throws one saved layout away. The server hands the printer to another. */
  const removeLayout = async () => {
    if (!layoutId) return;

    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete the layout “${layoutName}”? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      await httpService.delete(`${API_PRINT_TEMPLATE_URL}/${docType}`, {
        params: { branch_id: branchId, id: layoutId },
      });

      const response = await httpService.get(`${API_PRINT_TEMPLATE_URL}/${docType}/layouts`, {
        params: { branch_id: branchId },
      });
      const list: SavedLayout[] = response?.data?.data?.data ?? [];

      setLayouts(list);
      // Onto whatever prints now -- never left pointing at the row that is
      // gone, which would make the next Save recreate it.
      openLayout(list.find((one) => one.is_default) ?? list[0] ?? null);
      toast.success(
        list.length
          ? 'Layout deleted.'
          : 'Layout deleted. This branch is back on the built-in default.',
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'The layout could not be deleted.',
      );
    } finally {
      setDeleting(false);
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
        {/* Named, so the browser tab says which paper is being laid out. */}
        <HelmetTitle
          title={`${DOC_TYPES.find((one) => one.id === docType)?.name ?? 'Print'} Layout`}
          screen="print-template-designer"
        />
      </div>

      {/* ------------------------- the strip -------------------------

          ⚠️ A TWELVE-COLUMN GRID, and it took three tries to get here.

          Five equal columns cut "Choose a ready layout…" down to "Choose a
          ready lay". Equal thirds then stretched a branch name across five
          hundred pixels on a wide screen. Fixed widths in a wrapping row fixed
          both and introduced a third fault: where a cell landed depended on how
          much room was left, so the same panel packed differently at every
          width and nothing lined up with anything.

          Twelve columns settle it. Each control names the share it wants, the
          shares add to twelve, and the tracks are the same at every size -- so
          Text size sits under Branch rather than wherever it happened to fall.

          Two rows by arithmetic rather than by a break: 3 + 3 + 6 fills the
          first, 2 + 2 + 8 the second. The actions take that last eight and
          align right inside it, which is where a toolbar's spare room belongs
          and how Reset stays a long way from anything else.

          Below `lg` it steps to two columns and then to one, so a phone gets a
          stack of full-width controls. */}
      <div className={`${PANEL} mb-3`}>
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <span className={SUB_LABEL}>Branch</span>
            <BranchDropdown
              id="print_template_branch"
              name="branch_id"
              branchDdl={branchDdlData?.protectedData?.data ?? []}
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
            />
          </div>

          {/* Which paper. Beside the branch rather than anywhere else, because
              the two together are what identifies the layout being edited --
              one row per branch per paper is exactly what the table holds.

              ⚠️ ONE PICKER. Both branches drew this cell and the merge kept
              both, which put six cells in a five-column strip -- the buttons
              wrapped onto a row of their own and sat at the far left, under the
              sidebar. Two pickers for one value is also two places to change
              when a fifth paper arrives.

              ⚠️ Changing it RELOADS from the server rather than converting what
              is on screen: a challan's bands name a challan's fields, and
              carried over to a hotel bill they would draw a paper of blanks
              that looked designed. */}
          <div className="lg:col-span-3">
            <span className={SUB_LABEL}>Paper</span>
            <Select
              id="print_template_doc_type"
              name="doc_type"
              value={docType}
              onChange={(event) => {
                const next = event.target.value as DocType;
                setDocType(next);

                // ⚠️ ONLY THE TWO PAPERS THAT HAVE A ROUTE. The address bar
                // follows so that a reload, or a link handed to somebody, comes
                // back to the paper on screen rather than the one the menu
                // named -- but the hotel's two are reached through the challan
                // route and have none of their own. Sending them to it anyway
                // remounted this screen on `paper`, which threw the choice away:
                // picking Hotel — Bill from the order layout landed back on the
                // challan. replace, so Back leaves the designer rather than
                // walking through every paper that was looked at.
                const home = ROUTE_OF[next];

                if (home && home !== window.location.pathname) {
                  navigate(home, { replace: true });
                }
              }}
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark"
            >
              {DOC_TYPES.map((paper) => (
                <option key={paper.id} value={paper.id}>
                  {paper.name}
                </option>
              ))}
            </Select>
            {/* Only where there is one. An empty hint still drew its paragraph,
                and the margin it carried made this cell taller than the others
                on every paper that has none -- which knocked the grid row out
                of line for the sake of a blank space. */}
            {DOC_TYPES.find((paper) => paper.id === docType)?.hint ? (
              <p className="mt-0.5 text-[0.65rem] leading-snug text-gray-500 dark:text-gray-400">
                {DOC_TYPES.find((paper) => paper.id === docType)?.hint}
              </p>
            ) : null}
          </div>

          {/* Six of the twelve: its options are a name AND a sentence, and it
              is the one control here that is read rather than glanced at. */}
          <div className="sm:col-span-2 lg:col-span-6">
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

          {/* Two digits apiece, and the second wants the room its label needs:
              "Rows per page" wrapped onto a second line at anything narrower,
              which made its cell taller than the rest of the row. */}
          <div className="lg:col-span-2">
            <NumberBox
              label="Text size"
              value={template.fontSize}
              min={7}
              max={24}
              onChange={(fontSize) => patch({ fontSize })}
            />
          </div>

          <div className="lg:col-span-2">
            <NumberBox
              label="Rows per page"
              value={template.rowsPerPage}
              min={0}
              max={200}
              hint="0 = all on one page"
              onChange={(rowsPerPage) => patch({ rowsPerPage })}
            />
          </div>

          {/* ⚠️ The spare width of a wide screen lands HERE, inside the last
              eight columns, rather than in the fields -- which is how a branch
              name came to be five hundred pixels across.

              The empty label above keeps the buttons on the inputs' line: the
              grid aligns cells to the top, so without it they would ride up
              beside the LABELS instead. aria-hidden because there is nothing in
              it to announce. */}
          <div className="sm:col-span-2 lg:col-span-8">
            <span className={SUB_LABEL} aria-hidden="true">
              &nbsp;
            </span>

            <div className="flex flex-wrap gap-2 lg:justify-end">
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
              {/* ⚠️ Wrapped, not passed. `onClick={save}` would hand the click
                  event to the first parameter -- which is the flag that claims
                  the printer -- and every ordinary save would silently move
                  which layout the branch prints. */}
              <ButtonLoading
                onClick={() => save()}
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
        </div>

        {/* ------------------------ the layouts ------------------------

            A branch may keep several arrangements of one paper and print one
            of them. Its own row rather than another cell in the strip above:
            the strip says WHICH PAPER is being drawn, and this says WHICH
            DRAWING -- two different questions, and crowding them together is
            how somebody comes to think the Paper dropdown is what they saved
            under. */}
        <div className="mt-2 grid grid-cols-1 gap-x-3 gap-y-2 border-t border-[rgb(var(--c-border))] pt-2 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className={SUB_LABEL}>Saved layouts</span>
            <Select
              value={layoutId === null ? 'new' : String(layoutId)}
              onChange={(event) => {
                if (event.target.value === 'new') return;
                const picked = layouts.find((one) => String(one.id) === event.target.value);
                // ⚠️ Asked before the work goes. Switching layouts REPLACES what
                // is on screen, and an hour's arrangement is not something to
                // lose to a mis-click on a dropdown.
                if (
                  dirty &&
                  // eslint-disable-next-line no-alert
                  !window.confirm('Leave this layout? What you changed here is not saved.')
                ) {
                  return;
                }
                openLayout(picked ?? null);
              }}
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark"
            >
              {/* Only while there is one. An option for something that does not
                  exist is a way of choosing it, and there is nothing to choose. */}
              {layoutId === null ? (
                <option value="new">{layoutName} — not saved yet</option>
              ) : null}
              {layouts.map((one) => (
                <option key={one.id} value={one.id}>
                  {one.name}
                  {one.is_default ? ' — prints' : ''}
                </option>
              ))}
            </Select>
            <p className="mt-0.5 text-[0.65rem] leading-snug text-gray-500 dark:text-gray-400">
              {layouts.length
                ? 'Only the one marked “prints” comes out of the printer.'
                : 'Nothing saved for this branch yet — it prints the built-in layout.'}
            </p>
          </div>

          <div className="lg:col-span-3">
            <span className={SUB_LABEL}>Name of this layout</span>
            <Input
              value={layoutName}
              maxLength={64}
              placeholder="Default"
              onChange={(event) => setLayoutName(event.target.value)}
              className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark"
            />
            <p className="mt-0.5 text-[0.65rem] leading-snug text-gray-500 dark:text-gray-400">
              What the branch calls it. “Order”, “Order — no prices”.
            </p>
          </div>

          <div className="sm:col-span-2 lg:col-span-5">
            <span className={SUB_LABEL} aria-hidden="true">
              &nbsp;
            </span>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <ButtonLoading
                onClick={startNewLayout}
                label="New layout"
                size="sm"
                disabled={saving || deleting}
                className="whitespace-nowrap"
                icon={<FiCopy className="mr-1" />}
              />

              {/* Shown only where it would do something. A button that is
                  always there and nearly always disabled teaches people to
                  stop reading it. */}
              {layoutId && printingId !== layoutId ? (
                <ButtonLoading
                  onClick={() => save(true)}
                  label="Print this one"
                  size="sm"
                  buttonLoading={saving}
                  disabled={saving || deleting}
                  variant="primary"
                  className="whitespace-nowrap"
                  icon={<FiCheckCircle className="mr-1" />}
                />
              ) : null}

              <ButtonLoading
                onClick={removeLayout}
                label="Delete"
                size="sm"
                buttonLoading={deleting}
                disabled={!layoutId || saving || deleting}
                className="whitespace-nowrap"
                icon={<FiTrash2 className="mr-1" />}
              />
            </div>
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
