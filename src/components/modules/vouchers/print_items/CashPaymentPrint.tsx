import React from 'react';
import PadPrinting from '../../../utils/utils-functions/PadPrinting';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import dayjs from 'dayjs';

type Props = {
    data: any;
    fontSize?: number;
};

/* ================= NUMBER TO WORD ================= */
const numberToWords = (num: number): string => {
    if (!num || num === 0) return 'Zero Taka Only';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertBelowThousand = (n: number): string => {
        let str = '';

        if (n >= 100) {
            str += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }

        if (n >= 10 && n < 20) {
            str += teens[n - 10] + ' ';
        } else {
            if (n >= 20) {
                str += tens[Math.floor(n / 10)] + ' ';
                n %= 10;
            }
            if (n > 0) str += ones[n] + ' ';
        }

        return str.trim();
    };

    let result = '';
    let n = num;

    if (n >= 10000000) {
        result += convertBelowThousand(Math.floor(n / 10000000)) + ' Crore ';
        n %= 10000000;
    }
    if (n >= 100000) {
        result += convertBelowThousand(Math.floor(n / 100000)) + ' Lakh ';
        n %= 100000;
    }
    if (n >= 1000) {
        result += convertBelowThousand(Math.floor(n / 1000)) + ' Thousand ';
        n %= 1000;
    }
    if (n > 0) result += convertBelowThousand(n);

    return result.trim() + ' Taka Only';
};

/* ================= MAIN COMPONENT ================= */
const CashPaymentPrint = React.forwardRef<HTMLDivElement, Props>(
    ({ data, fontSize = 10 }, ref) => {
        const fs = fontSize;

        /* -------- Normalize acc_transaction_master -------- */
        const accMastersRaw = data?.acc_transaction_master;

        const accMasters = Array.isArray(accMastersRaw)
            ? accMastersRaw
            : accMastersRaw
            ? [accMastersRaw]
            : [];

        const trxMaster = accMasters[0];
        const trxDetails = trxMaster?.acc_transaction_details ?? [];

        if (!trxDetails.length) {
            return <div ref={ref}>No payment data found</div>;
        }

        /* -------- Debit / Credit -------- */
        const debitEntry = trxDetails.find((d: any) => Number(d.debit) > 0);
        const creditEntry = trxDetails.find((d: any) => Number(d.credit) > 0);

        if (!debitEntry) {
            return <div ref={ref}>Invalid voucher structure</div>;
        }

        const headOfAccount = debitEntry?.coa_l4?.name ?? '';
        const amount = Number(debitEntry?.debit ?? 0);
        const remarks = debitEntry?.remarks ?? '';
        const address = debitEntry?.coa_l4?.cust_party_infos?.address ?? '';
        const mobile = debitEntry?.coa_l4?.cust_party_infos?.mobile ?? '';

        return (
            <div ref={ref} className="print-root text-gray-900">
                <style>{`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 6mm 6mm 8mm 8mm;
                        }
                        .print-root {
                            padding: 0 !important;
                        }
                    }
                `}</style>

                {/* HEADER */}
                <PadPrinting />

                {/* TITLE */}
                <h1
                    className="text-center font-bold mt-3 mb-4 uppercase"
                    style={{ fontSize: fs + 6 }}
                >
                    Cash Debit (Payment) Voucher
                </h1>

                {/* TOP INFO */}
                <div className="flex justify-between text-xs mb-3">
                    <div><b>Voucher No:</b> {data?.vr_no}</div>
                    <div><b>Date:</b> {dayjs(data?.vr_date).format('DD/MM/YYYY')}</div>
                </div>

                {/* TABLE */}
                <table className="w-full border-collapse text-xs">
                    <thead>
                        <tr>
                            <th className="border border-black px-2 py-1 text-left">
                                <div className="ml-3">Head of Account</div>
                            </th>
                            <th className="border border-black px-2 py-1 text-right w-40">
                                <div className="mr-2">Amount (Taka)</div>
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr style={{ height: '100px' }}>
                            <td className="border border-black px-2 align-middle">
                                <div className="ml-3">
                                    {headOfAccount}
                                    {address && <><br /><span className="text-gray-700">{address}</span></>}
                                    {mobile && <><br /><span className="text-gray-700">{mobile}</span></>}
                                    {remarks && <><br /><span className="text-gray-700">{remarks}</span></>}
                                </div>
                            </td>

                            <td className="border border-black px-2 text-right align-middle">
                                <div className="mr-2">
                                    {thousandSeparator(amount, 0)}
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td className="border border-black px-2 py-1 text-right font-semibold">
                                <div className="mr-2">Total Amount (Taka)</div>
                            </td>
                            <td className="border border-black px-2 py-1 text-right font-semibold">
                                <div className="mr-2">
                                    {thousandSeparator(amount, 0)}
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* IN WORD */}
                <div className="mt-3 text-xs">
                    <b>Taka in Word:</b> {numberToWords(amount)}
                </div>

                {/* SIGNATURE */}
                <div className="mt-10 grid grid-cols-2 gap-6 text-xs">
                    <div>
                        <div className="border-t border-black pt-1 w-40">Received By</div>
                    </div>
                    <div className="text-right">
                        <div className="border-t border-black pt-1 w-40 ml-auto">Approved By</div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="mt-4 text-xs text-gray-600">
                    * This voucher is system generated.
                </div>
            </div>
        );
    }
);

CashPaymentPrint.displayName = 'CashPaymentPrint';
export default CashPaymentPrint;
