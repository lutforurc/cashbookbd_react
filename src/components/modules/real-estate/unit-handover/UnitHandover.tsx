import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiCornerUpLeft, FiFileText, FiHome, FiKey, FiRotateCcw } from 'react-icons/fi';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { FIELD_LABEL, FIELD_PADDING, FIELD_SELECT } from '../../../../theme/fieldStyles';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { Select } from '../../../utils/fields/FormControls';
import { ButtonLoading, PrintButton } from '../../../../pages/UiElements/CustomButtons';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_UNIT_HANDOVER_BUILDINGS_URL,
  API_UNIT_HANDOVER_COMPLETE_URL,
  API_UNIT_HANDOVER_LANDOWNER_URL,
  API_UNIT_HANDOVER_LETTER_URL,
  API_UNIT_HANDOVER_REVERSE_URL,
  API_UNIT_HANDOVER_STORE_URL,
  API_UNIT_HANDOVER_UNITS_URL,
} from '../../../services/apiRoutes';
import UnitHandoverPrint from './UnitHandoverPrint';

/**
 * Unit Handover (real estate step 4). The building is marked complete first;
 * then each sold flat is handed over -- one journal recognises its price as
 * income and moves its share of the building's actual cost out of WIP. A
 * landowner's flat is handed over with no voucher. A buyer still owing is
 * warned, never stopped.
 *
 * Colour carries one meaning everywhere on the screen: the state of a unit.
 * The same four colours paint the building strip, the row edge and the badge,
 * so a glance at the strip says which rows to look for.
 */

const payloadOf = (response: any) => response?.data?.data?.data;
const refusedWith = (response: any) =>
  response?.data?.success ? null : response?.data?.message || 'The server refused that.';

const iso = (date: Date | null) =>
  date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';

const money = (value: any) => (value === null || value === undefined ? '-' : thousandSeparator(Number(value), 2));
/** yyyy-mm-dd from the server, shown as dd/mm/yyyy. */
const dmy = (value?: string | null) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '');


type UnitState = 'handed' | 'sold' | 'landowner' | 'unsold';

const stateOf = (row: any): UnitState =>
  row.handover ? 'handed' : row.sale_id ? 'sold' : row.is_landowner_share ? 'landowner' : 'unsold';

/** One entry per state: strip segment, row edge, badge. Light and dark. */
const STATE_STYLE: Record<UnitState, { bar: string; edge: string; badge: string; dot: string }> = {
  handed: {
    bar: 'bg-indigo-500 dark:bg-indigo-400',
    edge: 'border-l-indigo-500 dark:border-l-indigo-400',
    badge: 'bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/30',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
  },
  sold: {
    bar: 'bg-amber-400 dark:bg-amber-400',
    edge: 'border-l-amber-400',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-100 dark:ring-amber-400/30',
    dot: 'bg-amber-400',
  },
  landowner: {
    bar: 'bg-violet-500 dark:bg-violet-400',
    edge: 'border-l-violet-500 dark:border-l-violet-400',
    badge: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30',
    dot: 'bg-violet-500 dark:bg-violet-400',
  },
  unsold: {
    bar: 'bg-emerald-400 dark:bg-emerald-500',
    edge: 'border-l-emerald-400 dark:border-l-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/30',
    dot: 'bg-emerald-400 dark:bg-emerald-500',
  },
};

const STATE_ORDER: UnitState[] = ['handed', 'sold', 'landowner', 'unsold'];

