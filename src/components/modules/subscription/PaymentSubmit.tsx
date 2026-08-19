import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiClock, FiList, FiSave } from 'react-icons/fi';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputDatePicker from '../../utils/fields/DatePicker';
import HelmetTitle from '../../utils/others/HelmetTitle';
import routes from '../../services/appRoutes';
import {
  clearSubscriptionFeedback,
  fetchCurrentSubscription,
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
  const { plans, current, submittingPayment, submitSuccessMessage, error } = useSelector(
    (state: any) => state.subscription,
  );

  /**
   * Whether the plan has been settled -- by the URL, by the plan already held,
   * or by the person choosing one. Guards the fallback below so a plan that
   * arrives late cannot overwrite a choice already made.
   */
  const planSettled = useRef(false);

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
    dispatch(fetchCurrentSubscription());
    return () => {
      dispatch(clearSubscriptionFeedback());
    };
  }, [dispatch]);

  useEffect(() => {
    if (selectedPlanFromQuery > 0) {
      planSettled.current = true;
      setForm((prev) => ({ ...prev, plan_id: selectedPlanFromQuery }));
    }
  }, [selectedPlanFromQuery]);

  // Only the pricing page names a plan in the URL. Reached from My Subscription,
  // the status banner or the menu it carries none, and the plan already held is
  // the one being renewed -- so it is filled in once the subscription loads,
  // and only while nothing else has settled the field.
  useEffect(() => {
    const currentPlanId = Number(current?.plan_id || 0);

    if (planSettled.current || selectedPlanFromQuery > 0 || currentPlanId <= 0) return;

    planSettled.current = true;
    setForm((prev) => (Number(prev.plan_id) > 0 ? prev : { ...prev, plan_id: currentPlanId }));
  }, [current?.plan_id, selectedPlanFromQuery]);

  useEffect(() => {
    const selectedPlan = plans.find((plan: any) => Number(plan.id) === Number(form.plan_id));

    if (!selectedPlan) {
      setForm((prev) => ({
        ...prev,
        amount: '',
      }));
      return;
    }

    const billingMonths = Math.max(1, Number(form.billing_months || 1));
    const planAmount = Number(selectedPlan.price || 0) * billingMonths;

    setForm((prev) => {
      const nextAmount = planAmount.toFixed(2);
      if (prev.amount === nextAmount) {
        return prev;
      }

      return {
        ...prev,
        amount: nextAmount,
      };
    });
  }, [plans, form.plan_id, form.billing_months]);

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
    if (name === 'plan_id') planSettled.current = true;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Worked out from the plan and the billing months, so a zero means the plan
   * costs nothing -- there is no payment to report and nothing for an admin to
   * approve. Submit stays off until a plan with a price is chosen.
   */
  const payableAmount = Number(form.amount || 0);
  const canSubmit = payableAmount > 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.plan_id) return toast.error('Please select a plan.');
    if (!form.amount.trim()) return toast.error('Please enter the payment amount.');
    if (!canSubmit) return toast.error('Please select a paid plan. The amount cannot be zero.');
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

  const fieldBaseClassName =
    'w-full border border-stroke bg-transparent px-4 text-black outline-none focus:border-blue-400 dark:border-form-strokedark dark:bg-form-input dark:text-white';
  /**
   * The height is fixed rather than left to the padding: a select and an input
   * given the same padding do not come out the same height, and the date picker
   * sets its own h-10. Stating it once keeps the row level. The note is left out
   * -- it is sized by its rows.
   */
  const fieldClassName = `h-10 ${fieldBaseClassName}`;
  const textareaClassName = `py-2 ${fieldBaseClassName}`;
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
              readOnly
              className={fieldClassName}
            />
            {/* Submit is off while this is zero, and a dead button with no
                reason beside it is the thing people ring up about. */}
            {canSubmit ? null : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {Number(form.plan_id) > 0
                  ? 'This plan is free, so there is no payment to submit.'
                  : 'Select a plan to see the amount.'}
              </p>
            )}
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
            className={textareaClassName}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <ButtonLoading
            type="submit"
            buttonLoading={submittingPayment}
            disabled={!canSubmit || submittingPayment}
            title={canSubmit ? undefined : 'Select a paid plan to submit a payment'}
            label="Submit"
            className="w-full whitespace-nowrap p-2 text-center disabled:cursor-not-allowed disabled:opacity-50"
            icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={() => navigate(routes.subscription_pricing)}
            buttonLoading={false}
            label="Plans"
            className="w-full whitespace-nowrap p-2 text-center"
            icon={<FiList className="text-white text-lg ml-2 mr-2" />}
          />
          <ButtonLoading
            type="button"
            onClick={() => navigate(routes.subscription_billing_history)}
            buttonLoading={false}
            label="History"
            className="w-full whitespace-nowrap p-2 text-center"
            icon={<FiClock className="text-white text-lg ml-2 mr-2" />}
          />
          <button
            type="button"
            onClick={() => navigate(routes.my_subscription)}
            className="flex w-full items-center justify-center text-nowrap rounded bg-gray-700 p-2 text-white transition hover:bg-blue-700 dark:hover:bg-blue-700"
          >
            <FiArrowLeft className="mr-2" /> Back
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentSubmit;
