import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { PrintButton } from '../../../../pages/UiElements/CustomButtons';
import PrintRowsInput from '../../../utils/fields/PrintRowsInput';
import PrintFontInput from '../../../utils/fields/PrintFontInput';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import { API_REPORT_BUYER_DUES_URL } from '../../../services/apiRoutes';
import BuyerDuesReportPrint from './BuyerDuesReportPrint';

/**
 * Buyer Dues & Installments (real estate step 6). One row per live unit sale:
 * value, received and due from the buyer's ledger, and from the installment
 * schedule the next installment and what is overdue as at the chosen date.
 * Overdue first, so the buyers to call are at the top.
 */

const payloadOf = (response: any) => response?.data?.data?.data;
const iso = (date: Date | null) =>
  date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';
export const dmy = (value?: string | null) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '');
export const money = (value: any) => (value === null || value === undefined ? '-' : thousandSeparator(Number(value), 2));

const BuyerDuesReport = () => {
  const { t } = useTranslation('common');
  const [asOf, setAsOf] = useState<Date | null>(new Date());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [perPage, setPerPage] = useState<number>(0);
  const [fontSize, setFontSize] = useState<number>(10);
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: t('buyerDues.title') });

  const load = useCallback(async (date: Date | null) => {
    if (!iso(date)) return;
    setLoading(true);
    try {
      const response = await httpService.get(API_REPORT_BUYER_DUES_URL, { params: { as_of: iso(date) } });
      if (!response?.data?.success) {
        toast.error(response?.data?.message || t('buyerDues.failed'));
        return;
      }
      setRows(payloadOf(response)?.rows || []);
    } catch {
      toast.error(t('buyerDues.failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load(asOf);
  }, [asOf, load]);

  const totals = useMemo(() => {
    const sum = (key: string) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);
    return {
      total: sum('total'),
      received: sum('received'),
      due: sum('due'),
      overdue: sum('overdue_amount'),
      noSchedule: rows.filter((r) => Number(r.inst_count) === 0).length,
      overdueBuyers: rows.filter((r) => Number(r.overdue_amount) > 0).length,
    };
  }, [rows]);

  const card = (label: string, value: string, tone: string) => (
    <div className={`rounded-lg border border-[rgb(var(--c-border))] border-l-4 p-3 ${tone}`}>
      <div className="text-xs text-gray-600 dark:text-gray-300">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );

  return (
    <>
      <HelmetTitle title={t('buyerDues.title')} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="sm:w-44">
          <InputDatePicker
            id="as_of"
            name="as_of"
            label={t('buyerDues.asOf')}
            className="w-full px-3 py-1"
            selectedDate={asOf}
            setSelectedDate={setAsOf}
            setCurrentDate={setAsOf}
          />
        </div>
        <div className="flex flex-nowrap items-end gap-2 sm:ml-auto">
          <PrintRowsInput
            type="number"
            id="buyer-dues-per-page"
            label=""
            value={perPage}
            onChange={(e: any) => setPerPage(Number(e.target.value) || 0)}
            className="w-20! text-center"
          />
          <PrintFontInput
            type="number"
            id="buyer-dues-font-size"
            label=""
            value={fontSize}
            onChange={(e: any) => setFontSize(Number(e.target.value) || 10)}
            className="w-20! text-center"
          />
          <PrintButton label={t('handover.print')} onClick={handlePrint} className="px-6" disabled={!rows.length} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {card(t('buyerDues.total'), money(totals.total), 'border-l-sky-500')}
        {card(t('buyerDues.received'), money(totals.received), 'border-l-emerald-500')}
        {card(t('buyerDues.due'), money(totals.due), 'border-l-amber-400')}
        {card(t('buyerDues.overdue'), `${money(totals.overdue)} (${totals.overdueBuyers})`, 'border-l-rose-500')}
        {card(t('buyerDues.noSchedule'), String(totals.noSchedule), 'border-l-violet-500')}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-[rgb(var(--c-border))]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600 dark:bg-white/5 dark:text-gray-300">
              <th className="p-2 text-center font-medium">#</th>
              <th className="p-2 font-medium">{t('buyerDues.unit')}</th>
              <th className="p-2 font-medium">{t('buyerDues.customer')}</th>
              <th className="p-2 text-right font-medium">{t('buyerDues.total')}</th>
              <th className="p-2 text-right font-medium">{t('buyerDues.received')}</th>
              <th className="p-2 text-right font-medium">{t('buyerDues.due')}</th>
              <th className="p-2 text-center font-medium">{t('buyerDues.installments')}</th>
              <th className="p-2 font-medium">{t('buyerDues.next')}</th>
              <th className="p-2 text-right font-medium">{t('buyerDues.overdue')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const overdue = Number(row.overdue_amount) > 0;
              const noSchedule = Number(row.inst_count) === 0;
              return (
                <tr key={row.sale_id} className={`border-t border-[rgb(var(--c-border))] ${overdue ? 'bg-rose-50/60 dark:bg-rose-500/10' : ''}`}>
                  <td className="p-2 text-center tabular-nums text-gray-500">{index + 1}</td>
                  <td className="p-2 font-medium">
                    {row.unit_no}
                    {row.parking_no ? <span className="ml-1 text-xs font-normal text-teal-700 dark:text-teal-300">+ {row.parking_no}</span> : null}
                    <div className="text-xs font-normal text-gray-500">{row.building_name}</div>
                  </td>
                  <td className="p-2">
                    {row.customer}
                    {row.mobile ? <div className="text-xs text-gray-500">{row.mobile}</div> : null}
                  </td>
                  <td className="p-2 text-right tabular-nums">{money(row.total)}</td>
                  <td className="p-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{money(row.received)}</td>
                  <td className="p-2 text-right tabular-nums">{money(row.due)}</td>
                  <td className="p-2 text-center tabular-nums">
                    {noSchedule ? (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/30">
                        {t('buyerDues.noScheduleShort')}
                      </span>
                    ) : (
                      `${row.paid_count} / ${row.inst_count}`
                    )}
                  </td>
                  <td className="p-2 tabular-nums">
                    {row.next_due_date ? `${dmy(row.next_due_date)} · ${money(row.next_due_amount)}` : noSchedule ? '-' : t('buyerDues.allPaid')}
                  </td>
                  <td className={`p-2 text-right tabular-nums ${overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>
                    {overdue ? `${money(row.overdue_amount)} (${row.overdue_count})` : '-'}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-gray-500">
                  {loading ? '…' : t('buyerDues.empty')}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[rgb(var(--c-border))] bg-gray-50 font-semibold dark:bg-white/5">
                <td className="p-2" colSpan={3}>{t('handover.total')}</td>
                <td className="p-2 text-right tabular-nums">{money(totals.total)}</td>
                <td className="p-2 text-right tabular-nums text-emerald-700 dark:text-emerald-300">{money(totals.received)}</td>
                <td className="p-2 text-right tabular-nums">{money(totals.due)}</td>
                <td className="p-2" colSpan={2}></td>
                <td className="p-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{money(totals.overdue)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="hidden">
        <BuyerDuesReportPrint
          ref={printRef}
          rows={rows}
          totals={totals}
          asOf={dmy(iso(asOf))}
          rowsPerPage={perPage}
          fontSize={fontSize}
        />
      </div>
    </>
  );
};

export default BuyerDuesReport;
