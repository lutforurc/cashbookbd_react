import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiX } from 'react-icons/fi';
import customerHttpService from '../../../services/customerHttpService';
import { API_CUSTOMER_VOUCHER_URL } from '../../../services/apiRoutes';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

type Props = {
  mtmId: number | string;
  onClose: () => void;
};

// Amount → English words (mirrors the admin cash-voucher print).
const numberToWords = (num: number): string => {
  if (!num || num === 0) return 'Zero Taka Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const belowThousand = (n: number): string => {
    let str = '';
    if (n >= 100) { str += `${ones[Math.floor(n / 100)]} Hundred `; n %= 100; }
    if (n >= 10 && n < 20) { str += `${teens[n - 10]} `; }
    else { if (n >= 20) { str += `${tens[Math.floor(n / 10)]} `; n %= 10; } if (n > 0) str += `${ones[n]} `; }
    return str.trim();
  };
  let result = '';
  let n = Math.floor(num);
  if (n >= 10000000) { result += `${belowThousand(Math.floor(n / 10000000))} Crore `; n %= 10000000; }
  if (n >= 100000) { result += `${belowThousand(Math.floor(n / 100000))} Lakh `; n %= 100000; }
  if (n >= 1000) { result += `${belowThousand(Math.floor(n / 1000))} Thousand `; n %= 1000; }
  if (n > 0) result += belowThousand(n);
  return `${result.trim()} Taka Only`;
};

const nowStamp = () => {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const fmtDateTime = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (x: number) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const CustomerVoucherModal: React.FC<Props> = ({ mtmId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: data?.voucher?.vr_no ? `Voucher-${data.voucher.vr_no}` : 'Voucher',
    removeAfterPrint: true,
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    customerHttpService
      .get(`${API_CUSTOMER_VOUCHER_URL}${mtmId}`)
      .then((res) => setData(res.data?.data || null))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load voucher'))
      .finally(() => setLoading(false));
  }, [mtmId]);

  const company = data?.company;
  const branch = data?.branch;
  const voucher = data?.voucher;
  const head = data?.head;
  const amount = Number(head?.amount || 0);

  return (
    <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/50 px-3 py-6" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl dark:bg-boxdark" onClick={(e) => e.stopPropagation()}>
        {/* Toolbar (not printed) */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-strokedark">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">Voucher</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={loading || !!error}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-opacity-90 disabled:opacity-50"
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
          {loading && <p className="py-8 text-center text-gray-500">Loading…</p>}
          {error && <p className="py-8 text-center text-red-600">{error}</p>}

          {!loading && !error && voucher && (
            /* ===== Printable voucher (always light, like a real document) ===== */
            <div ref={printRef} className="bg-white p-6 text-[13px] text-gray-900">
              <style>{`@media print { @page { size: A4 portrait; margin: 10mm; } }`}</style>

              {/* Letterhead */}
              <div className="text-center">
                <h1 className="text-2xl font-bold uppercase">{company?.name}</h1>
                {company?.address && <div>{company.address}</div>}
                {company?.phone && <div>{company.phone}</div>}
              </div>
              <div className="mt-2 border-t-2 border-gray-900" />

              <div className="mt-1 flex justify-between text-xs">
                <div>
                  <div><b>Branch:</b> {branch?.name}</div>
                  <div><b>Address:</b> {branch?.address}</div>
                </div>
                <div className="text-right">
                  <span>Printed At: {nowStamp()}</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="my-4 text-center text-lg font-bold uppercase">{voucher.title}</h2>

              <div className="mb-3 flex justify-between">
                <div><b>Voucher No:</b> {voucher.vr_no}</div>
                <div><b>Date:</b> {voucher.vr_date}</div>
              </div>

              {/* Head of account */}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border border-black px-2 py-1 text-left">Head of Account</th>
                    <th className="w-40 border border-black px-2 py-1 text-right">Amount (Taka)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ height: '110px' }}>
                    <td className="border border-black px-2 align-top">
                      <div className="pt-1">
                        <div>{head?.head_of_account}</div>
                        {head?.party_address && <div>{head.party_address}</div>}
                        {String(head?.party_mobile || '').length > 5 && <div>{head.party_mobile}</div>}
                        {head?.remarks && <div>{head.remarks}</div>}
                      </div>
                    </td>
                    <td className="border border-black px-2 text-right align-middle">{thousandSeparator(amount)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-2 py-1 text-right font-semibold">Total Amount (Taka)</td>
                    <td className="border border-black px-2 py-1 text-right font-semibold">{thousandSeparator(amount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3">
                <b>Taka in Word:</b> {numberToWords(amount)}
              </div>

              {/* Signatures */}
              <div className="mt-12 grid grid-cols-3 gap-6 text-xs">
                <div>
                  <div className="w-40 border-t border-black pt-1 text-center">Received By</div>
                </div>
                <div className="text-center">
                  <div className="mx-auto w-40 border-t border-black pt-1">Prepared by</div>
                  {voucher.prepared_by && <div className="mt-1">{voucher.prepared_by}</div>}
                  {voucher.created_at && <div>{fmtDateTime(voucher.created_at)}</div>}
                </div>
                <div className="text-center">
                  <div className="mx-auto w-40 border-t border-black pt-1">Approved By</div>
                  {voucher.approved_by && <div className="mt-1">{voucher.approved_by}</div>}
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-600">* This voucher is system generated.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerVoucherModal;
