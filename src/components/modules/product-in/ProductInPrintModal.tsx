import React, { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiX } from 'react-icons/fi';
import { Button } from '../../../pages/UiElements/CustomButtons';
import ProductInSlipPrint from './ProductInSlipPrint';
import { getProductInDetails } from './productInSlice';

type Props = {
  id: number | string;
  onClose: () => void;
};

/**
 * The Stock In Slip in a dialog, opened from the receipt list.
 *
 * The paper itself is ProductInSlipPrint, because the Product In Out ledger
 * prints the same one when its voucher number is clicked -- see the note there.
 */
const ProductInPrintModal: React.FC<Props> = ({ id, onClose }) => {
  const dispatch = useDispatch<any>();
  const [master, setMaster] = useState<any>(null);
  const [details, setDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: master?.in_no ? `ProductIn-${master.in_no}` : 'ProductIn',
  });

  useEffect(() => {
    setLoading(true);
    setError('');
    dispatch(
      getProductInDetails(id, (response: any) => {
        if (response?.success) {
          setMaster(response.data?.master || null);
          setDetails(Array.isArray(response.data?.details) ? response.data.details : []);
        } else {
          setError(response?.message || 'Failed to load receipt');
        }
        setLoading(false);
      }),
    );
  }, [dispatch, id]);

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
            Product In
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
            /* The paper itself lives in ProductInSlipPrint -- the Product In Out
               ledger draws the same one when its voucher number is clicked. */
            <ProductInSlipPrint ref={printRef} data={{ master, details }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductInPrintModal;
