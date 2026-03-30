import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import HelmetTitle from '../../utils/others/HelmetTitle';
import routes from '../../services/appRoutes';
import {
  clearSubscriptionFeedback,
  fetchSubscriptionPlans,
  submitManualSubscriptionPayment,
} from './subscriptionSlice';

type PaymentFormState = {
  plan_id: number;
  amount: string;
  payment_method: string;
  billing_months: string;
  paid_at: string;
  transaction_id: string;
  sender_number: string;
  receiver_account: string;
  customer_note: string;
};

const PaymentSubmit: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const location = useLocation();
  const { plans, submittingPayment, submitSuccessMessage, error } = useSelector(
    (state: any) => state.subscription,
  );

  const selectedPlanFromQuery = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return Number(query.get('plan_id') || 0);
  }, [location.search]);

  const [form, setForm] = useState<PaymentFormState>({
    plan_id: selectedPlanFromQuery,
    amount: '',
    payment_method: 'bkash',
    billing_months: '1',
    paid_at: dayjs().format('YYYY-MM-DD'),
    transaction_id: '',
    sender_number: '',
    receiver_account: '',
    customer_note: '',
  });
  const [paymentDateObj, setPaymentDateObj] = useState<Date | null>(new Date());

  useEffect(() => {
    dispatch(fetchSubscriptionPlans());
    return () => {
      dispatch(clearSubscriptionFeedback());
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedPlanFromQuery > 0) {
      setForm((prev) => ({ ...prev, plan_id: selectedPlanFromQuery }));
    }
  }, [selectedPlanFromQuery]);

  useEffect(() => {
    if (submitSuccessMessage) {
      toast.success(submitSuccessMessage);
      navigate(routes.subscription_billing_history, { replace: true });
    }
  }, [navigate, submitSuccessMessage]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.plan_id) return toast.error('Please select a plan.');
    if (!form.amount.trim()) return toast.error('Please enter the payment amount.');
    if (!form.paid_at.trim()) return toast.error('Please enter the payment date.');
    if (!form.transaction_id.trim()) return toast.error('Please enter transaction id.');
    if (!form.sender_number.trim()) return toast.error('Please enter sender number.');

    await dispatch(
      submitManualSubscriptionPayment({
        plan_id: form.plan_id,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        billing_months: Number(form.billing_months || 1),
        paid_at: form.paid_at,
        transaction_id: form.transaction_id,
        sender_number: form.sender_number,
        receiver_account: form.receiver_account || undefined,
        customer_note: form.customer_note || undefined,
      }),
    );
  };

  const fieldClassName =
    'w-full border border-stroke bg-transparent px-4 py-2 text-black outline-none focus:border-blue-400 dark:border-form-strokedark dark:bg-form-input dark:text-white';
  const labelClassName = 'mb-2 block text-sm font-medium text-black dark:text-white';

  return (
    <div>
      <HelmetTitle title="Submit Payment" />

      <div className="mb-4 rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-transparent">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Subscription Payment Submit
          </h2>
          <p className="text-sm text-gray-500">
            Payment করার পর admin verify করে subscription activate বা renew করবে।
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-transparent">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Payment Process
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              Select plan, enter transaction details, and submit for admin approval.
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-transparent">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Accepted Methods
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              bKash, Nagad, Bank Transfer, or Cash reference.
            </p>
          </div>
          <div className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-transparent">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              After submit, you can track it from billing history.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-transparent"
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white">
            Payment Information
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <label className={labelClassName}>
              Plan
            </label>
            <select
              name="plan_id"
              value={form.plan_id}
              onChange={handleChange}
              className={fieldClassName}
            >
              <option value={0}>Select plan</option>
              {plans.map((plan: any) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.currency || 'BDT'} {Number(plan.price || 0).toFixed(0)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className={fieldClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>
              Payment Method
            </label>
            <select
              name="payment_method"
              value={form.payment_method}
              onChange={handleChange}
              className={fieldClassName}
            >
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label className={labelClassName}>
              Billing Months
            </label>
            <input
              type="number"
              min="1"
              max="24"
              name="billing_months"
              value={form.billing_months}
              onChange={handleChange}
              className={fieldClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>Payment Date</label>
            <InputDatePicker
              id="paid_at"
              name="paid_at"
              className="h-10 w-full text-sm font-medium"
              selectedDate={paymentDateObj}
              setSelectedDate={(date: Date | null) => {
                setPaymentDateObj(date);
                setForm((prev) => ({
                  ...prev,
                  paid_at: date ? dayjs(date).format('YYYY-MM-DD') : '',
                }));
              }}
              setCurrentDate={(date: Date | null) => {
                setPaymentDateObj(date);
                setForm((prev) => ({
                  ...prev,
                  paid_at: date ? dayjs(date).format('YYYY-MM-DD') : '',
                }));
              }}
            />
          </div>

          <div>
            <label className={labelClassName}>
              Transaction ID
            </label>
            <input
              type="text"
              name="transaction_id"
              value={form.transaction_id}
              onChange={handleChange}
              className={fieldClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>
              Sender Number
            </label>
            <input
              type="text"
              name="sender_number"
              value={form.sender_number}
              onChange={handleChange}
              className={fieldClassName}
            />
          </div>

          <div>
            <label className={labelClassName}>
              Receiver Account
            </label>
            <input
              type="text"
              name="receiver_account"
              value={form.receiver_account}
              onChange={handleChange}
              placeholder="Optional merchant or bank account"
              className={fieldClassName}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className={labelClassName}>
            Note
          </label>
          <textarea
            rows={4}
            name="customer_note"
            value={form.customer_note}
            onChange={handleChange}
            placeholder="Any note for admin verification"
            className={fieldClassName}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <ButtonLoading
            type="submit"
            buttonLoading={submittingPayment}
            label="Submit"
            className="w-full whitespace-nowrap p-2 text-center"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={() => navigate(routes.subscription_pricing)}
            buttonLoading={false}
            label="Plans"
            className="w-full whitespace-nowrap p-2 text-center"
          />
          <ButtonLoading
            type="button"
            onClick={() => navigate(routes.subscription_billing_history)}
            buttonLoading={false}
            label="History"
            className="w-full whitespace-nowrap p-2 text-center"
          />
          <button
            type="button"
            onClick={() => navigate(routes.my_subscription)}
            className="flex w-full items-center justify-center text-nowrap rounded bg-gray-700 p-2 text-white transition hover:bg-blue-400 dark:hover:bg-blue-400"
          >
            <FiArrowLeft className="mr-2" /> Back
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSubmit;
