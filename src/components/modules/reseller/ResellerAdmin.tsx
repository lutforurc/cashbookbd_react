import React, { useEffect, useMemo, useState } from 'react';
import { FiCreditCard, FiRefreshCw, FiSave, FiUserX, FiUsers } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import InputElement from '../../utils/fields/InputElement';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import {
  assignCompanyToReseller,
  clearResellerFeedback,
  fetchResellerAdminData,
  payResellerCommission,
  Reseller,
  saveReseller as saveResellerAction,
} from './resellerSlice';
import { FIELD_TEXTAREA } from '../../../theme/fieldStyles';
import { Textarea } from '../../utils/fields/FormControls';

const emptyForm = {
  id: '',
  name: '',
  business_name: '',
  email: '',
  phone: '',
  address: '',
  commission_type: 'percentage',
  commission_value: '0',
  password: '',
  status: '1',
  notes: '',
};

const emptyPaymentForm = {
  reseller_id: '',
  amount: '',
  payment_method: 'bkash',
  paid_to_account: '',
  payment_reference: '',
  ledger_date: new Date().toISOString().slice(0, 10),
  notes: '',
};

const currency = (value: number | string | null | undefined, code = 'BDT') => {
  const formatted = thousandSeparator(Number(value || 0));
  return formatted === '-' ? '-' : `${code} ${formatted}`;
};

