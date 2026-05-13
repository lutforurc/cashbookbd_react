import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { toast } from 'react-toastify';
import { FiEdit2, FiRefreshCcw, FiSave, FiSearch, FiX } from 'react-icons/fi';

import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_CHART_OF_ACCOUNTS_DDL_L4_URL,
  API_INSTALLMENT_DETAILS_BY_ID_URL,
  API_UNIT_SALE_DDL_URL,
  API_UNIT_SALE_INSTALLMENT_CREATE_URL,
  API_UNIT_SALE_INSTALLMENT_UPDATE_URL,
  API_UNIT_SALE_SUMMARY_URL,
} from '../../../services/apiRoutes';

dayjs.extend(customParseFormat);

type SaleOption = {
  id: string;
  name: string;
  customer_id?: number | string | null;
  receipt_no?: string | null;
};

type SaleSummary = {
  id: number;
  receipt_no?: string | null;
  booking?: {
    unit_label?: string | null;
    parking_label?: string | null;
    payload?: {
      customer?: {
        value?: number | string | null;
        label?: string | null;
        label_2?: string | null;
      };
    };
  };
  customer?: {
    id?: number | string | null;
    customer_id?: number | string | null;
    ledger_id?: number | string | null;
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

type InstallmentRow = {
  id?: number | string | null;
  installment_id?: number | string | null;
  installment_no: number | string;
  due_date: string;
  amount: number;
  invoice_no?: string | null;
  early_payment_date?: string | null;
  early_payment_discount?: number;
};

type EditableInstallmentRow = InstallmentRow & {
  dueDateValue: Date | null;
  amountValue: string;
  earlyPaymentDateValue: Date | null;
  earlyDiscountValue: string;
};

const initialOptions: SaleOption[] = [{ id: '', name: 'Select Unit Sale' }];

const toNumber = (value: any) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (value: any) => thousandSeparator(toNumber(value));

const normalizeMatchValue = (value: any) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const parseDisplayDate = (value: any) => {
  if (!value) return null;
  const parsed = dayjs(value, ['DD/MM/YYYY', 'YYYY-MM-DD'], true);
  if (parsed.isValid()) return parsed.toDate();
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.toDate() : null;
};

const sumInstallmentAmounts = (rows: InstallmentRow[]) =>
  rows.reduce((total, row) => total + toNumber(row.amount), 0);

const sortInstallmentRows = (rows: InstallmentRow[]) =>
  [...rows].sort((a, b) => {
    const aNo = Number(a.installment_no);
    const bNo = Number(b.installment_no);
    if (Number.isFinite(aNo) && Number.isFinite(bNo)) return aNo - bNo;
    return String(a.installment_no).localeCompare(String(b.installment_no));
  });

export default function RealEstateInstallmentCreate() {
  const [saleOptions, setSaleOptions] = useState<SaleOption[]>(initialOptions);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingInstallmentId, setUpdatingInstallmentId] = useState<string | null>(null);
  const [savedInstallments, setSavedInstallments] = useState<InstallmentRow[]>([]);
  const [savedInstallmentsLoaded, setSavedInstallmentsLoaded] = useState(false);
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<EditableInstallmentRow | null>(null);

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

  const previewRows: InstallmentRow[] = useMemo(() => {
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
  const hasSavedInstallments = savedInstallments.length > 0;
  const scheduleLocked = hasSavedInstallments && previewRows.length === 0;

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
            customer_id:
              row?.customer_id ??
              row?.booking?.customer_id ??
              row?.customer?.id ??
              row?.customer?.customer_id ??
              row?.booking?.payload?.customer?.value ??
              row?.payload?.customer?.value ??
              null,
            receipt_no: row?.receipt_no ?? row?.invoice_no ?? null,
          }))
        : [];
      const filteredOptions = options.filter((option) => option.id);
      setSaleOptions([...initialOptions, ...filteredOptions]);

      if (filteredOptions.length === 1) {
        setSelectedSaleId(filteredOptions[0].id);
        loadSaleInfo(filteredOptions[0].id, false);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load unit sale list');
    } finally {
      setLoadingSales(false);
    }
  };

  const getSummaryCustomerId = (saleSummary: SaleSummary | null) =>
    saleSummary?.customer?.id ??
    saleSummary?.customer?.customer_id ??
    saleSummary?.customer?.ledger_id ??
    saleSummary?.booking?.payload?.customer?.value ??
    null;

  const getSaleCustomerId = (saleId: string, saleSummary: SaleSummary | null = summary) => {
    const option = saleOptions.find((item) => String(item.id) === String(saleId));
    return getSummaryCustomerId(saleSummary) ?? option?.customer_id ?? null;
  };

  const resolveCustomerLedgerId = async (saleId: string, saleSummary: SaleSummary | null = summary) => {
    const knownCustomerId = getSaleCustomerId(saleId, saleSummary);
    if (knownCustomerId) return knownCustomerId;

    const searchValue = saleSummary?.customer?.mobile || saleSummary?.customer?.name || '';
    if (!searchValue) return null;

    const response: any = await httpService.get(API_CHART_OF_ACCOUNTS_DDL_L4_URL, {
      params: {
        searchName: searchValue,
        acType: '',
      },
    });
    const rows =
      response?.data?.data?.data ??
      response?.data?.data ??
      [];

    if (!Array.isArray(rows) || rows.length === 0) return null;

    const customerName = normalizeMatchValue(saleSummary?.customer?.name);
    const customerMobile = normalizeMatchValue(saleSummary?.customer?.mobile);
    const matched =
      rows.find((row: any) => {
        const label = normalizeMatchValue(row?.label);
        const label2 = normalizeMatchValue(row?.label_2);
        return (
          (customerMobile && (label.includes(customerMobile) || label2.includes(customerMobile))) ||
          (customerName && label === customerName)
        );
      }) ?? rows[0];

    return matched?.value ?? matched?.id ?? null;
  };

  const normalizeInstallmentRows = (response: any): InstallmentRow[] => {
    const rows =
      response?.data?.data?.data?.data ??
      response?.data?.data?.data ??
      response?.data?.data ??
      response?.data ??
      [];

    return Array.isArray(rows)
      ? rows.map((row: any) => ({
          id: row?.id ?? row?.installment_id ?? null,
          installment_id: row?.installment_id ?? row?.id ?? null,
          installment_no: row?.installment_no ?? row?.inst_no ?? '-',
          due_date: dayjs(row?.due_date ?? row?.installment_date ?? row?.inst_date).isValid()
            ? dayjs(row?.due_date ?? row?.installment_date ?? row?.inst_date).format('DD/MM/YYYY')
            : row?.due_date ?? row?.installment_date ?? row?.inst_date ?? '',
          amount: toNumber(row?.amount ?? row?.due_amount ?? row?.installment_amount),
          invoice_no: row?.invoice_no ?? row?.sales_invoice ?? row?.receipt_no ?? null,
          early_payment_date: row?.early_payment_date
            ? dayjs(row.early_payment_date).isValid()
              ? dayjs(row.early_payment_date).format('DD/MM/YYYY')
              : row.early_payment_date
            : null,
          early_payment_discount: toNumber(row?.early_payment_discount ?? row?.early_discount),
        }))
      : [];
  };

  const loadSavedInstallments = async (saleId: string, saleSummary: SaleSummary | null = summary) => {
    const customerId = await resolveCustomerLedgerId(saleId, saleSummary);
    if (!customerId) {
      setSavedInstallments([]);
      setSavedInstallmentsLoaded(true);
      return [];
    }

    try {
      setInstallmentsLoading(true);
      const response: any = await httpService.get(
        `${API_INSTALLMENT_DETAILS_BY_ID_URL}/${customerId}?report=true`,
      );
      const rows = normalizeInstallmentRows(response);
      const saleOption = saleOptions.find((item) => String(item.id) === String(saleId));
      const receiptNo = saleSummary?.receipt_no ?? saleOption?.receipt_no ?? null;
      const matchedRows = receiptNo
        ? rows.filter((row) => normalizeMatchValue(row.invoice_no) === normalizeMatchValue(receiptNo))
        : rows;
      const saleRows = sortInstallmentRows(matchedRows.length > 0 ? matchedRows : rows);
      setSavedInstallments(saleRows);
      setSavedInstallmentsLoaded(true);
      return saleRows;
    } catch (error: any) {
      setSavedInstallments([]);
      setSavedInstallmentsLoaded(true);
      toast.error(error?.response?.data?.message || 'Failed to load installment schedule');
      return [];
    } finally {
      setInstallmentsLoading(false);
    }
  };

  const loadSaleSummary = async (saleId: string) => {
    if (!saleId) {
      setSummary(null);
      setSavedInstallments([]);
      setSavedInstallmentsLoaded(false);
      return;
    }

    try {
      setSummaryLoading(true);
      const response: any = await httpService.get(`${API_UNIT_SALE_SUMMARY_URL}/${saleId}`);
      const saleSummary = response?.data?.data ?? null;
      setSummary(saleSummary);
      return saleSummary;
    } catch (error: any) {
      setSummary(null);
      toast.error(error?.response?.data?.message || 'Failed to load sale summary');
      return null;
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadSaleInfo = async (saleId: string, showEmptyMessage = true) => {
    if (!saleId) {
      toast.warning('Select unit sale first');
      return;
    }

    const saleSummary = await loadSaleSummary(saleId);
    const rows = await loadSavedInstallments(saleId, saleSummary);
    if (showEmptyMessage && rows.length === 0) {
      toast.info('No saved installment schedule found for this sale');
    }
  };

  useEffect(() => {
    loadUnitSaleOptions();
  }, []);

  const resetForm = () => {
    setSelectedSaleId('');
    setCustomerSearch('');
    setSummary(null);
    setSavedInstallments([]);
    setSavedInstallmentsLoaded(false);
    setEditingInstallmentId(null);
    setEditingRow(null);
    setInstallmentAmount('');
    setNumberOfInstallments('');
    setStartDate(dayjs().add(1, 'month').toDate());
    setEarlyPayment(false);
    setEarlyDiscount('');
    setEarlyPaymentDate(null);
  };

  const validate = () => {
    if (hasSavedInstallments) {
      toast.info('Installment schedule already exists. Edit the list below instead.');
      return false;
    }
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

  const getInstallmentKey = (row: InstallmentRow) =>
    String(row.installment_id ?? row.id ?? `${row.installment_no}-${row.due_date}`);

  const startEditInstallment = (row: InstallmentRow) => {
    const key = getInstallmentKey(row);
    setEditingInstallmentId(key);
    setEditingRow({
      ...row,
      dueDateValue: parseDisplayDate(row.due_date),
      amountValue: String(row.amount || ''),
      earlyPaymentDateValue: parseDisplayDate(row.early_payment_date),
      earlyDiscountValue: String(row.early_payment_discount || ''),
    });
  };

  const cancelEditInstallment = () => {
    setEditingInstallmentId(null);
    setEditingRow(null);
  };

  const postInstallmentUpdate = (
    row: InstallmentRow,
    amount: number,
    dueDate: Date,
    earlyPaymentDate?: Date | null,
    earlyDiscount?: number,
  ) => {
    const installmentId = row.installment_id ?? row.id;
    if (!installmentId) {
      throw new Error('Installment id not found');
    }

    const payload: any = {
      installment_id: installmentId,
      due_date: dayjs(dueDate).format('YYYY-MM-DD'),
      amount,
    };

    if (earlyPaymentDate !== undefined || earlyDiscount !== undefined) {
      payload.early_payment_date = earlyPaymentDate ? dayjs(earlyPaymentDate).format('YYYY-MM-DD') : null;
      payload.early_discount = toNumber(earlyDiscount);
      payload.early_payment_discount = toNumber(earlyDiscount);
    }

    return httpService.post(API_UNIT_SALE_INSTALLMENT_UPDATE_URL, payload);
  };

  const createBalancingInstallment = (amount: number, afterRow: InstallmentRow) => {
    const afterDate = parseDisplayDate(afterRow.due_date) ?? dayjs().toDate();
    return httpService.post(API_UNIT_SALE_INSTALLMENT_CREATE_URL, {
      booking_id: Number(selectedSaleId),
      amount,
      start_date: dayjs(afterDate).add(1, 'month').format('YYYY-MM-DD'),
      number_of_installments: 1,
      early_payment: false,
      early_discount: 0,
      early_payment_date: null,
    });
  };

  const saveInstallmentEdit = async () => {
    if (!editingRow) return;

    const installmentId = editingRow.installment_id ?? editingRow.id;
    if (!installmentId) {
      toast.error('Installment id not found');
      return;
    }
    if (!editingRow.dueDateValue) {
      toast.warning('Due date is required');
      return;
    }
    if (toNumber(editingRow.amountValue) <= 0) {
      toast.warning('Amount must be greater than 0');
      return;
    }

    const editKey = getInstallmentKey(editingRow);
    const editedAmount = toNumber(editingRow.amountValue);
    const editedIndex = savedInstallments.findIndex((row) => getInstallmentKey(row) === editKey);
    if (editedIndex < 0) {
      toast.error('Installment row not found');
      return;
    }
    const isFirstInstallment = editedIndex === 0;
    if (isFirstInstallment && toNumber(editingRow.earlyDiscountValue) > 0 && !editingRow.earlyPaymentDateValue) {
      toast.warning('Early payment date is required');
      return;
    }

    const currentAmount = toNumber(savedInstallments[editedIndex]?.amount);
    const amountChanged = Math.abs(editedAmount - currentAmount) >= 0.01;
    const rowsWithEditedAmount = savedInstallments.map((row, index) =>
      index === editedIndex
        ? {
            ...row,
            due_date: dayjs(editingRow.dueDateValue).format('DD/MM/YYYY'),
            amount: editedAmount,
            early_payment_date: isFirstInstallment && editingRow.earlyPaymentDateValue
              ? dayjs(editingRow.earlyPaymentDateValue).format('DD/MM/YYYY')
              : row.early_payment_date,
            early_payment_discount: isFirstInstallment
              ? toNumber(editingRow.earlyDiscountValue)
              : row.early_payment_discount,
          }
        : row,
    );
    const balanceAmount = scheduleBaseAmount - sumInstallmentAmounts(rowsWithEditedAmount);
    const shouldBalance = amountChanged && Math.abs(balanceAmount) >= 0.01;
    const nextRow = savedInstallments[editedIndex + 1] ?? null;
    const nextRowDate = nextRow ? parseDisplayDate(nextRow.due_date) : null;
    const nextAdjustedAmount = nextRow ? toNumber(nextRow.amount) + balanceAmount : 0;

    if (shouldBalance && nextRow) {
      if (!(nextRow.installment_id ?? nextRow.id)) {
        toast.error('Next installment id not found');
        return;
      }
      if (!nextRowDate) {
        toast.warning('Next installment due date is invalid');
        return;
      }
      if (nextAdjustedAmount <= 0) {
        toast.warning('Next installment amount must remain greater than 0');
        return;
      }
    }

    if (shouldBalance && !nextRow && balanceAmount < 0) {
      toast.warning('Installment total cannot be greater than Installment Base');
      return;
    }

    try {
      setUpdatingInstallmentId(editKey);
      const response: any = await postInstallmentUpdate(
        editingRow,
        editedAmount,
        editingRow.dueDateValue,
        isFirstInstallment ? editingRow.earlyPaymentDateValue : undefined,
        isFirstInstallment ? toNumber(editingRow.earlyDiscountValue) : undefined,
      );

      if (shouldBalance && nextRow && nextRowDate) {
        await postInstallmentUpdate(nextRow, nextAdjustedAmount, nextRowDate);
      } else if (shouldBalance && balanceAmount > 0) {
        await createBalancingInstallment(balanceAmount, rowsWithEditedAmount[editedIndex]);
      }

      toast.success(response?.data?.message || 'Installment updated successfully');
      cancelEditInstallment();
      loadSaleInfo(selectedSaleId, false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update installment');
    } finally {
      setUpdatingInstallmentId(null);
    }
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
      loadSaleInfo(selectedSaleId, false);
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
                  setSavedInstallments([]);
                  setSavedInstallmentsLoaded(false);
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
                  if (selectedSaleId) {
                    loadSaleInfo(selectedSaleId);
                  } else {
                    loadUnitSaleOptions(customerSearch);
                  }
                }}
                buttonLoading={loadingSales || summaryLoading || installmentsLoading}
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

          <div className={`rounded border border-gray-300 bg-white p-3 dark:bg-gray-800 lg:col-span-7 ${scheduleLocked ? 'opacity-70' : ''}`}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Schedule</h3>
              {scheduleLocked ? (
                <span className="rounded border border-amber-500/40 px-2 py-0.5 text-xs font-medium text-amber-500">
                  Already Created
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <InputElement
                id="installment_amount"
                name="installment_amount"
                label="Installment Amount"
                type="number"
                className="h-8.5"
                disabled={scheduleLocked}
                value={installmentAmount}
                onChange={(e: any) => setInstallmentAmount(e.target.value)}
              />
              <InputElement
                id="number_of_installments"
                name="number_of_installments"
                label="Installments No."
                type="number"
                className="h-8.5"
                disabled={scheduleLocked}
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
                  disabled={scheduleLocked}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input
                  type="checkbox"
                  checked={earlyPayment}
                  disabled={scheduleLocked}
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
                disabled={!earlyPayment || scheduleLocked}
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
                  disabled={scheduleLocked || !earlyPayment}
                />
              </div>
            </div>

            <div className="mt-4">
              <ButtonLoading
                type="submit"
                onClick={() => {}}
                disabled={scheduleLocked}
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
                <th className="p-2 text-left">Early Pay Date</th>
                <th className="p-2 text-right">Early Discount</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {installmentsLoading ? (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-gray-500">
                    Loading installment schedule...
                  </td>
                </tr>
              ) : previewRows.length > 0 ? (
                previewRows.map((row) => (
                  <tr key={`${row.installment_no}-${row.due_date}`} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-2 text-center">{row.installment_no}</td>
                    <td className="p-2">{row.due_date}</td>
                    <td className="p-2 text-right">{formatAmount(row.amount)}</td>
                    <td className="p-2 text-gray-500">-</td>
                    <td className="p-2 text-right text-gray-500">-</td>
                    <td className="p-2 text-center text-gray-500">-</td>
                  </tr>
                ))
              ) : savedInstallments.length > 0 ? (
                savedInstallments.map((row, index) => {
                  const rowKey = getInstallmentKey(row);
                  const isEditing = editingInstallmentId === rowKey && !!editingRow;
                  const activeEditingRow = isEditing ? editingRow : null;
                  const isUpdating = updatingInstallmentId === rowKey;
                  const isFirstRow = index === 0;

                  return (
                    <tr key={`${rowKey}-${row.due_date}`} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-2 text-center">{row.installment_no}</td>
                      <td className="p-2">
                        {isEditing ? (
                          <InputDatePicker
                            selectedDate={activeEditingRow?.dueDateValue ?? null}
                            setSelectedDate={(date) =>
                              setEditingRow((prev) => (prev ? { ...prev, dueDateValue: date } : prev))
                            }
                            setCurrentDate={(date) =>
                              setEditingRow((prev) => (prev ? { ...prev, dueDateValue: date } : prev))
                            }
                            className="h-8.5 w-36 text-sm"
                          />
                        ) : (
                          row.due_date
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={activeEditingRow?.amountValue ?? ''}
                            onChange={(e) =>
                              setEditingRow((prev) =>
                                prev ? { ...prev, amountValue: e.target.value } : prev,
                              )
                            }
                            className="h-8.5 w-32 rounded-xs border bg-white px-3 py-1 text-right text-gray-600 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white"
                          />
                        ) : (
                          formatAmount(row.amount)
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing && isFirstRow ? (
                          <InputDatePicker
                            selectedDate={activeEditingRow?.earlyPaymentDateValue ?? null}
                            setSelectedDate={(date) =>
                              setEditingRow((prev) => (prev ? { ...prev, earlyPaymentDateValue: date } : prev))
                            }
                            setCurrentDate={(date) =>
                              setEditingRow((prev) => (prev ? { ...prev, earlyPaymentDateValue: date } : prev))
                            }
                            className="h-8.5 w-36 text-sm"
                          />
                        ) : isFirstRow ? (
                          row.early_payment_date || '-'
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2 text-right">
                        {isEditing && isFirstRow ? (
                          <input
                            type="number"
                            value={activeEditingRow?.earlyDiscountValue ?? ''}
                            onChange={(e) =>
                              setEditingRow((prev) =>
                                prev ? { ...prev, earlyDiscountValue: e.target.value } : prev,
                              )
                            }
                            className="h-8.5 w-32 rounded-xs border bg-white px-3 py-1 text-right text-gray-600 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white"
                          />
                        ) : isFirstRow && row.early_payment_discount ? (
                          formatAmount(row.early_payment_discount)
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              onClick={saveInstallmentEdit}
                              disabled={isUpdating}
                              className="inline-flex h-8 items-center gap-1 bg-gray-700 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                            >
                              <FiSave />
                              {isUpdating ? 'Saving' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditInstallment}
                              disabled={isUpdating}
                              className="inline-flex h-8 items-center gap-1 border border-gray-500 px-3 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
                            >
                              <FiX />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditInstallment(row)}
                            className="inline-flex h-8 items-center gap-1 bg-gray-700 px-3 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            <FiEdit2 />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-gray-500">
                    {savedInstallmentsLoaded
                      ? 'No saved installment schedule found for this sale.'
                      : 'Select sale and enter schedule details.'}
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
