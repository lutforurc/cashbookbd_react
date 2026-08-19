import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCheckSquare, FiHome, FiPrinter, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import routes from '../../../services/appRoutes';
import { API_REPORT_STOCK_IMEI_DATA_URL } from '../../../services/apiRoutes';

type ProductOption = {
  value: string;
  label: string;
};

const extractImeis = (payload: any): string[] => {
  const source = payload?.data?.data ?? payload?.data ?? payload;

  if (Array.isArray(source)) {
    return source.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  if (source && typeof source === 'object') {
    return Object.values(source).map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  return [];
};

const ImeiStock = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const initialBranchId = searchParams.get('branch_id') || '';
  const initialItemId = searchParams.get('item_id') || '';

  const [branchId, setBranchId] = useState(initialBranchId);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(
    initialItemId ? { value: initialItemId, label: `Product #${initialItemId}` } : null,
  );
  const [imeis, setImeis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  const branchOptions = useMemo(() => branchDdlData?.protectedData?.data || [], [branchDdlData]);
  const selectedProductId = selectedProduct?.value || '';

  const handleLoad = async () => {
    if (!selectedProductId) {
      toast.info('Please select product.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.get(API_REPORT_STOCK_IMEI_DATA_URL, {
        params: {
          branch_id: branchId,
          item_id: selectedProductId,
        },
      });

      setImeis(extractImeis(data));
    } catch (error: any) {
      setImeis([]);
      toast.error(error?.response?.data?.message || 'IMEI stock data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBranchId('');
    setSelectedProduct(null);
    setImeis([]);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'IMEI Stock',
  });

  const labelClass = 'mb-1 block text-xs font-bold text-slate-950 dark:text-white';
  const controlClass =
    'h-10 w-full rounded-none border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-primary dark:border-[rgb(var(--c-gray-600))] dark:bg-[rgb(var(--c-boxdark))] dark:text-white dark:focus:border-slate-300';

  return (
    <div className="min-h-screen bg-slate-100 px-2 py-3 text-slate-900 dark:bg-[rgb(var(--c-gray-900))] dark:text-white">
      <HelmetTitle title="IMEI Stock" />

      <div className="bg-white px-5 py-4 shadow-sm dark:bg-[rgb(var(--c-boxdark))]">


        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div>
            <label className={labelClass}>Select Branch</label>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className={controlClass}
            >
              <option value="">All Branch</option>
              {branchOptions.map((branch: any) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <label className={labelClass}>Select Product</label>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="mb-1 text-slate-700 transition hover:text-primary dark:text-slate-200"
                title="Clear product"
              >
                
              </button>
            </div>
            <ProductDropdown
              value={selectedProduct}
              onSelect={(selected) => setSelectedProduct(selected ? { value: String(selected.value), label: selected.label } : null)}
              className="h-10"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <ButtonLoading
              onClick={handleLoad}
              buttonLoading={loading}
              label="Go"
              icon={<FiCheckSquare />}
              className="h-10 px-5 uppercase"
            />
            <ButtonLoading
              onClick={handlePrint}
              buttonLoading={false}
              label="Print"
              icon={<FiPrinter />}
              className="h-10 px-5 uppercase"
              disabled={imeis.length === 0}
            />
            <ButtonLoading
              onClick={() => navigate(routes.dashboard)}
              buttonLoading={false}
              label="Home"
              icon={<FiHome />}
              className="h-10 px-5 uppercase"
            />
          </div>
        </div>
      </div>

      <div ref={printRef} className="mt-4 bg-white px-5 py-5 text-center shadow-sm dark:bg-[rgb(var(--c-boxdark))]">
       

        {loading ? (
          <div className="py-8">
            <Loader />
          </div>
        ) : imeis.length > 0 ? (
          <ol className="inline-flex flex-col items-start gap-2 text-left">
            {imeis.map((imei, index) => (
              <li key={`${imei}-${index}`} className="text-base text-slate-800 dark:text-slate-100">
                <span className="mr-2">{index + 1}.</span>
                <span className="text-lg font-medium text-green-600 dark:text-green-400">{imei}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="py-5 text-sm text-slate-500 dark:text-slate-300">
            No IMEI stock data found.
          </p>
        )}
      </div>
    </div>
  );
};

export default ImeiStock;
