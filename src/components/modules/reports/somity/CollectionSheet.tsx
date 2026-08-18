import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useReactToPrint } from 'react-to-print';
import { FiCheckSquare, FiPrinter, FiRefreshCcw } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Select, { StylesConfig } from 'react-select';

import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import useLocalStorage from '../../../../hooks/useLocalStorage';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import httpService from '../../../services/httpService';
import { API_DDL_AREA_LIST_URL, API_SOMITY_COLLECTION_SHEET_URL } from '../../../services/apiRoutes';
import CollectionSheetPrint, { CollectionSheetRow } from './CollectionSheetPrint';

const statusOptions = [
  { id: '1', name: 'Opening' },
  { id: '2', name: 'Closing' },
];

type SomityOption = {
  value: string;
  label: string;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasBanglaText = (value?: string | null) => /[\u0980-\u09FF]/.test(String(value || ''));

const withCode = (value?: string | null, code?: string | number | null) => {
  const text = String(value || '').trim();
  const idCode = String(code || '').trim();
  if (!text) return '';
  return idCode ? `${text} (${idCode})` : text;
};

const guardianNameOf = (row: CollectionSheetRow) => {
  const banglaGuardian = String(row.father_bangla || '').trim();
  return banglaGuardian || (row as any).father_name || (row as any).father || '';
};

const banglaValueOf = (value?: string | null) => String(value || '').trim();

const banglaTextClass = (value?: string | null) =>
  hasBanglaText(value) ? 'text-base font-semibold text-slate-950 dark:text-white' : 'sutonny-text text-[20px] leading-6 text-slate-950 dark:text-white';

const formatMonthForRequest = (value: string) => {
  if (!value) return '';
  const [year, month] = value.split('-');
  return month && year ? `${month}/${year}` : value;
};

const getCurrentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentDate = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getSomityListFromResponse = (response: any) => {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const CollectionSheet = (user: any) => {
  const dispatch = useDispatch();
  const printRef = useRef<HTMLDivElement>(null);

  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const areaState = useSelector((state: any) => state.area);

  const [branchId, setBranchId] = useState<string>('');
  const [somityId, setSomityId] = useState<string>('');
  const [localSomityList, setLocalSomityList] = useState<any[]>([]);
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [endDate, setEndDate] = useState<Date | null>(getCurrentDate());
  const [typeId, setTypeId] = useState('1');
  const [rows, setRows] = useState<CollectionSheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(16);
  // What is actually in the two print boxes while they are being typed in. The
  // numbers beside them fall back to a default the moment they read 0, so
  // without this the last digit cannot be deleted -- it is replaced by the
  // default instead. See PrintNumberInput, which does the same for the boxes
  // built on InputElement.
  const [draft, setDraft] = useState<{ rows?: string; font?: string }>({});
  const [fontSize, setFontSize] = useState(11);
  const themeMode = useLocalStorage('color-theme', 'light');
  const darkMode = themeMode[0] === 'dark';

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    const defaultBranch = user?.user?.branch_id ? String(user.user.branch_id) : '';
    setBranchId(defaultBranch);
  }, [dispatch, user?.user?.branch_id]);

  useEffect(() => {
    let isMounted = true;

    const loadSomityList = async () => {
      try {
        const { data } = await httpService.post(API_DDL_AREA_LIST_URL, { searchName: '' });
        if (isMounted) {
          setLocalSomityList(getSomityListFromResponse(data));
        }
      } catch (error) {
        if (isMounted) {
          setLocalSomityList([]);
        }
      }
    };

    loadSomityList();

    return () => {
      isMounted = false;
    };
  }, []);

  const branchOptions = branchDdlData?.protectedData?.data || [];
  const rawSomityOptions = localSomityList.length > 0 ? localSomityList : Array.isArray(areaState?.area) ? areaState.area : [];
  const somityOptions = useMemo(
    () =>
      rawSomityOptions.map((item: any) => {
        const id = item?.id ?? item?.somity_id ?? item?.area_id ?? item?.value ?? '';
        const name =
          item?.name ??
          item?.somity_name ??
          item?.area_name ??
          item?.bangla ??
          item?.label ??
          item?.idfr_code ??
          id;

        return {
          ...item,
          id,
          name: item?.idfr_code && name !== item.idfr_code ? `${name} (${item.idfr_code})` : String(name || ''),
        };
      }),
    [rawSomityOptions],
  );
  const somitySearchOptions = useMemo<SomityOption[]>(
    () =>
      somityOptions.map((item: any) => ({
        value: String(item.id),
        label: String(item.name || ''),
      })),
    [somityOptions],
  );

  const selectedSomityOption = useMemo(
    () => somitySearchOptions.find((item) => item.value === String(somityId)) ?? null,
    [somitySearchOptions, somityId],
  );

  useEffect(() => {
    if (!somityId && somityOptions.length > 0) {
      setSomityId(String(somityOptions[0].id));
    }
  }, [somityOptions, somityId]);

  const branchName = useMemo(
    () => branchOptions.find((item: any) => String(item.id) === String(branchId))?.name,
    [branchOptions, branchId],
  );

  const somityName = useMemo(
    () => somityOptions.find((item: any) => String(item.id) === String(somityId))?.name,
    [somityOptions, somityId],
  );

  const statusLabel = typeId === '1' ? 'Opening' : 'Closing';

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          const balance =
            toNumber(row.sales) -
            toNumber(row.down_payment) -
            toNumber(row.previous_collection) -
            toNumber(row.this_month_collection);
          acc.sales += toNumber(row.sales);
          acc.downPayment += toNumber(row.down_payment);
          acc.previous += toNumber(row.previous_collection);
          acc.thisMonth += toNumber(row.this_month_collection);
          acc.balance += balance;
          return acc;
        },
        { sales: 0, downPayment: 0, previous: 0, thisMonth: 0, balance: 0 },
      ),
    [rows],
  );

  const handleLoad = async () => {
    if (!branchId || !somityId || !monthYear || !typeId) {
      toast.info('Please select branch, somity, month and status.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await httpService.post(API_SOMITY_COLLECTION_SHEET_URL, {
        branch_id: branchId,
        somity_id: somityId,
        month_year: formatMonthForRequest(monthYear),
        type_id: typeId,
      });

      setRows(Array.isArray(data) ? data : data?.data || []);
    } catch (error: any) {
      setRows([]);
      toast.error(error?.response?.data?.message || 'Collection sheet data load failed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Collection Sheet',
    removeAfterPrint: true,
  });

  const handleEndDate = (date: Date | null) => {
    setEndDate(date);
    if (date) {
      setMonthYear(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleReset = () => {
    setBranchId(user?.user?.branch_id ? String(user.user.branch_id) : '');
    setSomityId(somityOptions[0]?.id ? String(somityOptions[0].id) : '');
    setMonthYear(getCurrentMonth());
    setEndDate(getCurrentDate());
    setTypeId('1');
    setRows([]);
  };

  const labelClass = 'mb-1 block text-sm font-semibold text-slate-900 dark:text-white';
  const controlClass = 'h-10 w-full rounded-none !border !border-slate-300 !bg-white px-3 text-sm font-semibold !text-slate-900 outline-none focus:!border-slate-500 dark:!border-[rgb(var(--c-form-strokedark))] dark:!bg-[rgb(var(--c-form-input))] dark:!text-white dark:focus:!border-[rgb(var(--c-gray-600))]';
  const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-none bg-slate-800 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[rgb(var(--c-form-strokedark))] dark:hover:bg-[rgb(var(--c-gray-600))]';
  const somitySelectStyles: StylesConfig<SomityOption, false> = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '2.5rem',
      height: '2.5rem',
      borderRadius: 0,
      borderColor: state.isFocused ? 'rgb(var(--c-gray-600))' : darkMode ? 'rgb(var(--c-form-strokedark))' : 'rgb(var(--c-slate-300))',
      backgroundColor: darkMode ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-white))',
      boxShadow: 'none',
      fontSize: '0.875rem',
      fontWeight: 600,
      '&:hover': {
        borderColor: state.isFocused ? 'rgb(var(--c-gray-600))' : darkMode ? 'rgb(var(--c-form-strokedark))' : 'rgb(var(--c-slate-300))',
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: '2.5rem',
      padding: '0 0.75rem',
    }),
    input: (provided) => ({
      ...provided,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-slate-900))',
      margin: 0,
      padding: 0,
    }),
    placeholder: (provided) => ({
      ...provided,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-slate-900))',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-slate-900))',
    }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: '2.5rem',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: darkMode ? 'rgb(var(--c-gray-400))' : 'rgb(var(--c-slate-400))',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: darkMode ? 'rgb(var(--c-slate-300))' : 'rgb(var(--c-slate-600))',
      '&:hover': {
        color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-slate-900))',
      },
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 1000,
      borderRadius: 2,
      backgroundColor: darkMode ? 'rgb(var(--c-form-strokedark))' : 'rgb(var(--c-white))',
    }),
    menuPortal: (provided) => ({
      ...provided,
      zIndex: 9999,
    }),
    option: (provided, { isFocused, isSelected }) => ({
      ...provided,
      backgroundColor: isSelected
        ? darkMode
          ? 'rgb(var(--c-gray-600))'
          : 'rgb(var(--c-slate-300))'
        : isFocused
          ? darkMode
            ? 'rgb(var(--c-gray-600))'
            : 'rgb(var(--c-stroke))'
          : darkMode
            ? 'rgb(var(--c-form-strokedark))'
            : 'rgb(var(--c-white))',
      color: darkMode ? 'rgb(var(--c-white))' : 'rgb(var(--c-slate-900))',
      fontSize: '0.875rem',
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: darkMode ? 'rgb(var(--c-gray-300))' : 'rgb(var(--c-body))',
    }),
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 text-slate-900 dark:bg-[rgb(var(--c-gray-900))] dark:text-white">
      <HelmetTitle title="Collection Sheet" />

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="grid min-w-[320px] flex-1 grid-cols-1 items-end gap-3 md:grid-cols-3 md:max-xl:w-full md:max-xl:min-w-0 md:max-xl:flex-none xl:grid-cols-4 xl:max-[1880px]:w-full xl:max-[1880px]:min-w-0 xl:max-[1880px]:flex-none min-[1881px]:grid-cols-[minmax(150px,1.05fr)_minmax(180px,1.25fr)_minmax(120px,0.7fr)_minmax(110px,0.65fr)]">
          <div>
            <label className={labelClass}>Select Branch</label>
            {branchDdlData?.isLoading && <Loader />}
            <BranchDropdown
              onChange={(event: any) => setBranchId(event.target.value)}
              value={branchId}
              className={controlClass}
              branchDdl={branchOptions}
            />
          </div>

          <div>
            <label className={labelClass}>Select Somity</label>
            <Select<SomityOption>
              inputId="somity_id"
              name="somity_id"
              className="cash-react-select-container w-full"
              classNamePrefix="cash-react-select"
              isSearchable
              options={somitySearchOptions}
              value={selectedSomityOption}
              onChange={(selected) => setSomityId(selected?.value ?? '')}
              placeholder="Select Somity"
              noOptionsMessage={() => 'No options'}
              styles={somitySelectStyles}
              menuPortalTarget={document.body}
            />
          </div>

          <div>
            <label className={labelClass}>Month</label>
            <InputDatePicker
              setCurrentDate={handleEndDate}
              className="font-medium text-sm w-full h-10"
              selectedDate={endDate}
              setSelectedDate={setEndDate}
              month
            />
          </div>

          <div>
            <label className={labelClass}>Status</label>
            <DropdownCommon
              id="type_id"
              name="type_id"
              value={typeId}
              onChange={(event) => setTypeId(event.target.value)}
              className={controlClass}
              data={statusOptions}
            />
          </div>

          <div className="grid min-w-max grid-cols-[auto_auto_64px_64px_auto] items-end gap-2 overflow-x-auto md:col-span-2 xl:col-span-3 xl:ml-auto min-[1881px]:col-span-1">
            <button type="button" onClick={handleLoad} className={buttonClass}>
              <FiCheckSquare size={15} />
              Apply
            </button>
            <button type="button" onClick={handleReset} className={buttonClass}>
              <FiRefreshCcw size={15} />
              Reset
            </button>

            <label className="block">
              <span className={labelClass}>Rows</span>
              <input
                type="number"
                min={1}
                value={draft.rows ?? rowsPerPage}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, rows: event.target.value }));
                  setRowsPerPage(Number(event.target.value) || 16);
                }}
                onBlur={() =>
                  setDraft((current) => ({
                    ...current,
                    // Emptiness is kept, so a cleared box stays cleared.
                    rows: current.rows?.trim() === '' ? current.rows : undefined,
                  }))
                }
                title="Rows per page for print"
                className={`${controlClass} text-center`}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Font</span>
              <input
                type="number"
                min={8}
                value={draft.font ?? fontSize}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, font: event.target.value }));
                  setFontSize(Number(event.target.value) || 11);
                }}
                onBlur={() =>
                  setDraft((current) => ({
                    ...current,
                    font: current.font?.trim() === '' ? current.font : undefined,
                  }))
                }
                title="Font Size for print"
                className={`${controlClass} text-center`}
              />
            </label>

            <button type="button" onClick={handlePrint} disabled={rows.length === 0} className={buttonClass}>
              <FiPrinter size={15} />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        {loading ? <Loader /> : null}
        <table className="w-full min-w-[980px] table-fixed border-collapse bg-white text-sm text-slate-900 dark:bg-[rgb(var(--c-boxdark))] dark:text-[rgb(var(--c-bodydark1))]">
          <thead>
            <tr className="bg-slate-300 text-xs font-bold uppercase text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-white">
              <th className="w-20 px-3 py-4 text-center">SL. NO</th>
              <th className="px-3 py-4 text-left">MEMBER DETAILS</th>
              <th className="w-36 px-3 py-4 text-right">TOTAL SALES</th>
              <th className="w-40 px-3 py-4 text-right">DOWN PAYMENT</th>
              <th className="w-36 px-3 py-4 text-right">PRV. COLL.</th>
              <th className="w-36 px-3 py-4 text-right">INSTALLMENT</th>
              <th className="w-36 px-3 py-4 text-right">THIS MONTH</th>
              <th className="w-36 px-3 py-4 text-right">BALANCE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[rgb(var(--c-strokedark))]">
            {rows.length > 0 ? (
              rows.map((row, index) => {
                const balance =
                  toNumber(row.sales) -
                  toNumber(row.down_payment) -
                  toNumber(row.previous_collection) -
                  toNumber(row.this_month_collection);
                const banglaName = banglaValueOf(row.bangla);
                const guardianName = guardianNameOf(row);

                return (
                  <tr key={`${row.idfr_code ?? index}-${index}`} className={balance === 0 ? 'bg-slate-50 font-semibold dark:bg-[rgb(var(--c-strokedark))]' : 'bg-white dark:bg-[rgb(var(--c-boxdark))]'}>
                    <td className="px-3 py-4 text-center align-middle">{index + 1}</td>
                    <td className="px-3 py-4">
                      {banglaName ? <div className={banglaTextClass(banglaName)}>{withCode(banglaName, row.idfr_code)}</div> : null}
                      <div className="text-slate-950 dark:text-white">{withCode(row.name || '-', row.idfr_code)}</div>
                      {guardianName ? (
                        <div className="text-slate-600 dark:text-[rgb(var(--c-gray-300))]">
                          পি:/স্বা: <span className={hasBanglaText(guardianName) ? '' : 'sutonny-text text-[20px] leading-6'}>{guardianName}</span>
                        </div>
                      ) : null}
                      {row.mobile ? <div>{row.mobile}</div> : null}
                    </td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.sales))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.down_payment))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.previous_collection))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.installment))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(toNumber(row.this_month_collection))}</td>
                    <td className="px-3 py-4 text-right align-middle">{thousandSeparator(balance)}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500 dark:text-[rgb(var(--c-gray-300))]">
                  No data found
                </td>
              </tr>
            )}
            {rows.length > 0 ? (
              <tr className="bg-slate-300 font-bold text-slate-950 dark:bg-[rgb(var(--c-form-strokedark))] dark:text-white">
                <td colSpan={2} className="px-3 py-3 text-right">Grand Total</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.sales)}</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.downPayment)}</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.previous)}</td>
                <td className="px-3 py-3 text-right"></td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.thisMonth)}</td>
                <td className="px-3 py-3 text-right">{thousandSeparator(totals.balance)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="hidden">
        <CollectionSheetPrint
          ref={printRef}
          rows={rows}
          branchName={branchName}
          somityName={somityName}
          monthYear={formatMonthForRequest(monthYear)}
          statusLabel={statusLabel}
          rowsPerPage={rowsPerPage}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
};

export default CollectionSheet;