const ResellerAdmin: React.FC = () => {
  const dispatch = useDispatch<any>();
  const { overview, resellers, companies, payments, commissionLedgers, commissionLedgerPagination, loading, saving, error, successMessage } = useSelector(
    (state: any) => state.reseller,
  );
  const [form, setForm] = useState(emptyForm);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [selectedResellerId, setSelectedResellerId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const mobileFormat = useMobileFormat();

  const resellerColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (reseller: Reseller) => (
        <>
          <p className="font-medium text-black dark:text-white">{reseller.name}</p>
          <p className="text-xs text-slate-500 dark:text-bodydark2">{reseller.business_name || '-'}</p>
        </>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (reseller: Reseller) => (
        <>
          <p>{formatMobile(reseller.phone, mobileFormat) || '-'}</p>
          <p className="text-xs">{reseller.email || '-'}</p>
        </>
      ),
    },
    { key: 'company_count', header: 'Companies' },
    { key: 'approved_commission', header: 'Commission' },
    { key: 'status_label', header: 'Status' },
    {
      key: 'action',
      header: 'Action',
      render: (reseller: Reseller) => (
        <Button type="button" className="text-primary hover:underline" onClick={() => editReseller(reseller)}>
          Edit
        </Button>
      ),
    },
  ];
  const resellerTableData = resellers.map((reseller) => ({
    ...reseller,
    company_count: reseller.company_count || 0,
    approved_commission: currency(reseller.approved_commission),
    status_label: Number(reseller.status) === 1 ? 'Active' : 'Inactive',
  }));
  const tableClassNames = {
    className: 'shadow-none',
    theadClassName: 'bg-gray-2 text-slate-500 dark:bg-meta-4 dark:text-bodydark2',
    tbodyClassName: 'dark:bg-boxdark',
  };
  const assignedCompanyColumns = [
    { key: 'company', header: 'Company' },
    { key: 'reseller', header: 'Reseller' },
    { key: 'plan', header: 'Plan' },
    { key: 'status', header: 'Status' },
    {
      key: 'action',
      header: 'Action',
      render: (company: any) => (
        <Button
          type="button"
          onClick={() => unassignCompany(Number(company.id), Number(company.reseller_id))}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiUserX />
          Cancel
        </Button>
      ),
    },
  ];
  const assignedCompanyTableData = companies.filter((company) => company.reseller_id).map((company) => ({
    ...company,
    company: company.name,
    reseller: company.reseller_name || '-',
    plan: company.plan_name || '-',
    status: company.subscription_status || '-',
  }));
  const paymentCommissionColumns = [
    { key: 'company', header: 'Company' },
    { key: 'payment', header: 'Payment' },
    { key: 'amount', header: 'Amount' },
    { key: 'commission', header: 'Commission' },
  ];
  const paymentCommissionTableData = payments.map((payment) => ({
    ...payment,
    company: payment.company_name || '-',
    payment: payment.payment_status || '-',
    amount: currency(payment.amount, payment.currency || 'BDT'),
    commission: currency(payment.commission_amount, payment.currency || 'BDT'),
  }));
  const commissionPaymentColumns = [
    { key: 'date', header: 'Date' },
    { key: 'reseller', header: 'Reseller' },
    { key: 'method', header: 'Method' },
    { key: 'account', header: 'Account' },
    { key: 'reference', header: 'Reference' },
    { key: 'amount', header: 'Amount' },
  ];
  const commissionPaymentTableData = commissionLedgers.filter((ledger: any) => ledger.ledger_type === 'paid').map((ledger: any) => ({
    ...ledger,
    date: formatDate(ledger.ledger_date || ledger.paid_at),
    reseller: ledger.reseller_name || '-',
    method: paymentMethodLabel(ledger.payment_method),
    account: ledger.paid_to_account || '-',
    reference: ledger.payment_reference || ledger.reference_no || '-',
    amount: currency(ledger.amount, ledger.currency || 'BDT'),
  }));

  const resellerOptions = useMemo(
    () => resellers.map((reseller) => ({ id: String(reseller.id), name: reseller.name })),
    [resellers],
  );

  const unassignedCompanies = useMemo(
    () => companies.filter((company) => !company.reseller_id),
    [companies],
  );

  const paymentReseller = useMemo(
    () => resellers.find((reseller) => String(reseller.id) === paymentForm.reseller_id),
    [paymentForm.reseller_id, resellers],
  );

  useEffect(() => {
    dispatch(fetchResellerAdminData({ commissionLedgerPage: 1, commissionLedgerPerPage: 10 }));

    return () => {
      dispatch(clearResellerFeedback());
    };
  }, [dispatch]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (!successMessage) return;
    toast.success(successMessage);
    dispatch(fetchResellerAdminData({
      commissionLedgerPage: commissionLedgerPagination?.current_page || 1,
      commissionLedgerPerPage: commissionLedgerPagination?.per_page || 10,
    }));
  }, [commissionLedgerPagination?.current_page, commissionLedgerPagination?.per_page, dispatch, successMessage]);

  const handleFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePaymentChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setPaymentForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => setForm(emptyForm);
  const resetPaymentForm = () => setPaymentForm(emptyPaymentForm);

  const editReseller = (reseller: Reseller) => {
    setForm({
      id: String(reseller.id),
      name: reseller.name || '',
      business_name: reseller.business_name || '',
      email: reseller.email || '',
      phone: reseller.phone || '',
      address: '',
      commission_type: reseller.commission_type || 'percentage',
      commission_value: String(reseller.commission_value ?? 0),
      password: '',
      status: String(reseller.status ?? 1),
      notes: '',
    });
  };

  const handleSaveReseller = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return toast.error('Reseller name is required.');

    try {
      const payload = {
        name: form.name.trim(),
        business_name: form.business_name || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        commission_type: form.commission_type,
        commission_value: Number(form.commission_value || 0),
        password: form.password || undefined,
        status: Number(form.status),
        notes: form.notes || null,
      };

      await dispatch(saveResellerAction({ id: form.id ? Number(form.id) : undefined, payload })).unwrap();
      resetForm();
    } catch (error: any) {
      toast.error(error || 'Failed to save reseller.');
    }
  };

  const assignCompany = async () => {
    if (!selectedResellerId) return toast.error('Please select a reseller.');
    if (!selectedCompanyId) return toast.error('Please select a company.');

    try {
      await dispatch(assignCompanyToReseller({
        reseller_id: Number(selectedResellerId),
        company_id: Number(selectedCompanyId),
        status: 1,
      })).unwrap();
      setSelectedCompanyId('');
    } catch (error: any) {
      toast.error(error || 'Failed to assign company.');
    }
  };

  const unassignCompany = async (companyId: number, resellerId: number) => {
    if (!window.confirm('Cancel this company assignment?')) return;

    try {
      await dispatch(assignCompanyToReseller({
        reseller_id: resellerId,
        company_id: companyId,
        status: 0,
      })).unwrap();
    } catch (error: any) {
      toast.error(error || 'Failed to cancel company assignment.');
    }
  };

  const handleCommissionPaymentPageChange = (page: number) => {
    dispatch(fetchResellerAdminData({
      commissionLedgerPage: page,
      commissionLedgerPerPage: commissionLedgerPagination?.per_page || 10,
    }));
  };

  const handlePayCommission = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentForm.reseller_id) return toast.error('Please select a reseller.');
    if (Number(paymentForm.amount || 0) <= 0) return toast.error('Payment amount is required.');

    try {
      await dispatch(payResellerCommission({
        reseller_id: Number(paymentForm.reseller_id),
        amount: Number(paymentForm.amount || 0),
        payment_method: paymentForm.payment_method,
        paid_to_account: paymentForm.paid_to_account || null,
        payment_reference: paymentForm.payment_reference || null,
        ledger_date: paymentForm.ledger_date || null,
        notes: paymentForm.notes || null,
      })).unwrap();
      resetPaymentForm();
    } catch (error: any) {
      toast.error(error || 'Failed to pay reseller commission.');
    }
  };

  return (
    <div className="space-y-4">
      <HelmetTitle title="Reseller Admin" />

      <section className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-white">Reseller Admin</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-bodydark2">Manage reseller accounts, client assignment, and commission tracking.</p>
          </div>

          <ButtonLoading
            type="button"
            onClick={() => dispatch(fetchResellerAdminData())}
            buttonLoading={loading}
            disabled={loading}
            icon={<FiRefreshCw className="" />}
            label={loading ? 'Refreshing...' : 'Refresh'}
            className="h-10 w-34 p-2"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Resellers" value={overview?.total_resellers ?? 0} />
        <StatCard label="Active" value={overview?.active_resellers ?? 0} />
        <StatCard label="Companies" value={overview?.assigned_companies ?? 0} />
        <StatCard label="Commission" value={currency(overview?.approved_commission)} />
        <StatCard label="Paid" value={currency(overview?.paid_commission)} />
        <StatCard label="Payable" value={currency(overview?.payable_commission)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h2 className="text-base font-semibold text-black dark:text-white">
            {form.id ? 'Edit Reseller' : 'New Reseller'}
          </h2>

          <form onSubmit={handleSaveReseller} className="mt-4 space-y-3">
            <Field label="Name" name="name" value={form.name} onChange={handleFormChange} required />
            <Field label="Business Name" name="business_name" value={form.business_name} onChange={handleFormChange} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Phone" name="phone" value={form.phone} onChange={handleFormChange} />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleFormChange} />
            </div>
            <Field
              label="Login Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleFormChange}
              placeholder={form.id ? 'Keep blank to keep current password' : 'Optional reseller login password'}
            />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Commission"
                name="commission_type"
                value={form.commission_type}
                onChange={handleFormChange}
                options={[
                  { id: 'percentage', name: 'Percentage' },
                  { id: 'fixed', name: 'Fixed' },
                ]}
              />
              <Field
                label="Value"
                name="commission_value"
                type="number"
                value={form.commission_value}
                onChange={handleFormChange}
              />
            </div>
            <SelectField
              label="Status"
              name="status"
              value={form.status}
              onChange={handleFormChange}
              options={[
                { id: '1', name: 'Active' },
                { id: '0', name: 'Inactive' },
              ]}
            />
            <TextareaField label="Notes" name="notes" value={form.notes} onChange={handleFormChange} />

            <div className="flex gap-2">
              <ButtonLoading
                type="submit"
                buttonLoading={saving}
                disabled={saving}
                icon={<FiSave className="" />}
                label={saving ? 'Saving...' : 'Save'}
                className="h-10 w-28 p-2"
              />
              {form.id && (
                <Button
                  type="button"
                  onClick={resetForm}
                  className="h-10 rounded-sm border border-stroke px-4 text-sm text-slate-600 hover:bg-gray-2 dark:border-strokedark dark:text-bodydark dark:hover:bg-meta-4"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
            <h2 className="text-base font-semibold text-black dark:text-white">Reseller List</h2>
          </div>
          <Table
            columns={resellerColumns}
            data={resellerTableData || []}
            perPage={10}
            noDataMessage="No reseller found."
            {...tableClassNames}
          />
        </section>
      </div>

      <section className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-base font-semibold text-black dark:text-white">Assign Company</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <SelectField
            label="Reseller"
            name="selectedResellerId"
            value={selectedResellerId}
            onChange={(event) => setSelectedResellerId(event.target.value)}
            options={[{ id: '', name: 'Select reseller' }, ...resellerOptions]}
          />
          <SelectField
            label="Unassigned Company"
            name="selectedCompanyId"
            value={selectedCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            options={[
              { id: '', name: 'Select company' },
              ...unassignedCompanies.map((company) => ({ id: String(company.id), name: company.name })),
            ]}
          />
          <div className="flex items-end">
            <ButtonLoading
              type="button"
              onClick={assignCompany}
              buttonLoading={saving}
              disabled={saving}
              icon={<FiUsers className="" />}
              label="Assign"
              className="h-10 w-30 p-2"
            />
          </div>
        </div>
      </section>

      <section className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-base font-semibold text-black dark:text-white">Pay Reseller Commission</h2>
        <form onSubmit={handlePayCommission} className="mt-4 grid gap-3 xl:grid-cols-4">
          <SelectField
            label="Reseller"
            name="reseller_id"
            value={paymentForm.reseller_id}
            onChange={handlePaymentChange}
            options={[{ id: '', name: 'Select reseller' }, ...resellerOptions]}
          />
          <Field
            label={`Amount${paymentReseller ? ` (Payable ${currency(paymentReseller.payable_commission)})` : ''}`}
            name="amount"
            type="number"
            step="0.01"
            value={paymentForm.amount}
            onChange={handlePaymentChange}
            placeholder="Enter Amount"
          />
          <SelectField
            label="Payment Method"
            name="payment_method"
            value={paymentForm.payment_method}
            onChange={handlePaymentChange}
            options={[
              { id: 'bkash', name: 'bKash' },
              { id: 'nagad', name: 'Nagad' },
              { id: 'bank', name: 'Bank' },
              { id: 'cash', name: 'Cash' },
              { id: 'other', name: 'Other' },
            ]}
          />
          <Field label="Payment Date" name="ledger_date" type="date" value={paymentForm.ledger_date} onChange={handlePaymentChange} />
          <Field label="Paid To Account" name="paid_to_account" value={paymentForm.paid_to_account} onChange={handlePaymentChange} />
          <Field label="Reference" name="payment_reference" value={paymentForm.payment_reference} onChange={handlePaymentChange} />
          <TextareaField label="Notes" name="notes" value={paymentForm.notes} onChange={handlePaymentChange} />
          <div className="flex items-end">
            <ButtonLoading
              type="submit"
              buttonLoading={saving}
              disabled={saving}
              icon={<FiCreditCard className="" />}
              label={saving ? 'Paying...' : 'Pay'}
              className="h-10 w-28 p-2"
            />
          </div>
        </form>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <TableSection title="Assigned Companies">
          <Table
            columns={assignedCompanyColumns}
            data={assignedCompanyTableData || []}
            perPage={10}
            noDataMessage="No company assignment found."
            {...tableClassNames}
          />
        </TableSection>
        <TableSection title="Payment Commissions">
          <Table
            columns={paymentCommissionColumns}
            data={paymentCommissionTableData || []}
            perPage={10}
            noDataMessage="No payment commission found."
            {...tableClassNames}
          />
        </TableSection>
        <TableSection title="Commission Payments">
          <Table
            columns={commissionPaymentColumns}
            data={commissionPaymentTableData || []}
            noDataMessage="No reseller payment found."
            {...tableClassNames}
          />
          {(commissionLedgerPagination?.last_page || 1) > 1 ? (
            <div className="border-t border-gray-200 bg-white px-3 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-boxdark dark:text-gray-300">
              {/* <span>
                Showing {(((commissionLedgerPagination?.current_page || 1) - 1) * (commissionLedgerPagination?.per_page || 10)) + 1}
                -{Math.min((commissionLedgerPagination?.current_page || 1) * (commissionLedgerPagination?.per_page || 10), commissionLedgerPagination?.total || 0)}
                {' '}of {commissionLedgerPagination?.total || 0}
              </span> */}
              <Pagination
                currentPage={commissionLedgerPagination?.current_page || 1}
                totalPages={commissionLedgerPagination?.last_page || 1}
                handlePageChange={handleCommissionPaymentPageChange}
              />
            </div>
          ) : (
            ''
          )}
        </TableSection>
      </div>
    </div>
  );
};

const paymentMethodLabel = (method?: string | null) => {
  const labels: Record<string, string> = {
    bkash: 'bKash',
    nagad: 'Nagad',
    bank: 'Bank',
    cash: 'Cash',
    other: 'Other',
  };
  return method ? labels[method] || method : '-';
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '-');

const StatCard = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
    <p className="text-sm font-medium text-slate-500 dark:text-bodydark2">{label}</p>
    <p className="mt-2 text-title-sm font-bold text-black dark:text-white">{value}</p>
  </div>
);

const Field = ({ label, className = '', ...props }: any) => (
  <InputElement
    {...props}
    label={label}
    className={`h-10 ${className}`}
  />
);

const TextareaField = ({ label, ...props }: any) => (
  <label className="block">
    <span className="mb-1 block text-sm text-black dark:text-white">{label}</span>
    <Textarea
      {...props}
      rows={3}
      className={`${FIELD_TEXTAREA} w-full px-3 py-2 text-sm`}
    />
  </label>
);

const SelectField = ({ label, options, ...props }: any) => (
  <DropdownCommon
    {...props}
    label={label}
    data={options}
    className="h-10 bg-transparent"
  />
);

const TableSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
    <div className="border-b border-stroke px-5 py-4 dark:border-strokedark">
      <h2 className="text-base font-semibold text-black dark:text-white">{title}</h2>
    </div>
    {children}
  </section>
);

export default ResellerAdmin;
