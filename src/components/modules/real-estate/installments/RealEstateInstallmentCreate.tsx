import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { FiRefreshCcw, FiSave, FiSearch } from 'react-icons/fi';

import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_UNIT_SALE_DDL_URL,
  API_UNIT_SALE_INSTALLMENT_CREATE_URL,
  API_UNIT_SALE_SUMMARY_URL,
} from '../../../services/apiRoutes';

type SaleOption = {
  id: string;
  name: string;
};

type SaleSummary = {
  id: number;
  receipt_no?: string | null;
  booking?: {
    unit_label?: string | null;
    parking_label?: string | null;
  };
  customer?: {
    name?: string | null;
    mobile?: string | null;
  };
  amounts?: {
    total_amount?: number;
    booking_amount?: number;
    downpayment_amount?: number;
    confirmed_booking_amount?: number;
    confirmed_downpayment_amount?: number;
    confirmed_received?: number;
    due_amount?: number;
  };
  meta?: {
    sale_date?: string | null;
    status?: number | string;
  };
};

const initialOptions: SaleOption[] = [{ id: '', name: 'Select Unit Sale' }];

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (value: any) => thousandSeparator(toNumber(value));

export default function RealEstateInstallmentCreate() {
  const [saleOptions, setSaleOptions] = useState<SaleOption[]>(initialOptions);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [installmentAmount, setInstallmentAmount] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(dayjs().add(1, 'month').toDate());
  const [earlyPayment, setEarlyPayment] = useState(false);
  const [earlyDiscount, setEarlyDiscount] = useState('');
  const [earlyPaymentDate, setEarlyPaymentDate] = useState<Date | null>(null);

  const totalAmount = toNumber(summary?.amounts?.total_amount);
  const bookingAmount = Math.max(
    toNumber(summary?.amounts?.booking_amount),
    toNumber(summary?.amounts?.confirmed_booking_amount),
  );
  const downPaymentAmount = Math.max(
    toNumber(summary?.amounts?.downpayment_amount),
    toNumber(summary?.amounts?.confirmed_downpayment_amount),
  );
  const scheduleBaseAmount = Math.max(totalAmount - bookingAmount - downPaymentAmount, 0);

  const previewRows = useMemo(() => {
    const amount = toNumber(installmentAmount);
    const maxCount = Number(numberOfInstallments);
    if (!summary || !startDate || amount <= 0 || !Number.isFinite(maxCount) || maxCount <= 0) {
      return [];
    }

    const requiredCount = Math.ceil(scheduleBaseAmount / amount);
    const count = Math.min(maxCount, requiredCount);

    return Array.from({ length: count }, (_, index) => {
      const isLast = index + 1 === count;
      const paidBeforeLast = amount * index;
      const rowAmount = isLast ? Math.max(scheduleBaseAmount - paidBeforeLast, 0) : amount;

      return {
        installment_no: index + 1,
        due_date: dayjs(startDate).add(index, 'month').format('DD/MM/YYYY'),
        amount: rowAmount,
      };
    }).filter((row) => row.amount > 0);
  }, [installmentAmount, numberOfInstallments, scheduleBaseAmount, startDate, summary]);

  const loadUnitSaleOptions = async (q = '') => {
    try {
      setLoadingSales(true);
      const response: any = await httpService.get(API_UNIT_SALE_DDL_URL, {
        params: {
          q: q || undefined,
          page: 1,
          perPage: 50,
        },
      });
      const rows =
        response?.data?.data?.data?.data ??
        response?.data?.data?.data ??
        response?.data?.data?.rows ??
        response?.data?.data ??
        [];
      const options = Array.isArray(rows)
        ? rows.map((row: any) => ({
            id: String(row?.id ?? ''),
            name:
              row?.label ??
              `Sale #${row?.id ?? ''} - ${row?.customer_name ?? 'Unknown Customer'}`,
          }))
        : [];
      const filteredOptions = options.filter((option) => option.id);
      setSaleOptions([...initialOptions, ...filteredOptions]);

      if (filteredOptions.length === 1) {
        setSelectedSaleId(filteredOptions[0].id);
        loadSaleSummary(filteredOptions[0].id);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load unit sale list');
    } finally {
      setLoadingSales(false);
    }
  };

  const loadSaleSummary = async (saleId: string) => {
    if (!saleId) {
      setSummary(null);
      return;
    }

    try {
      setSummaryLoading(true);
      const response: any = await httpService.get(`${API_UNIT_SALE_SUMMARY_URL}/${saleId}`);
      setSummary(response?.data?.data ?? null);
    } catch (error: any) {
      setSummary(null);
      toast.error(error?.response?.data?.message || 'Failed to load sale summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    loadUnitSaleOptions();
  }, []);

  const resetForm = () => {
    setSelectedSaleId('');
    setCustomerSearch('');
    setSummary(null);
    setInstallmentAmount('');
    setNumberOfInstallments('');
    setStartDate(dayjs().add(1, 'month').toDate());
    setEarlyPayment(false);
    setEarlyDiscount('');
    setEarlyPaymentDate(null);
  };

  const validate = () => {
    if (!selectedSaleId) {
      toast.warning('Select unit sale first');
      return false;
    }
    if (!summary) {
      toast.warning('Load sale summary first');
      return false;
    }
    if (scheduleBaseAmount <= 0) {
      toast.warning('No installment amount remains after booking and down payment');
      return false;
    }
    if (toNumber(installmentAmount) <= 0) {
      toast.warning('Installment amount must be greater than 0');
      return false;
    }
    if (toNumber(numberOfInstallments) <= 0) {
      toast.warning('Installments no. must be greater than 0');
      return false;
    }
    if (!startDate) {
      toast.warning('Installment start date is required');
      return false;
    }
    if (earlyPayment && toNumber(earlyDiscount) > 0 && !earlyPaymentDate) {
      toast.warning('Early payment date is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        booking_id: Number(selectedSaleId),
        amount: toNumber(installmentAmount),
        start_date: dayjs(startDate).format('YYYY-MM-DD'),
        number_of_installments: Number(numberOfInstallments),
        early_payment: earlyPayment,
        early_discount: earlyPayment ? toNumber(earlyDiscount) : 0,
        early_payment_date: earlyPayment && earlyPaymentDate ? dayjs(earlyPaymentDate).format('YYYY-MM-DD') : null,
      };
      const response: any = await httpService.post(API_UNIT_SALE_INSTALLMENT_CREATE_URL, payload);
      toast.success(response?.data?.message || 'Installment schedule created successfully');
      setInstallmentAmount('');
      setNumberOfInstallments('');
      setEarlyPayment(false);
      setEarlyDiscount('');
      setEarlyPaymentDate(null);
      loadSaleSummary(selectedSaleId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create installment schedule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Real Estate Installment Create" />

      <form onSubmit={handleSubmit}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Real Estate Installment Create</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create schedule after excluding booking money and down payment.
            </p>
          </div>
          <ButtonLoading
            onClick={(e: any) => {
              e?.preventDefault?.();
              resetForm();
            }}
            label="Reset"
            className="h-8"
            icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
          />
        </div>

        <div className="rounded border border-gray-300 bg-white p-3 dark:bg-gray-800">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <DropdownCommon
                id="booking_id"
                name="booking_id"
                label="Unit Sale"
                value={selectedSaleId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const saleId = e.target.value;
                  setSelectedSaleId(saleId);
                  loadSaleSummary(saleId);
                }}
                className="h-[2.1rem] bg-transparent"
                data={saleOptions}
              />
            </div>
            <div className="md:col-span-5">
              <InputElement
                id="customer_search"
                name="customer_search"
                label="Customer / Mobile / Unit"
                placeholder="Type customer, mobile or unit"
                className="h-8.5"
                value={customerSearch}
                onChange={(e: any) => setCustomerSearch(e.target.value)}
              />
            </div>
            <div className="flex items-end md:col-span-2">
              <ButtonLoading
                onClick={(e: any) => {
                  e?.preventDefault?.();
                  loadUnitSaleOptions(customerSearch);
                }}
                buttonLoading={loadingSales}
                label="Load"
                className="h-8.5 w-full"
                icon={<FiSearch className="text-white text-lg ml-2 mr-2" />}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="rounded border border-gray-300 bg-white p-3 dark:bg-gray-800 lg:col-span-5">
            <h3 className="mb-2 text-sm font-semibold">Sale Summary</h3>
            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded border border-gray-200 p-2 dark:border-gray-700">
                <div className="text-xs text-gray-500">Customer</div>
                <div className="font-medium">{summaryLoading ? 'Loading...' : summary?.customer?.name || '-'}</div>
                <div className="text-xs text-gray-500">{summary?.customer?.mobile || '-'}</div>
              </div>
              <div className="rounded border border-gray-200 p-2 dark:border-gray-700">
                <div className="text-xs text-gray-500">Unit</div>
                <div className="font-medium">{summary?.booking?.unit_label || '-'}</div>
                <div className="text-xs text-gray-500">{summary?.booking?.parking_label || '-'}</div>
              </div>
              <div className="rounded border border-gray-200 p-2 text-right dark:border-gray-700">
                <div className="text-xs text-gray-500">Total Sale</div>
                <div className="font-semibold">{formatAmount(totalAmount)}</div>
              </div>
              <div className="rounded border border-gray-200 p-2 text-right dark:border-gray-700">
                <div className="text-xs text-gray-500">Booking Money</div>
                <div className="font-semibold">{formatAmount(bookingAmount)}</div>
              </div>
              <div className="rounded border border-gray-200 p-2 text-right dark:border-gray-700">
                <div className="text-xs text-gray-500">Down Payment</div>
                <div className="font-semibold">{formatAmount(downPaymentAmount)}</div>
              </div>
              <div className="rounded border border-gray-200 p-2 text-right dark:border-gray-700">
                <div className="text-xs text-gray-500">Installment Base</div>
                <div className="font-semibold">{formatAmount(scheduleBaseAmount)}</div>
              </div>
            </div>
          </div>

          <div className="rounded border border-gray-300 bg-white p-3 dark:bg-gray-800 lg:col-span-7">
            <h3 className="mb-2 text-sm font-semibold">Schedule</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <InputElement
                id="installment_amount"
                name="installment_amount"
                label="Installment Amount"
                type="number"
                className="h-8.5"
                value={installmentAmount}
                onChange={(e: any) => setInstallmentAmount(e.target.value)}
              />
              <InputElement
                id="number_of_installments"
                name="number_of_installments"
                label="Installments No."
                type="number"
                className="h-8.5"
                value={numberOfInstallments}
                onChange={(e: any) => setNumberOfInstallments(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-sm text-gray-900 dark:text-white">Start Date</label>
                <InputDatePicker
                  selectedDate={startDate}
                  setSelectedDate={setStartDate}
                  setCurrentDate={setStartDate}
                  className="font-medium text-sm w-full h-8.5"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={earlyPayment}
                  onChange={(e) => setEarlyPayment(e.target.checked)}
                  className="h-4 w-4"
                />
                Early Payment
              </label>
              <InputElement
                id="early_discount"
                name="early_discount"
                label="Early Discount"
                type="number"
                className="h-8.5"
                disabled={!earlyPayment}
                value={earlyDiscount}
                onChange={(e: any) => setEarlyDiscount(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-sm text-gray-900 dark:text-white">Early Payment Date</label>
                <InputDatePicker
                  selectedDate={earlyPaymentDate}
                  setSelectedDate={setEarlyPaymentDate}
                  setCurrentDate={setEarlyPaymentDate}
                  className="font-medium text-sm w-full h-8.5"
                />
              </div>
            </div>

            <div className="mt-4">
              <ButtonLoading
                type="submit"
                onClick={() => {}}
                buttonLoading={saving}
                label="Create Installments"
                className="h-9"
                icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded border border-gray-300 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-center">Inst No</th>
                <th className="p-2 text-left">Due Date</th>
                <th className="p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={row.installment_no} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-2 text-center">{row.installment_no}</td>
                    <td className="p-2">{row.due_date}</td>
                    <td className="p-2 text-right">{formatAmount(row.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-gray-500">
                    Select sale and enter schedule details.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
    </>
  );
}
