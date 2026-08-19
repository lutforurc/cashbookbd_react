import React, { useEffect, useMemo, useState } from 'react';
import { FiEye, FiHome, FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import ROUTES from '../../services/appRoutes';
import InputElement from '../../utils/fields/InputElement';
import Link from '../../utils/others/Link';
import HelmetTitle from '../../utils/others/HelmetTitle';
import SmsTemplatePreviewModal from './SmsTemplatePreviewModal';
import {
  clearSmsTemplateFormState,
  clearSmsTemplatePreview,
  createSmsTemplate,
  fetchSmsTemplateById,
  initialTemplateFormValues,
  previewSmsTemplate,
  SmsTemplateFormValues,
  updateSmsTemplate,
} from './smsSlice';
import { FIELD_SELECT, FIELD_TEXTAREA } from '../../../theme/fieldStyles';
import { hasPermission } from '../../utils/permissionChecker';
import { Select, Textarea } from '../../utils/fields/FormControls';

interface SmsTemplateFormProps {
  mode: 'create' | 'edit';
}

const SmsTemplateForm: React.FC<SmsTemplateFormProps> = ({ mode }) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id: templateId = '' } = useParams();
  const smsState = useSelector((state: any) => state.sms);
  const settings = useSelector((state: any) => state.settings);
  // Reading a template and rewriting one are separate permissions. Somebody
  // sent this URL directly still sees what the message says -- the fields are
  // read-only and there is nothing to save.
  const canEditTemplate = hasPermission(settings?.data?.permissions, 'sms.template.edit');
  const [formValues, setFormValues] = useState<SmsTemplateFormValues>(initialTemplateFormValues);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    dispatch(clearSmsTemplateFormState());
    dispatch(clearSmsTemplatePreview());

    if (mode === 'edit' && templateId) {
      dispatch(fetchSmsTemplateById(templateId));
    }

    return () => {
      dispatch(clearSmsTemplateFormState());
      dispatch(clearSmsTemplatePreview());
    };
  }, [dispatch, mode, templateId]);

  useEffect(() => {
    if (mode !== 'edit' || !smsState?.currentTemplate) return;

    const template = smsState.currentTemplate;
    setFormValues({
      name: template?.name ?? '',
      slug: template?.slug ?? '',
      body: template?.body ?? '',
      description: template?.description ?? '',
      status:
        template?.status === 'inactive' ||
        template?.status === 0 ||
        template?.status === false ||
        template?.is_active === 0 ||
        template?.is_active === false
          ? 'inactive'
          : 'active',
      sample_data: template?.sample_data ?? '',
    });
  }, [mode, smsState?.currentTemplate]);

  useEffect(() => {
    if (!smsState?.saveSuccessMessage) return;
    toast.success(smsState.saveSuccessMessage);
    dispatch(clearSmsTemplateFormState());
    navigate(ROUTES.sms_template_list);
  }, [dispatch, navigate, smsState?.saveSuccessMessage]);

  useEffect(() => {
    if (smsState?.saveError) {
      toast.error(smsState.saveError);
    }
  }, [smsState?.saveError]);

  useEffect(() => {
    if (smsState?.templateDetailsError) {
      toast.error(smsState.templateDetailsError);
    }
  }, [smsState?.templateDetailsError]);

  const fieldError = (field: keyof SmsTemplateFormValues) => smsState?.fieldErrors?.[field]?.[0];

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof SmsTemplateFormValues, string>> = {};

    if (!formValues.name.trim()) errors.name = 'Template name is required.';
    if (!formValues.slug.trim()) errors.slug = 'Template key is required.';
    if (!formValues.body.trim()) errors.body = 'Template message is required.';

    if (formValues.sample_data.trim()) {
      try {
        JSON.parse(formValues.sample_data);
      } catch {
        errors.sample_data = 'Sample data must be valid JSON.';
      }
    }

    return errors;
  }, [formValues]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstValidationError = Object.values(validationErrors)[0];
    if (firstValidationError) {
      toast.error(firstValidationError);
      return;
    }

    if (mode === 'edit') {
      await dispatch(updateSmsTemplate({ id: templateId, values: formValues }));
      return;
    }

    await dispatch(createSmsTemplate(formValues));
  };

  const handlePreview = async () => {
    const firstValidationError = Object.values(validationErrors)[0];
    if (firstValidationError) {
      toast.error(firstValidationError);
      return;
    }

    setPreviewOpen(true);
    await dispatch(
      previewSmsTemplate({
        id: mode === 'edit' ? templateId : undefined,
        ...formValues,
      }),
    );
  };

  return (
    <>
      <HelmetTitle title={mode === 'edit' ? 'Edit SMS Template' : 'Create SMS Template'} />

      {smsState?.templateDetailsLoading ? <Loader /> : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-sm border border-stroke bg-white p-5 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <InputElement
                id="name"
                name="name"
                label="Template Name"
                placeholder="Invoice due reminder"
                value={formValues.name}
                onChange={handleChange}
              />
              {(validationErrors.name || fieldError('name')) && (
                <div className="mt-1 text-sm text-rose-500">
                  {validationErrors.name || fieldError('name')}
                </div>
              )}
            </div>

            <div>
              <InputElement
                id="slug"
                name="slug"
                label="Template Key"
                placeholder="invoice_due_reminder"
                value={formValues.slug}
                onChange={handleChange}
              />
              {(validationErrors.slug || fieldError('slug')) && (
                <div className="mt-1 text-sm text-rose-500">
                  {validationErrors.slug || fieldError('slug')}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="body" className="mb-1 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Message Body
              </label>
              <Textarea
                id="body"
                name="body"
                rows={6}
                value={formValues.body}
                onChange={handleChange}
                placeholder="Dear {{customer_name}}, your payment of {{amount}} is due on {{due_date}}."
                className={`${FIELD_TEXTAREA} w-full px-3 py-2`}
              />
              {(validationErrors.body || fieldError('body')) && (
                <div className="mt-1 text-sm text-rose-500">
                  {validationErrors.body || fieldError('body')}
                </div>
              )}
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Write a variable as <code>{'{{name}}'}</code>. Wrap a part in{' '}
                <code>{'[[ ]]'}</code> to have it dropped whole when its variable is empty &mdash;{' '}
                <code>{'[[Truck# {{truck_no}} ]]'}</code> leaves no bare &ldquo;Truck#&rdquo; behind
                on a delivery that has no truck, and keeps the message inside one SMS.
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="mb-1 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                value={formValues.description}
                onChange={handleChange}
                placeholder="Optional notes for admins."
                className={`${FIELD_TEXTAREA} w-full px-3 py-2`}
              />
              {fieldError('description') && (
                <div className="mt-1 text-sm text-rose-500">{fieldError('description')}</div>
              )}
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Status
              </label>
              <Select
                id="status"
                name="status"
                value={formValues.status}
                onChange={handleChange}
                className={`${FIELD_SELECT} w-full px-3 py-2`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              {fieldError('status') && (
                <div className="mt-1 text-sm text-rose-500">{fieldError('status')}</div>
              )}
            </div>

            <div>
              <label htmlFor="sample_data" className="mb-1 block text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                Preview Variables JSON
              </label>
              <Textarea
                id="sample_data"
                name="sample_data"
                rows={4}
                value={formValues.sample_data}
                onChange={handleChange}
                placeholder={`{\n  "customer_name": "Rahim",\n  "amount": "5000"\n}`}
                className={`${FIELD_TEXTAREA} w-full px-3 py-2 font-mono text-sm`}
              />
              {(validationErrors.sample_data || fieldError('sample_data')) && (
                <div className="mt-1 text-sm text-rose-500">
                  {validationErrors.sample_data || fieldError('sample_data')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <ButtonLoading
            type="button"
            onClick={handlePreview}
            buttonLoading={smsState?.preview?.loading}
            disabled={smsState?.preview?.loading}
            label="Preview"
            className="whitespace-nowrap"
            icon={<FiEye className="text-lg" />}
          />

          {canEditTemplate ? (
            <ButtonLoading
              type="submit"
              buttonLoading={smsState?.saveLoading}
              disabled={smsState?.saveLoading}
              label={mode === 'edit' ? 'Update' : 'Save'}
              className="w-30 whitespace-nowrap"
              icon={<FiSave className="text-lg" />}
            />
          ) : null}

          <Link to={ROUTES.sms_template_list} className="h-10 whitespace-nowrap">
            <FiHome className="mr-2 text-white text-lg" />
            Back to List
          </Link>
        </div>
      </form>

      <SmsTemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        loading={smsState?.preview?.loading}
        error={smsState?.preview?.error}
        content={smsState?.preview?.content}
        title="Template Preview"
      />
    </>
  );
};

export default SmsTemplateForm;
