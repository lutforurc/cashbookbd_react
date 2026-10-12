import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useReactToPrint } from 'react-to-print';
import { FiPrinter, FiSearch, FiXCircle } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import Loader from '../../../common/Loader';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { hasPermission } from '../../utils/permissionChecker';
import httpService from '../../services/httpService';
import { API_DELIVERY_PRINT_DATA_URL } from '../../services/apiRoutes';

import {
  deliveryCancel,
  deliveryList,
  deliveryLoadPending,
  deliveryStore,
} from './deliverySlice';
import DeliveryPrint from './DeliveryPrint';

/** 'YYYY-MM-DD' <-> Date, the same translation the sales screen makes. */
const asDate = (value: string) => (value ? new Date(value) : null);
const asText = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`
    : '';

const newIdempotencyKey = () =>
  typeof window !== 'undefined' && window.crypto && 'randomUUID' in window.crypto
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * A product as "code - name", the way the rest of the app reads one -- the code
 * first, so the same product is found the same way on every screen, the
 * invoices included.
 *
 * ⚠️ THE CODE IS SHOWN ONLY WHEN THERE IS ONE. A product that carries no code
 * prints its name alone rather than a dangling separator in front of it.
 */
const productLabel = (line: any) => {
  const code = String(line?.product_code ?? line?.product?.code ?? line?.code ?? '').trim();
  const name = line?.product_name || line?.product?.name || '';
  return [code, name].filter(Boolean).join(' - ') || String(line?.product_id ?? '') || '-';
};

const emptyHeader = {
  delivery_date: asText(new Date()),
  challan_no: '',
  vehicle_no: '',
  driver_name: '',
  driver_mobile: '',
  receiver_name: '',
  receiver_mobile: '',
  notes: '',
};

/**
 * Delivery: the Tiles and Sanitary voucher that takes the stock out when the
 * shop sends the goods, rather than when it bills.
 *
 * Top half -- load an invoice by its number, see what is still pending, enter
 * the quantities going out on this trip, save.
 * Bottom half -- the deliveries already made, each printable and cancellable.
 */
const Delivery = () => {
  const dispatch = useDispatch();
  const deliveries = useSelector((s: any) => s.deliveries);
  const settings = useSelector((s: any) => s.settings);
  const permissions = settings?.data?.permissions ?? [];

  // The invoice the dashboard sent the dispatcher here for, off the address.
  const [searchParams] = useSearchParams();
  const invoiceParam = searchParams.get('invoice_no') || '';

  const [searchInvoice, setSearchInvoice] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [lines, setLines] = useState<any[]>([]);
  const [returned, setReturned] = useState(0);
  // 0 = the invoice expects a delivery; 1 = it took its own stock, so there is
  // nothing to deliver (the form is hidden and said so, rather than failing on
  // save). null until an invoice is loaded.
  const [deductsOnInvoice, setDeductsOnInvoice] = useState<number | null>(null);
  const [header, setHeader] = useState<any>({ ...emptyHeader });
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState<any[]>([]);
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const canCreate = hasPermission(permissions, 'delivery.create');
  const canCancel = hasPermission(permissions, 'delivery.cancel');

  const totalPending = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
    [lines],
  );

  const loadList = () =>
    dispatch(
      deliveryList({}, (message: string, rows: any) => {
        if (message) toast.error(message);
        else setList(Array.isArray(rows) ? rows : []);
      }),
    );

  useEffect(() => {
    loadList();
  }, []);

  const loadInvoice = (invoiceNo: string) => {
    dispatch(
      deliveryLoadPending({ invoice_no: invoiceNo }, (message: string, data: any) => {
        if (message) {
          toast.error(message);
          setLines([]);
          return;
        }

        setInvoiceId(data?.mtmId || '');
        setReturned(Number(data?.returned) || 0);
        setDeductsOnInvoice(Number(data?.deducts_on_invoice));
        setLines(
          (data?.lines || []).map((line: any) => ({
            ...line,
            qty: Number(line.pending) > 0 ? Number(line.pending) : 0,
          })),
        );
        setIdempotencyKey(newIdempotencyKey());
        toast.success('Invoice loaded');
      }),
    );
  };

  const handleLoadInvoice = () => {
    const invoiceNo = searchInvoice.trim();
    if (!invoiceNo) {
      toast.info('Enter an invoice number');
      return;
    }

    loadInvoice(invoiceNo);
  };

  // Opened from the Delivery dashboard with an invoice on the query string:
  // load it, so the pending lines are already on the screen when the dispatcher
  // arrives. A ref keeps it to once per invoice rather than on every render.
  const autoLoadedInvoice = useRef('');
  useEffect(() => {
    const invoiceNo = invoiceParam.trim();
    if (!invoiceNo || autoLoadedInvoice.current === invoiceNo) return;
    autoLoadedInvoice.current = invoiceNo;
    setSearchInvoice(invoiceNo);
    loadInvoice(invoiceNo);
  }, [invoiceParam]);

  const handleQtyChange = (salesLineUid: string, value: string) => {
    setLines((prev) =>
      prev.map((line) =>
        line.sales_line_uid === salesLineUid ? { ...line, qty: value } : line,
      ),
    );
  };

  const handleSave = () => {
    if (!invoiceId) {
      toast.info('Load an invoice first');
      return;
    }

    const payloadLines = lines
      .filter((line) => Number(line.qty) > 0)
      .map((line) => ({
        sales_line_uid: line.sales_line_uid,
        quantity: Number(line.qty),
      }));

    if (payloadLines.length === 0) {
      toast.info('Enter a quantity to deliver');
      return;
    }

    setSaving(true);
    dispatch(
      deliveryStore(
        {
          mtmId: invoiceId,
          idempotency_key: idempotencyKey,
          ...header,
          lines: payloadLines,
        },
        (message: string) => {
          setSaving(false);
          if (message) {
            toast.error(message);
            return;
          }
          toast.success('Delivery saved');
          setSearchInvoice('');
          setInvoiceId('');
          setLines([]);
          setReturned(0);
          setDeductsOnInvoice(null);
          setHeader({ ...emptyHeader });
          setIdempotencyKey('');
          loadList();
        },
      ),
    );
  };

  const handleCancel = (row: any) => {
    if (!window.confirm('Cancel this delivery? The stock will go back to the godown.')) return;

    dispatch(
      deliveryCancel({ id: row.id_hashed }, (message: string) => {
        if (message) toast.error(message);
        else {
          toast.success('Delivery cancelled');
          loadList();
        }
      }),
    );
  };

  const printDelivery = (row: any) => {
    httpService
      .post(API_DELIVERY_PRINT_DATA_URL, { id: row.id_hashed })
      .then((response) => {
        const data = response?.data?.data?.data;
        if (data) setPrintData(data);
        else toast.error('Print data not found');
      })
      .catch(() => toast.error('Could not load the slip'));
  };

  const print = useReactToPrint({ contentRef: printRef });

  useEffect(() => {
    if (!printData) return;
    const timer = window.setTimeout(() => print(), 60);
    return () => window.clearTimeout(timer);
  }, [printData]);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Delivery" screen="delivery" />
      </div>

      {canCreate && (
        <div className="mb-4 rounded border border-[rgb(var(--c-border))] p-3">
          <div className="mb-2 flex flex-wrap items-end gap-2">
            <div className="w-64">
              <InputElement
                id="invoiceNo"
                name="invoiceNo"
                label="Invoice No."
                placeholder="Search invoice number"
                value={searchInvoice}
                className="py-1 w-full"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchInvoice(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') handleLoadInvoice();
                }}
              />
            </div>
            <ButtonLoading
              onClick={handleLoadInvoice}
              buttonLoading={deliveries.isLoading}
              label="Load"
              responsiveLabel="xl"
              className="whitespace-nowrap"
              icon={<FiSearch className="text-lg ml-2 mr-2" />}
            />
          </div>

          {lines.length > 0 && deductsOnInvoice === 1 && (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20">
              This invoice already took its stock on the invoice date, so there is
              nothing to deliver. Write the invoice with{' '}
              <strong>Deduct stock on delivery</strong> turned on to send it by
              delivery instead.
            </div>
          )}

          {lines.length > 0 && deductsOnInvoice !== 1 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-[rgb(var(--c-table-head))]">
                    <tr>
                      <th className="px-2 py-2 text-center">Sl.</th>
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2 text-right">Ordered</th>
                      <th className="px-2 py-2 text-right">Delivered</th>
                      <th className="px-2 py-2 text-right">Pending</th>
                      <th className="px-2 py-2 text-right w-32">Deliver Now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr
                        key={line.sales_line_uid}
                        className="border-b bg-[rgb(var(--c-table-body))]"
                      >
                        <td className="px-2 py-2 text-center">{index + 1}</td>
                        <td className="px-2 py-2">
                          {productLabel(line)}
                        </td>
                        <td className="px-2 py-2 text-right">{line.ordered}</td>
                        <td className="px-2 py-2 text-right">{line.delivered}</td>
                        <td className="px-2 py-2 text-right">{line.pending}</td>
                        <td className="px-2 py-2 text-right">
                          <InputElement
                            id={`qty-${line.sales_line_uid}`}
                            name={`qty-${line.sales_line_uid}`}
                            type="number"
                            value={line.qty}
                            className="py-1 w-full text-right"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              handleQtyChange(line.sales_line_uid, e.target.value)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {returned > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  Returned against this invoice: {returned}
                </div>
              )}

              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                <InputDatePicker
                  id="delivery_date"
                  name="delivery_date"
                  label="Delivery Date"
                  className="font-medium text-sm w-full"
                  selectedDate={asDate(header.delivery_date)}
                  setSelectedDate={(date: Date | null) =>
                    setHeader((prev: any) => ({ ...prev, delivery_date: asText(date) }))
                  }
                  setCurrentDate={() => undefined}
                />
                <InputElement
                  id="challan_no"
                  name="challan_no"
                  label="Challan No"
                  value={header.challan_no}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, challan_no: e.target.value }))
                  }
                />
                <InputElement
                  id="vehicle_no"
                  name="vehicle_no"
                  label="Vehicle No"
                  value={header.vehicle_no}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, vehicle_no: e.target.value }))
                  }
                />
                <InputElement
                  id="driver_name"
                  name="driver_name"
                  label="Driver Name"
                  value={header.driver_name}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, driver_name: e.target.value }))
                  }
                />
                <InputElement
                  id="driver_mobile"
                  name="driver_mobile"
                  label="Driver Mobile"
                  value={header.driver_mobile}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, driver_mobile: e.target.value }))
                  }
                />
                <InputElement
                  id="receiver_name"
                  name="receiver_name"
                  label="Receiver Name"
                  value={header.receiver_name}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, receiver_name: e.target.value }))
                  }
                />
                <InputElement
                  id="receiver_mobile"
                  name="receiver_mobile"
                  label="Receiver Mobile"
                  value={header.receiver_mobile}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, receiver_mobile: e.target.value }))
                  }
                />
                <InputElement
                  id="notes"
                  name="notes"
                  label="Notes"
                  value={header.notes}
                  className="py-1 w-full"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHeader((prev: any) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm font-semibold">
                  Total going out: {thousandSeparator(totalPending)}
                </div>
                <ButtonLoading
                  onClick={handleSave}
                  buttonLoading={saving}
                  label={saving ? 'Saving...' : 'Save Delivery'}
                  responsiveLabel="xl"
                  className="whitespace-nowrap"
                  disabled={saving}
                />
              </div>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Recent Deliveries
        </h4>
        {deliveries.isLoading && list.length === 0 ? (
          <Loader />
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[rgb(var(--c-table-head))]">
              <tr>
                <th className="px-2 py-2 text-center">Sl.</th>
                <th className="px-2 py-2">Vr. No.</th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Customer</th>
                <th className="px-2 py-2">Challan</th>
                <th className="px-2 py-2">Vehicle</th>
                <th className="px-2 py-2 text-center">Status</th>
                <th className="px-2 py-2 text-center w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-gray-500">
                    No deliveries yet.
                  </td>
                </tr>
              )}
              {list.map((row, index) => (
                <tr key={row.id} className="border-b bg-[rgb(var(--c-table-body))]">
                  <td className="px-2 py-2 text-center">{index + 1}</td>
                  <td className="px-2 py-2">{row.main_transaction?.vr_no || '-'}</td>
                  <td className="px-2 py-2">{row.delivery_date || '-'}</td>
                  <td className="px-2 py-2">{row.customer?.name || '-'}</td>
                  <td className="px-2 py-2">{row.challan_no || '-'}</td>
                  <td className="px-2 py-2">{row.vehicle_no || '-'}</td>
                  <td className="px-2 py-2 text-center">
                    {Number(row.status) === 1 ? 'Active' : 'Cancelled'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Button
                      onClick={() => printDelivery(row)}
                      className="text-blue-500 ml-2"
                    >
                      <FiPrinter className="cursor-pointer" />
                    </Button>
                    {canCancel && Number(row.status) === 1 && (
                      <Button
                        onClick={() => handleCancel(row)}
                        className="text-red-500 ml-2"
                      >
                        <FiXCircle className="cursor-pointer" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="hidden">
        <DeliveryPrint ref={printRef} data={printData} />
      </div>
    </>
  );
};

export default Delivery;