const UnitHandover = () => {
  const { t } = useTranslation('common');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingId, setBuildingId] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);
  // Rows per printed sheet (0 = all on one sheet) and the print type size, as on every report.
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  // The handover being taken back, and why. The reason is required: it goes on the voucher.
  const [reversing, setReversing] = useState<any>(null);
  const [reason, setReason] = useState('');
  // A flat whose buyer still owes: asked about in the app's own dialog, not the browser's.
  const [owing, setOwing] = useState<any>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: t('handover.printTitle') });

  const stateLabel: Record<UnitState, string> = {
    handed: t('handover.handedOver'),
    sold: t('handover.sold'),
    landowner: t('handover.landownerShare'),
    unsold: t('handover.unsold'),
  };

  useEffect(() => {
    httpService
      .get(API_UNIT_HANDOVER_BUILDINGS_URL)
      .then((response) => setBuildings(payloadOf(response) || []))
      .catch(() => setBuildings([]));
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setData(null);
      return;
    }
    const response = await httpService.get(API_UNIT_HANDOVER_UNITS_URL, { params: { building_id: id } });
    const refused = refusedWith(response);
    if (refused) {
      toast.error(refused);
      setData(null);
      return;
    }
    setData(payloadOf(response));
  }, []);

  useEffect(() => {
    load(buildingId);
  }, [buildingId, load]);

  const post = async (key: string, url: string, body: any) => {
    setBusy(key);
    try {
      const response = await httpService.post(url, body);
      const refused = refusedWith(response);
      if (refused) {
        toast.error(refused);
        return;
      }
      toast.success(response?.data?.message || t('handover.saved'));
      await load(buildingId);
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('handover.failed'));
    } finally {
      setBusy('');
    }
    return false;
  };

  /**
   * The stored Handover Letter, as a PDF in a new tab. The tab is opened on the
   * click itself (a popup blocker stops one opened after the request returns);
   * a refusal comes back as JSON on a 2xx, so the blob's type is checked.
   */
  const openLetter = async (row: any) => {
    const tab = window.open('', '_blank');
    setBusy(`p${row.unit_id}`);
    try {
      const response = await httpService.get(`${API_UNIT_HANDOVER_LETTER_URL}/${row.handover.id}`, { responseType: 'blob' });
      if (response.data?.type?.includes('json')) {
        throw new Error(JSON.parse(await response.data.text())?.message || t('handover.noLetter'));
      }
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      if (tab) {
        tab.location.href = url;
      } else {
        window.open(url, '_blank');
      }
    } catch (error: any) {
      tab?.close();
      toast.error(error?.message || t('handover.noLetter'));
    } finally {
      setBusy('');
    }
  };

  const confirmReverse = async () => {
    if (reason.trim().length < 3) {
      toast.error(t('handover.reasonRequired'));
      return;
    }
    if (!iso(date)) {
      toast.error(t('handover.pickDate'));
      return;
    }
    const done = await post('r', API_UNIT_HANDOVER_REVERSE_URL, {
      handover_id: reversing.handover.id,
      reverse_date: iso(date),
      reason: reason.trim(),
    });
    if (done) {
      setReversing(null);
      setReason('');
    }
  };

  const rows: any[] = data?.rows || [];
  const completedOn = data?.building?.completed_on;

  const counts = useMemo(() => {
    const c: Record<UnitState, number> = { handed: 0, sold: 0, landowner: 0, unsold: 0 };
    rows.forEach((row) => {
      c[stateOf(row)] += 1;
    });
    return c;
  }, [rows]);

  const sum = (pick: (row: any) => any) => rows.reduce((total: number, row: any) => total + (Number(pick(row)) || 0), 0);

  const handOver = (row: any) => {
    if (!iso(date)) {
      toast.error(t('handover.pickDate'));
      return;
    }
    if (row.due > 0) {
      setOwing(row);
      return;
    }
    post(`h${row.unit_id}`, API_UNIT_HANDOVER_STORE_URL, { unit_id: row.unit_id, handover_date: iso(date) });
  };

  const confirmOwing = async () => {
    await post(`h${owing.unit_id}`, API_UNIT_HANDOVER_STORE_URL, { unit_id: owing.unit_id, handover_date: iso(date) });
    setOwing(null);
  };

  return (
    <>
      <HelmetTitle title={t('handover.title')} />

      {/* One row that wraps: building takes what is left, the date a fixed
          width, the print group pushed right. Every control at the project's
          one height (FIELD_SELECT and the date picker carry it; no h-* here). */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 sm:min-w-[16rem] sm:flex-1">
          <label htmlFor="building_id" className={`${FIELD_LABEL} text-sm`}>{t('handover.building')}</label>
          <Select
            id="building_id"
            name="building_id"
            className={`${FIELD_SELECT} ${FIELD_PADDING} w-full`}
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">{t('handover.selectBuilding')}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.project_name} — {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:w-44">
          <InputDatePicker
            id="handover_date"
            name="handover_date"
            label={t('handover.date')}
            className="w-full px-3 py-1"
            selectedDate={date}
            setSelectedDate={setDate}
            setCurrentDate={setDate}
          />
        </div>
        {data && (
          <div className="flex flex-nowrap items-end gap-2 sm:ml-auto">
            <PrintRowsInput
              type="number"
              id="handover-per-page"
              label=""
              value={perPage}
              onChange={(e: any) => setPerPage(Number(e.target.value) || 0)}
              className="w-20! text-center"
            />
            <PrintFontInput
              type="number"
              id="handover-font-size"
              label=""
              value={fontSize}
              onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
              className="w-20! text-center"
            />
            <PrintButton label={t('handover.print')} onClick={handlePrint} className="px-6" />
          </div>
        )}
      </div>

      {!data && (
        <p className="mt-6 rounded-lg border border-dashed border-[rgb(var(--c-border))] p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          {t('handover.emptyHint')}
        </p>
      )}

      {data && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* The building's cost: what every share below is a part of. */}
            <div className="rounded-lg border border-[rgb(var(--c-border))] border-l-4 border-l-sky-500 bg-sky-50/60 p-4 dark:border-l-sky-400 dark:bg-sky-500/10">
              <div className="text-sm text-sky-800 dark:text-sky-200">{t('handover.buildingCost')}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-sky-950 dark:text-white">
                {money(data.cost?.total)}
              </div>
              <div className="mt-1 text-xs text-sky-800/80 dark:text-sky-200/80">
                {t('handover.costSplit', { direct: money(data.cost?.direct), common: money(data.cost?.common_share) })}
              </div>
            </div>

            {/* Construction: the gate every handover waits on. */}
            <div
              className={`rounded-lg border border-[rgb(var(--c-border))] border-l-4 p-4 md:col-span-2 ${
                completedOn
                  ? 'border-l-emerald-500 bg-emerald-50/60 dark:border-l-emerald-400 dark:bg-emerald-500/10'
                  : 'border-l-amber-400 bg-amber-50/70 dark:bg-amber-500/10'
              }`}
            >
              <div className={`text-sm ${completedOn ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-100'}`}>
                {t('handover.construction')}
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                {completedOn ? (
                  <span className="flex items-center gap-2 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                    <FiCheckCircle className="shrink-0" />
                    {t('handover.completedOn', { date: dmy(completedOn) })}
                  </span>
                ) : (
                  <span className="max-w-xl text-sm text-amber-900 dark:text-amber-50">{t('handover.notComplete')}</span>
                )}
                {completedOn ? (
                  <ButtonLoading
                    onClick={() => post('c', API_UNIT_HANDOVER_COMPLETE_URL, { building_id: buildingId, completed_on: null })}
                    buttonLoading={busy === 'c'}
                    label={t('handover.undoComplete')}
                    icon={<FiRotateCcw />}
                  />
                ) : (
                  <ButtonLoading
                    onClick={() => {
                      if (!iso(date)) {
                        toast.error(t('handover.pickDate'));
                        return;
                      }
                      post('c', API_UNIT_HANDOVER_COMPLETE_URL, { building_id: buildingId, completed_on: iso(date) });
                    }}
                    buttonLoading={busy === 'c'}
                    label={t('handover.markComplete')}
                    icon={<FiCheckCircle />}
                  />
                )}
              </div>
            </div>
          </div>

          {/* The building at a glance: one segment per unit, as wide as its
              cost share, coloured by its state. */}
          <div className="mt-4 rounded-lg border border-[rgb(var(--c-border))] p-4">
            <div className="flex h-7 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-white/5" role="img" aria-label={t('handover.strip')}>
              {rows.map((row) => {
                const state = stateOf(row);
                const width = Math.max(Number(row.share) * 100, 0.6);
                return (
                  <div
                    key={row.unit_id}
                    className={`${STATE_STYLE[state].bar} h-full border-r border-white/70 last:border-r-0 dark:border-black/30`}
                    style={{ width: `${width}%` }}
                    title={`${row.unit_no} · ${stateLabel[state]} · ${(Number(row.share) * 100).toFixed(2)}%`}
                  />
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {STATE_ORDER.map((state) => (
                <span key={state} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${STATE_STYLE[state].dot}`} />
                  <span className="text-gray-700 dark:text-gray-200">{stateLabel[state]}</span>
                  <span className="font-semibold tabular-nums">{counts[state]}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-[rgb(var(--c-border))]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-600 dark:bg-white/5 dark:text-gray-300">
                  <th className="p-2 text-center font-medium">{t('handover.slNo')}</th>
                  <th className="p-2 font-medium">{t('handover.unit')}</th>
                  <th className="p-2 font-medium">{t('handover.customer')}</th>
                  <th className="p-2 text-right font-medium">{t('handover.salePrice')}</th>
                  <th className="p-2 text-right font-medium">{t('handover.received')}</th>
                  <th className="p-2 text-right font-medium">{t('handover.due')}</th>
                  <th className="p-2 text-right font-medium">{t('handover.share')}</th>
                  <th className="p-2 text-right font-medium">{t('handover.cost')}</th>
                  <th className="p-2 font-medium">{t('handover.state')}</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, index: number) => {
                  const state = stateOf(row);
                  const style = STATE_STYLE[state];
                  return (
                    <tr
                      key={row.unit_id}
                      className={`border-l-4 ${style.edge} border-t border-t-[rgb(var(--c-border))] hover:bg-gray-50/70 dark:hover:bg-white/5`}
                    >
                      <td className="p-2 text-center tabular-nums text-gray-500">{index + 1}</td>
                      <td className="p-2 font-medium">
                        {row.unit_no}
                        {row.parking_no && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-400/30">
                            + {row.parking_no}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.is_landowner_share ? t('handover.landowner') : row.customer || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="p-2 text-right tabular-nums">{money(row.sale_total)}</td>
                      <td className="p-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{money(row.received)}</td>
                      <td className={`p-2 text-right tabular-nums ${row.due > 0 ? 'font-medium text-rose-600 dark:text-rose-400' : ''}`}>
                        {money(row.due)}
                      </td>
                      <td className="p-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
                        {(Number(row.share) * 100).toFixed(2)}%
                      </td>
                      <td className="p-2 text-right tabular-nums">{money(row.handover ? row.handover.cost : row.cost)}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                          {stateLabel[state]}
                        </span>
                        {row.handover && (
                          <div className="mt-1 text-xs text-gray-500">
                            {dmy(row.handover.date)}
                            {row.handover.vr_no ? `, ${row.handover.vr_no}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-2">
                          {!row.handover && (row.sale_id || row.is_landowner_share) && completedOn && (
                            <button
                              type="button"
                              onClick={() => handOver(row)}
                              disabled={busy === `h${row.unit_id}`}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
                            >
                              <FiKey />
                              {t('handover.handOver')}
                            </button>
                          )}
                          {row.handover?.letter && (
                            <button
                              type="button"
                              onClick={() => openLetter(row)}
                              disabled={busy === `p${row.unit_id}`}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-300 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50 dark:text-indigo-200 dark:ring-indigo-400/40 dark:hover:bg-indigo-500/10"
                            >
                              <FiFileText />
                              {t('handover.letter')}
                            </button>
                          )}
                          {row.handover && (
                            <button
                              type="button"
                              onClick={() => {
                                setReason('');
                                setReversing(row);
                              }}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-300 hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-200 dark:ring-rose-400/40 dark:hover:bg-rose-500/10"
                            >
                              <FiCornerUpLeft />
                              {t('handover.reverse')}
                            </button>
                          )}
                          {!row.handover && !row.sale_id && (
                            <button
                              type="button"
                              onClick={() =>
                                post(`l${row.unit_id}`, API_UNIT_HANDOVER_LANDOWNER_URL, {
                                  unit_id: row.unit_id,
                                  on: !row.is_landowner_share,
                                })
                              }
                              disabled={busy === `l${row.unit_id}`}
                              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ring-1 ring-inset focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-50 ${
                                row.is_landowner_share
                                  ? 'text-gray-600 ring-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:ring-white/20 dark:hover:bg-white/5'
                                  : 'text-violet-700 ring-violet-300 hover:bg-violet-50 dark:text-violet-200 dark:ring-violet-400/40 dark:hover:bg-violet-500/10'
                              }`}
                            >
                              <FiHome />
                              {row.is_landowner_share ? t('handover.unmarkLandowner') : t('handover.markLandowner')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[rgb(var(--c-border))] bg-gray-50 font-semibold dark:bg-white/5">
                  <td className="p-2" colSpan={3}>{t('handover.total')}</td>
                  <td className="p-2 text-right tabular-nums">{money(sum((row) => row.sale_total))}</td>
                  <td className="p-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{money(sum((row) => row.received))}</td>
                  <td className="p-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{money(sum((row) => row.due))}</td>
                  <td className="p-2 text-right tabular-nums">{(sum((row) => row.share) * 100).toFixed(2)}%</td>
                  <td className="p-2 text-right tabular-nums">{money(sum((row) => (row.handover ? row.handover.cost : row.cost)))}</td>
                  <td className="p-2" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <ConfirmModal
            show={Boolean(owing)}
            title={t('handover.dueTitle')}
            confirmLabel={t('handover.handOver')}
            cancelLabel={t('handover.cancel')}
            loading={Boolean(owing) && busy === `h${owing?.unit_id}`}
            className="bg-indigo-600! text-white! hover:bg-indigo-700! dark:bg-indigo-500! dark:hover:bg-indigo-600!"
            onCancel={() => setOwing(null)}
            onConfirm={confirmOwing}
            message={owing ? t('handover.dueWarning', { due: money(owing.due) }) : ''}
          />

          <ConfirmModal
            show={Boolean(reversing)}
            title={t('handover.reverseTitle')}
            confirmLabel={t('handover.reverse')}
            cancelLabel={t('handover.cancel')}
            loading={busy === 'r'}
            className="bg-rose-600! text-white! hover:bg-rose-700! dark:bg-rose-500! dark:hover:bg-rose-600!"
            onCancel={() => setReversing(null)}
            onConfirm={confirmReverse}
            message={
              reversing ? (
                <div className="space-y-3 text-left">
                  <p>
                    {t('handover.reverseExplain', {
                      unit: reversing.unit_no,
                      date: dmy(iso(date)),
                    })}
                  </p>
                  {reversing.handover?.vr_no && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {t('handover.reverseVoucher', { vr: reversing.handover.vr_no })}
                    </p>
                  )}
                  <label htmlFor="reverse_reason" className="block text-sm">{t('handover.reason')}</label>
                  <textarea
                    id="reverse_reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    maxLength={191}
                    className="w-full rounded-md border border-rose-300 bg-transparent p-2 text-sm outline-none focus:border-rose-300 focus:outline-none focus:ring-0 dark:border-rose-400/60 dark:focus:border-rose-400/60"
                  />
                </div>
              ) : (
                ''
              )
            }
          />

          <div className="hidden">
            <UnitHandoverPrint
              ref={printRef}
              data={data}
              rowsPerPage={perPage}
              fontSize={fontSize}
              stateLabel={stateLabel}
              buildingName={(() => {
                const b = buildings.find((x) => String(x.id) === String(buildingId));
                return b ? `${b.project_name} — ${b.name}` : data?.building?.name || '';
              })()}
              labels={{
                title: t('handover.printTitle'),
                completedOn: t('handover.completedOn', { date: dmy(completedOn) }),
                notCompleteShort: t('handover.notCompleteShort'),
                buildingCost: t('handover.buildingCost'),
                costSplit: t('handover.costSplit', { direct: money(data.cost?.direct), common: money(data.cost?.common_share) }),
                slNo: t('handover.slNo'),
                unit: t('handover.unit'),
                customer: t('handover.customer'),
                salePrice: t('handover.salePrice'),
                received: t('handover.received'),
                due: t('handover.due'),
                share: t('handover.share'),
                cost: t('handover.cost'),
                state: t('handover.state'),
                landowner: t('handover.landowner'),
                total: t('handover.total'),
              }}
            />
          </div>
        </>
      )}
    </>
  );
};

export default UnitHandover;
