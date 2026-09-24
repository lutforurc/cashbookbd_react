import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiBarChart2, FiSearch } from 'react-icons/fi';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import WarehouseDropdown from '../../utils/utils-functions/WarehouseDropdown';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import { getProductOutReasons, getProductOutReport } from './productOutSlice';

/**
 * The register: what was written off, why, and what it cost.
 *
 * ⚠️ APPROVED SLIPS ONLY, and that is the server's choice rather than a filter
 * here. Only an approved one has moved stock, so only an approved one has a
 * FIFO cost; printing a pending breakage as ৳0 would read as "this was free".
 * The pending count is what the list screen is for.
 */
const ProductOutReport = () => {
  const dispatch = useDispatch<any>();
  const productOut = useSelector((s: any) => s.productOut);
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];
  const reasons: any[] = Array.isArray(productOut?.reasons) ? productOut.reasons : [];
  const report = productOut?.report || null;

  const [fromDate, setFromDate] = useState<Date | null>(dayjs().startOf('month').toDate());
  const [toDate, setToDate] = useState<Date | null>(dayjs().toDate());
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [warehouseId, setWarehouseId] = useState('');
  const [reasonId, setReasonId] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(getDdlWarehouse());
    dispatch(getProductOutReasons());
  }, [dispatch]);

  const load = () => {
    if (!from || !to) {
      toast.error('Pick both dates');
      return;
    }

    setLoading(true);
    dispatch(
      getProductOutReport(
        {
          from_date: from,
          to_date: to,
          from_warehouse_id: warehouseId || undefined,
          reason_id: reasonId || undefined,
          product_id: product?.value || undefined,
        },
        (response: any) => {
          if (!response?.success) toast.error(response?.message || 'Failed to load the register');
          setLoading(false);
        },
      ),
    );
  };

  const rows = Array.isArray(report?.rows) ? report.rows : [];
  const byReason = Array.isArray(report?.by_reason) ? report.by_reason : [];
  const byProduct = Array.isArray(report?.by_product) ? report.by_product : [];

  const rowColumns = [
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'out_date',
      header: 'Date',
      headerClass: 'w-28',
      cellClass: 'w-28',
      render: (row: any) => <span>{row?.out_date || '-'}</span>,
    },
    {
      key: 'out_no',
      header: 'Out No',
      headerClass: 'w-40',
      cellClass: 'w-40',
      render: (row: any) => <span>{row?.out_no || '-'}</span>,
    },
    {
      key: 'product_name',
      header: 'Product',
      render: (row: any) => <span>{row?.product_name || '-'}</span>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => (
        <span>
          {thousandSeparator(Number(row?.quantity || 0))} {row?.unit_name || ''}
        </span>
      ),
    },
    {
      key: 'rate',
      header: 'Rate',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => <span>{thousandSeparator(Number(row?.rate || 0))}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      headerClass: 'text-right w-32',
      cellClass: 'text-right w-32',
      render: (row: any) => <span>{thousandSeparator(Number(row?.cost || 0))}</span>,
    },
    {
      key: 'reason_name',
      header: 'Reason',
      render: (row: any) => <span>{row?.reason_name || '-'}</span>,
    },
    {
      key: 'warehouse_name',
      header: 'Warehouse',
      render: (row: any) => <span>{row?.warehouse_name || '-'}</span>,
    },
    {
      key: 'note',
      header: 'Note',
      render: (row: any) => <span>{row?.note || '-'}</span>,
    },
  ];

  const reasonColumns = [
    {
      key: 'reason_name',
      header: 'Reason',
      render: (row: any) => <span>{row?.reason_name || '(no reason)'}</span>,
    },
    {
      key: 'voucher_count',
      header: 'Slips',
      headerClass: 'text-right w-24',
      cellClass: 'text-right w-24',
      render: (row: any) => <span>{Number(row?.voucher_count || 0)}</span>,
    },
    {
      key: 'cost',
      header: 'Cost',
      headerClass: 'text-right w-32',
      cellClass: 'text-right w-32',
      render: (row: any) => <span>{thousandSeparator(Number(row?.cost || 0))}</span>,
    },
  ];

  const productColumns = [
    {
      key: 'product_name',
      header: 'Product',
      render: (row: any) => <span>{row?.product_name || '-'}</span>,
    },
    {
      key: 'quantity',
      header: 'Qty',
      headerClass: 'text-right w-28',
      cellClass: 'text-right w-28',
      render: (row: any) => (
        <span>
          {thousandSeparator(Number(row?.quantity || 0))} {row?.unit_name || ''}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      headerClass: 'text-right w-32',
      cellClass: 'text-right w-32',
      render: (row: any) => <span>{thousandSeparator(Number(row?.cost || 0))}</span>,
    },
  ];

  return (
    <div>
      <HelmetTitle title="Product Out Register" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end mb-3">
        <InputDatePicker
          id="fromDate"
          name="fromDate"
          label="From"
          selectedDate={fromDate}
          setSelectedDate={setFromDate}
          setCurrentDate={(date: Date | null) => {
            setFromDate(date);
            setFrom(date ? dayjs(date).format('YYYY-MM-DD') : '');
          }}
          className="w-full "
        />
        <InputDatePicker
          id="toDate"
          name="toDate"
          label="To"
          selectedDate={toDate}
          setSelectedDate={setToDate}
          setCurrentDate={(date: Date | null) => {
            setToDate(date);
            setTo(date ? dayjs(date).format('YYYY-MM-DD') : '');
          }}
          className="w-full "
        />
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            Warehouse
          </label>
          <WarehouseDropdown
            id="reportWarehouse"
            name="reportWarehouse"
            className="p-2"
            warehouseDdl={warehouseOptions}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setWarehouseId(e.target.value)}
            defaultValue={warehouseId}
            emptyLabel="Every warehouse"
          />
        </div>
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Reason</label>
          <select
            value={reasonId}
            onChange={(e) => setReasonId(e.target.value)}
            className="block w-full rounded border border-[rgb(var(--c-border))] bg-white p-2 text-sm dark:bg-[rgb(var(--c-boxdark))] dark:text-[rgb(var(--c-text))]"
          >
            <option value="">Every reason</option>
            {reasons.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Product</label>
          <RequisitionItemsDropdown
            id="reportProduct"
            name="reportProduct"
            onSelect={(option: any) => setProduct(option)}
            defaultValue={product}
            value={product}
          />
        </div>
        <ButtonLoading
          onClick={load}
          buttonLoading={loading}
          label="Show"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSearch className="text-lg ml-2 mr-2" />}
        />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg border border-[rgb(var(--c-border))] px-3 py-2 text-sm text-[rgb(var(--c-text))]">
        <FiBarChart2 />
        <span>
          Written off in this period:{' '}
          <b>{thousandSeparator(Number(report?.total_cost || 0))}</b> — already inside the closing
          stock, so the profit is short by this much and no more.
        </span>
      </div>

      <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] mb-2">
        The slips
      </h3>
      <Table columns={rowColumns} data={rows} className="mb-6" noDataMessage="Nothing written off in this period" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] mb-2">
            Why it went
          </h3>
          <Table columns={reasonColumns} data={byReason} noDataMessage="Nothing written off" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] mb-2">
            Which goods
          </h3>
          <Table columns={productColumns} data={byProduct} noDataMessage="Nothing written off" />
        </div>
      </div>
    </div>
  );
};

export default ProductOutReport;
