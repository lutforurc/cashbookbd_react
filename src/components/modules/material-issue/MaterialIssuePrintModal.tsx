import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiX } from 'react-icons/fi';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { chartDate } from '../../utils/utils-functions/formatDate';
import PadPrinting from '../../utils/utils-functions/PadPrinting';
import ReportFooter from '../../utils/utils-functions/ReportFooter';
import { getMaterialIssueDetails } from './materialIssueSlice';

type Props = {
  id: number | string;
  onClose: () => void;
};

// A material issue challan is signed by several people along the chain from the
// store to the site, so the print carries a full row of signature blocks.
const SIGNATORIES = [
  'Prepared By',
  'Store In-charge',
  'Received By',
  'Site Engineer',
  'Project In-charge',
  'Authorized By',
];

const MaterialIssuePrintModal: React.FC<Props> = ({ id, onClose }) => {
  const dispatch = useDispatch<any>();
  const [master, setMaster] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: master?.issue_no ? `MaterialIssue-${master.issue_no}` : 'MaterialIssue',
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    dispatch(
      getMaterialIssueDetails(id, (response: any) => {
        if (response?.success) {
          setMaster(response.data?.master || null);
          setDetails(Array.isArray(response.data?.details) ? response.data.details : []);
        } else {
          setError(response?.message || 'Failed to load material issue');
        }
        setLoading(false);
      }),
    );
  }, [dispatch, id]);

  const totalQty = details.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);

  return (
    <div
      className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-xl bg-white shadow-xl dark:bg-boxdark"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar (not printed) */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-strokedark">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Material Issue</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !!error}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              <FiPrinter /> Print
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-bodydark dark:hover:bg-strokedark"
            >
              <FiX />
            </button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-3">
          {loading && <p className="py-8 text-center text-gray-500">Loadingâ€¦</p>}
          {error && <p className="py-8 text-center text-red-600">{error}</p>}

          {!loading && !error && master && (
            /* ===== Printable challan (always light, like a real document) ===== */
            <div ref={printRef} className="bg-white p-6 text-[13px] text-gray-900">
              <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>

              {/* Letterhead (shared branch / company pad) */}
              <PadPrinting />

              {/* Title */}
              <h2 className="my-4 text-center text-lg font-bold uppercase">Material Issue Challan</h2>

              {/* Header meta */}
              <div className="mb-3 grid grid-cols-2 gap-x-8 gap-y-1">
                <div>
                  <b>Issue No:</b> {master.issue_no || '-'}
                </div>
                <div className="text-right">
                  <b>Date:</b> {chartDate(master.issue_date) || '-'}
                </div>
                <div>
                  <b>Project / Site:</b> {master.project_name || '-'}
                </div>
                <div className="text-right">
                  <b>From Warehouse:</b> {master.warehouse_name || 'Not Applicable'}
                </div>
                <div>
                  <b>Received By:</b> {master.received_by || '-'}
                </div>
                <div className="text-right">
                  <b>Voucher No:</b> {master.vr_no || '-'}
                </div>
              </div>

              {/* Items */}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-10 border border-black px-2 py-1 text-center">SL</th>
                    <th className="border border-black px-2 py-1 text-left">Product</th>
                    <th className="w-24 border border-black px-2 py-1 text-right">Quantity</th>
                    <th className="border border-black px-2 py-1 text-left">Building / Floor</th>
                    <th className="border border-black px-2 py-1 text-left">Work Item</th>
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
                      <td className="border border-black px-2 py-1">{row.building || '-'}</td>
                      <td className="border border-black px-2 py-1">{row.work_item || '-'}</td>
                      <td className="border border-black px-2 py-1">{row.note || '-'}</td>
                    </tr>
                  ))}
                  {details.length === 0 && (
                    <tr>
                      <td colSpan={6} className="border border-black px-2 py-3 text-center">
                        No items
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td
                      colSpan={2}
                      className="border border-black px-2 py-1 text-right font-semibold"
                    >
                      Total Quantity
                    </td>
                    <td className="border border-black px-2 py-1 text-right font-semibold">
                      {thousandSeparator(totalQty)}
                    </td>
                    <td className="border border-black px-2 py-1" colSpan={3}></td>
                  </tr>
                </tbody>
              </table>

              {master.note && (
                <div className="mt-3">
                  <b>Note:</b> {master.note}
                </div>
              )}

              {/* Signatures */}
              <div className="mt-16 grid grid-cols-3 gap-x-8 gap-y-16 text-xs">
                {SIGNATORIES.map((label) => (
                  <div key={label} className="text-center">
                    <div className="mx-auto w-40 border-t border-black pt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Software-developed-by footer (pinned to page bottom in print) */}
              <ReportFooter />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialIssuePrintModal;
