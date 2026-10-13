import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiX } from 'react-icons/fi';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { chartDate } from '../../utils/utils-functions/formatDate';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import PrintFooter from '../../utils/utils-functions/PrintFooter';
import PrintStyles from '../../utils/utils-functions/PrintStyles';
import { Button } from '../../../pages/UiElements/CustomButtons';
import { getProductOutDetails } from './productOutSlice';

type Props = {
  id: number | string;
  onClose: () => void;
};

// A write-off is counter-signed: the person who handled the goods, the store,
// and the owner who approved the loss.
const SIGNATORIES = ['Prepared By', 'Store In-charge', 'Authorized By'];

const ProductOutPrintModal: React.FC<Props> = ({ id, onClose }) => {
  const dispatch = useDispatch<any>();
  const [master, setMaster] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: master?.out_no ? `ProductOut-${master.out_no}` : 'ProductOut',
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    dispatch(
      getProductOutDetails(id, (response: any) => {
        if (response?.success) {
          setMaster(response.data?.master || null);
          setDetails(Array.isArray(response.data?.details) ? response.data.details : []);
        } else {
          setError(response?.message || 'Failed to load write-off');
        }
        setLoading(false);
      }),
    );
  }, [dispatch, id]);

  const totalQty = details.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
  const totalCost = details.reduce((sum, row) => sum + Number(row?.cost || 0), 0);
  const approved = Boolean(master?.is_approved);

  return (
    <div
      className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-[rgb(var(--c-surface))] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar (not printed) */}
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-[rgb(var(--c-text))]">
            Product Out
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              disabled={loading || !!error}
              variant="primary"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
            >
              <FiPrinter /> Print
            </Button>
            <Button
              onClick={onClose}
              className="flex w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-[rgb(var(--c-text-muted))] dark:hover:bg-strokedark"
            >
              <FiX />
            </Button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-3">
          {loading && <p className="py-8 text-center text-gray-500">Loading…</p>}
          {error && <p className="py-8 text-center text-red-600">{error}</p>}

          {!loading && !error && master && (
            /* ===== Printable slip (always light, like a real document) ===== */
            <div ref={printRef} className="bg-white p-6 text-[13px] text-gray-900">
              <PrintStyles />
              <PadPrinting />

              <h2 className="my-4 text-center text-lg font-bold uppercase">Damage / Loss Slip</h2>

              <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1">
                <div>
                  <b>Out No:</b> {master.out_no || '-'}
                </div>
                <div className="text-right">
                  <b>Date:</b> {chartDate(master.out_date) || '-'}
                </div>
                <div>
                  <b>Reason:</b> {master.reason_name || '-'}
                </div>
                <div className="text-right">
                  <b>From Warehouse:</b> {master.warehouse_name || 'Not Applicable'}
                </div>
                <div>
                  <b>Went Back To:</b> {master.party_name || '-'}
                </div>
                <div className="text-right">
                  <b>Voucher No:</b> {master.vr_no || '-'}
                </div>
              </div>

              {/* ⚠️ A pending slip says so on the paper. The cost column is filled
                  by FIFO only when the write-off is approved, and ৳0 printed
                  without a word would read as "this breakage was free". */}
              {!approved && (
                <div className="mb-3 border border-black px-2 py-1 text-center font-semibold uppercase">
                  Pending approval — stock not yet taken off the shelf
                </div>
              )}

              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-10 border border-black px-2 py-1 text-center">SL</th>
                    <th className="border border-black px-2 py-1 text-left">Product</th>
                    <th className="w-24 border border-black px-2 py-1 text-right">Quantity</th>
                    {approved && (
                      <th className="w-28 border border-black px-2 py-1 text-right">Cost</th>
                    )}
                    <th className="border border-black px-2 py-1 text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((row, index) => (
                    <tr key={row.id ?? index}>
                      <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                      <td className="border border-black px-2 py-1">{row.product_name || '-'}</td>
                      <td className="border border-black px-2 py-1 text-right">
                        {thousandSeparator(Number(row.quantity || 0))} {row.unit_name || ''}
                      </td>
                      {approved && (
                        <td className="border border-black px-2 py-1 text-right">
                          {thousandSeparator(Number(row.cost || 0))}
                        </td>
                      )}
                      <td className="border border-black px-2 py-1">{row.note || '-'}</td>
                    </tr>
                  ))}
                  {details.length === 0 && (
                    <tr>
                      <td
                        colSpan={approved ? 5 : 4}
                        className="border border-black px-2 py-3 text-center"
                      >
                        No items
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan={2}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      Total
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-semibold">
                      {thousandSeparator(totalQty)}
                    </td>
                    {approved && (
                      <td className="border border-black px-2 py-1 text-right font-semibold">
                        {thousandSeparator(totalCost)}
                      </td>
                    )}
                    <td className="border border-black px-2 py-1"></td>
                  </tr>
                </tbody>
              </table>

              {master.note && (
                <div className="mt-3">
                  <b>Note:</b> {master.note}
                </div>
              )}

              <div className="mt-16 grid grid-cols-3 gap-x-8 gap-y-16 text-xs">
                {SIGNATORIES.map((label) => (
                  <div key={label} className="text-center">
                    <div className="mx-auto w-40 border-t border-black pt-1">{label}</div>
                  </div>
                ))}
              </div>

              <PrintFooter fixed />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductOutPrintModal;
