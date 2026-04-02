import React, { useEffect, useMemo, useState } from 'react';
import { FiArrowLeft, FiRefreshCcw, FiSave } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';
import {
  clearSubscriptionFeedback,
  createSubscriptionPlan,
  fetchAdminPlan,
  resetEditingPlan,
  updateSubscriptionPlan,
} from './subscriptionSlice';

type PlanFormState = {
  name: string;
  slug: string;
  billing_interval: string;
  price: string;
  currency: string;
  trial_days: string;
  max_users: string;
  max_branches: string;
  max_transactions_per_month: string;
  sort_order: string;
  is_active: string;
  description: string;
};

const initialForm: PlanFormState = {
  name: '',
  slug: '',
  billing_interval: 'monthly',
  price: '',
  currency: 'BDT',
  trial_days: '0',
  max_users: '',
  max_branches: '',
  max_transactions_per_month: '',
  sort_order: '0',
  is_active: '1',
  description: '',
};

const SubscriptionPlanForm: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { editingPlan, loadingPlanDetails, savingPlan, error } = useSelector((state: any) => state.subscription);
  const [form, setForm] = useState<PlanFormState>(initialForm);

  useEffect(() => {
    dispatch(clearSubscriptionFeedback());

    if (id) {
      dispatch(fetchAdminPlan(Number(id)));
    } else {
      dispatch(resetEditingPlan());
    }

    return () => {
      dispatch(resetEditingPlan());
      dispatch(clearSubscriptionFeedback());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (!editingPlan || !isEdit) return;

    setForm({
      name: editingPlan.name || '',
      slug: editingPlan.slug || '',
      billing_interval: editingPlan.billing_interval || 'monthly',
      price: editingPlan.price !== undefined ? String(editingPlan.price) : '',
      currency: editingPlan.currency || 'BDT',
      trial_days: String(editingPlan.trial_days ?? 0),
      max_users: editingPlan.max_users ?? '',
      max_branches: editingPlan.max_branches ?? '',
      max_transactions_per_month: editingPlan.max_transactions_per_month ?? '',
      sort_order: String(editingPlan.sort_order ?? 0),
      is_active: editingPlan.is_active ? '1' : '0',
      description: editingPlan.description || '',
    } as PlanFormState);
  }, [editingPlan, isEdit]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const billingOptions = useMemo(
    () => [
      { id: 'monthly', name: 'Monthly' },
      { id: 'quarterly', name: 'Quarterly' },
      { id: 'half_yearly', name: 'Half Yearly' },
      { id: 'yearly', name: 'Yearly' },
    ],
    [],
  );

  const activeOptions = useMemo(
    () => [
      { id: '1', name: 'Active' },
      { id: '0', name: 'Inactive' },
    ],
    [],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    if (isEdit && editingPlan) {
      setForm({
        name: editingPlan.name || '',
        slug: editingPlan.slug || '',
        billing_interval: editingPlan.billing_interval || 'monthly',
        price: String(editingPlan.price ?? ''),
        currency: editingPlan.currency || 'BDT',
        trial_days: String(editingPlan.trial_days ?? 0),
        max_users: editingPlan.max_users ?? '',
        max_branches: editingPlan.max_branches ?? '',
        max_transactions_per_month: editingPlan.max_transactions_per_month ?? '',
        sort_order: String(editingPlan.sort_order ?? 0),
        is_active: editingPlan.is_active ? '1' : '0',
        description: editingPlan.description || '',
      } as PlanFormState);
      return;
    }

    setForm(initialForm);
  };

  const toNullableNumber = (value: string) => {
    if (value === '') return null;
    return Number(value);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      billing_interval: form.billing_interval,
      price: Number(form.price || 0),
      currency: form.currency.trim() || 'BDT',
      trial_days: Number(form.trial_days || 0),
      max_users: toNullableNumber(form.max_users),
      max_branches: toNullableNumber(form.max_branches),
      max_transactions_per_month: toNullableNumber(form.max_transactions_per_month),
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active === '1',
      description: form.description.trim() || undefined,
    };

    if (!payload.name) {
      toast.error('Plan name is required.');
      return;
    }

    if (!payload.price && payload.price !== 0) {
      toast.error('Plan price is required.');
      return;
    }

    const action = isEdit
      ? await dispatch(updateSubscriptionPlan({ id: Number(id), payload })).unwrap()
      : await dispatch(createSubscriptionPlan(payload)).unwrap();

    toast.success(action?.message || (isEdit ? 'Plan updated successfully.' : 'Plan created successfully.'));
    navigate(routes.subscription_plan_list);
  };

  return (
    <div className="space-y-4">
      <HelmetTitle title={isEdit ? 'Update Subscription Plan' : 'Entry Subscription Plan'} />

      <div className="rounded border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
          {isEdit ? 'Update Subscription Plan' : 'New Subscription Plan'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          আগের theme অনুযায়ী plan name, billing, quota, আর status এখান থেকে manage করুন।
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded border border-gray-400 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InputElement id="name" name="name" label="Plan Name" value={form.name} onChange={handleChange as any} />
          <InputElement id="slug" name="slug" label="Slug" value={form.slug} onChange={handleChange as any} />

          <DropdownCommon
            id="billing_interval"
            name="billing_interval"
            label="Billing Interval"
            value={form.billing_interval}
            onChange={handleChange as any}
            className="h-8.5 bg-transparent"
            data={billingOptions}
          />

          <DropdownCommon
            id="is_active"
            name="is_active"
            label="Status"
            value={form.is_active}
            onChange={handleChange as any}
            className="h-8.5 bg-transparent"
            data={activeOptions}
          />

          <InputElement
            id="price"
            name="price"
            label="Price"
            type="number"
            value={form.price}
            onChange={handleChange as any}
            inputMode="decimal"
          />
          <InputElement
            id="currency"
            name="currency"
            label="Currency"
            value={form.currency}
            onChange={handleChange as any}
          />
          <InputElement
            id="trial_days"
            name="trial_days"
            label="Trial Days"
            type="number"
            value={form.trial_days}
            onChange={handleChange as any}
            inputMode="numeric"
          />
          <InputElement
            id="sort_order"
            name="sort_order"
            label="Sort Order"
            type="number"
            value={form.sort_order}
            onChange={handleChange as any}
            inputMode="numeric"
          />

          <InputElement
            id="max_users"
            name="max_users"
            label="Max Users"
            type="number"
            value={form.max_users}
            onChange={handleChange as any}
            inputMode="numeric"
            placeholder="Blank = Unlimited"
          />
          <InputElement
            id="max_branches"
            name="max_branches"
            label="Max Branches"
            type="number"
            value={form.max_branches}
            onChange={handleChange as any}
            inputMode="numeric"
            placeholder="Blank = Unlimited"
          />
          <InputElement
            id="max_transactions_per_month"
            name="max_transactions_per_month"
            label="Max Transactions / Month"
            type="number"
            value={form.max_transactions_per_month}
            onChange={handleChange as any}
            inputMode="numeric"
            placeholder="Blank = Unlimited"
          />

          <div className="md:col-span-2 xl:col-span-4">
            <label className="mb-1 block text-sm text-gray-900 dark:text-white">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Optional plan details"
              className="w-full rounded-xs border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-transparent dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLoading
            type="submit"
            buttonLoading={savingPlan || loadingPlanDetails}
            disabled={savingPlan || loadingPlanDetails}
            label={isEdit ? 'Update' : 'Save'}
            className="h-10 px-5"
            icon={<FiSave className="text-lg" />}
          />
          <ButtonLoading
            type="button"
            onClick={() => resetForm()}
            label="Reset"
            className="h-10 px-5"
            icon={<FiRefreshCcw className="text-lg" />}
          />
          <Link
            to={routes.subscription_plan_list}
            className="inline-flex items-center justify-center gap-2 rounded bg-slate-600 px-4 text-sm font-medium text-white hover:bg-slate-500"
          >
            <FiArrowLeft />
            Back To List
          </Link>
        </div>
      </form>
    </div>
  );
};

export default SubscriptionPlanForm;
