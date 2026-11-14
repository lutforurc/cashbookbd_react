import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiX } from 'react-icons/fi';

import ItemPurchasePrint from '../vouchers/print_items/ItemPurchasePrint';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import httpService from '../../services/httpService';
import { API_ELECTRONICS_SALES_INVOICE_PRINT_URL } from '../../services/apiRoutes';

/**
 * A bill bought out of a purchase advance, opened from the ledger.
 *
 * ⚠️ THE BILL'S OWN PAPER, not a second drawing of it. It is fetched the way
 * every voucher's paper is (the invoice-print endpoint, by voucher id) and
 * drawn by ItemPurchasePrint -- the same sheet the voucher list prints -- so
 * what is read here and what is printed can never disagree.
 *
 * Read only. A bill is corrected by deleting it and entering it again.
 */
type Props = {
  mainTrxId: number;
  vrNo: string;
  onClose: () => void;
};

const PurchaseBillView = ({ mainTrxId, vrNo, onClose }: Props) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const paperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    httpService
      .post(API_ELECTRONICS_SALES_INVOICE_PRINT_URL, { mt: mainTrxId })
      .then((res: any) => {
        if (!alive) return;
        const body = res?.data;
        if (body?.success) setData(body?.data?.data ?? null);
        else setError(body?.message || 'Could not read the bill.');
      })
      .catch(() => alive && setError('Could not read the bill.'));

    return () => {
      alive = false;
    };
  }, [mainTrxId]);

  // Esc closes it, as every other window here does.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const print = useReactToPrint({ contentRef: paperRef, documentTitle: `Purchase ${vrNo}` });

  return (
    <div
      className="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Purchase ${vrNo}`}
    >
      <div
        className="my-6 w-full max-w-3xl rounded bg-[rgb(var(--c-surface))] shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-stroke px-4 py-2 dark:border-strokedark">
          <h3 className="text-base font-semibold text-black dark:text-white">Purchase {vrNo}</h3>
          <div className="flex items-center gap-2">
            <ButtonLoading
              onClick={() => print()}
              disabled={!data}
              label="Print"
              className="whitespace-nowrap text-center mr-0 py-2"
              icon={<FiPrinter className="text-lg" />}
            />
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-black dark:hover:text-white">
              <FiX size={20} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {error ? (
            <p className="py-6 text-center text-sm text-danger">{error}</p>
          ) : data ? (
            <ItemPurchasePrint ref={paperRef} data={data} />
          ) : (
            <p className="py-6 text-center text-sm text-gray-500">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseBillView;
