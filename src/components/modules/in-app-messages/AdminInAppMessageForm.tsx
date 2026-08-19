import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiUpload } from 'react-icons/fi';
import { toast } from 'react-toastify';

import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';
import InAppMessageView from './InAppMessageView';
import {
  getAdminInAppMessage,
  saveAdminInAppMessage,
  uploadInAppMessageImage,
} from './inAppMessageService';
import { InAppMessage } from './types';
import { FIELD_BASE, FIELD_CHECKBOX } from '../../../theme/fieldStyles';
import { Input, Textarea } from '../../utils/fields/FormControls';

/**
 * The schedule fields are held as "YYYY-MM-DDTHH:mm" — what the API is sent
 * and what the browser's datetime input used to produce. These two convert
 * between that and the Date the calendar works in.
 *
 * Both read and write the local clock. toISOString() would shift a campaign
 * six hours in this timezone: a 9am start would go out saved as 3am.
 */
const parseLocalDateTime = (value: string): Date | null => {
  if (!value) return null;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLocalDateTime = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const LAYOUTS = [
  { id: 'MODAL', name: 'Modal (centre pop-up)' },
  { id: 'CARD', name: 'Card (image beside text)' },
  { id: 'BANNER_TOP', name: 'Banner — top' },
  { id: 'BANNER_BOTTOM', name: 'Banner — bottom' },
  { id: 'IMAGE_ONLY', name: 'Image only' },
];

const TRIGGERS = [
  { id: 'APP_OPEN', name: 'App open' },
  { id: 'LOGIN', name: 'Login' },
];

const AUDIENCES = [
  { id: 'global', name: 'Everyone' },
  { id: 'company', name: 'One company' },
  { id: 'branch', name: 'One branch' },
  { id: 'role', name: 'One role' },
  { id: 'user', name: 'One user' },
];

const PLATFORMS = [
  { id: 'all', name: 'All platforms' },
  { id: 'web', name: 'Web only' },
  { id: 'android', name: 'Android only' },
  { id: 'ios', name: 'iOS only' },
];

const STATUSES = [
  { id: 'active', name: 'Active' },
  { id: 'paused', name: 'Paused' },
  { id: 'draft', name: 'Draft' },
];

const emptyForm = {
  title: '',
  body: '',
  image_url: '',
  layout: 'MODAL',
  trigger_event: 'APP_OPEN',
  primary_label: '',
  primary_action: '',
  secondary_label: '',
  secondary_action: '',
  bg_color: '',
  text_color: '',
  button_color: '',
  audience_type: 'global',
  company_id: '',
  branch_id: '',
  role_id: '',
  user_id: '',
  platform: 'all',
  min_app_version: '',
  max_app_version: '',
  status: 'active',
  priority: '0',
  starts_at: '',
  ends_at: '',
  display_limit: '',
  min_interval_hours: '0',
  require_ack: false,
};

/** Which extra id the chosen audience needs; global needs none. */
const audienceField: Record<string, string> = {
  company: 'company_id',
  branch: 'branch_id',
  role: 'role_id',
  user: 'user_id',
};

const AdminInAppMessageForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<any>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    getAdminInAppMessage(id as string)
      .then((row) => {
        if (!row) return;
        setForm({
          ...emptyForm,
          ...Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, value ?? '']),
          ),
          require_ack: Boolean(row.require_ack),
          // The datetime-local input needs "YYYY-MM-DDTHH:mm".
          starts_at: row.starts_at ? String(row.starts_at).replace(' ', 'T').slice(0, 16) : '',
          ends_at: row.ends_at ? String(row.ends_at).replace(' ', 'T').slice(0, 16) : '',
        });
      })
      .catch((error: any) =>
        toast.info(error?.response?.data?.message || 'Failed to load campaign'),
      )
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const set = (key: string, value: any) =>
    setForm((current: any) => ({ ...current, [key]: value }));

  const previewMessage = useMemo<InAppMessage>(
    () => ({
      id: 0,
      title: form.title || 'Message title',
      body: form.body || 'Message body shows here.',
      image_url: form.image_url || null,
      layout: form.layout,
      trigger_event: form.trigger_event,
      primary_label: form.primary_label || null,
      primary_action: form.primary_action || null,
      secondary_label: form.secondary_label || null,
      secondary_action: form.secondary_action || null,
      bg_color: form.bg_color || null,
      text_color: form.text_color || null,
      button_color: form.button_color || null,
      priority: Number(form.priority || 0),
      require_ack: Boolean(form.require_ack),
      display_limit: form.display_limit ? Number(form.display_limit) : null,
      min_interval_hours: Number(form.min_interval_hours || 0),
      shown_count: 0,
    }),
    [form],
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadInAppMessageImage(file);
      set('image_url', url);
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.info('Title is required');
      return;
    }

    if (form.layout === 'IMAGE_ONLY' && !form.image_url) {
      toast.info('An image is required for the Image only layout');
      return;
    }

    const needed = audienceField[form.audience_type];
    if (needed && !form[needed]) {
      toast.info(`Please provide the ${needed.replace('_', ' ')}`);
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        ...form,
        priority: Number(form.priority || 0),
        min_interval_hours: Number(form.min_interval_hours || 0),
        display_limit: form.display_limit ? Number(form.display_limit) : null,
        require_ack: form.require_ack ? 1 : 0,
      };

      // Send only the id the audience actually uses; blanks would fail validation.
      ['company_id', 'branch_id', 'role_id', 'user_id'].forEach((key) => {
        payload[key] = key === needed ? Number(form[key]) : null;
      });
      ['starts_at', 'ends_at', 'image_url', 'body', 'primary_label', 'primary_action',
        'secondary_label', 'secondary_action', 'bg_color', 'text_color', 'button_color',
        'min_app_version', 'max_app_version'].forEach((key) => {
        if (!payload[key]) payload[key] = null;
      });

      const response = await saveAdminInAppMessage(payload, isEdit ? id : undefined);
      toast.success(response?.message || 'Campaign saved successfully');
      navigate(routes.admin_in_app_messages);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to save campaign',
      );
    } finally {
      setSaving(false);
    }
  };

  const needed = audienceField[form.audience_type];

  return (
    <>
      <HelmetTitle title={isEdit ? 'Edit In-App Message' : 'New In-App Message'} />
      {loading ? <Loader /> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ---------------- FORM ---------------- */}
        <div className="rounded border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <InputElement
                id="title"
                name="title"
                label="Title"
                placeholder="Eid greetings / new feature announcement"
                className="h-8.5"
                value={form.title}
                onChange={(e: any) => set('title', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm">Body</label>
              <Textarea
                rows={3}
                value={form.body}
                onChange={(e) => set('body', e.target.value)}
                className="w-full rounded-xs border border-gray-300 bg-white p-2 text-sm outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white"
                placeholder="What you want the user to read"
              />
            </div>

            <DropdownCommon
              id="layout"
              name="layout"
              label="Layout"
              value={form.layout}
              onChange={(e) => set('layout', e.target.value)}
              className="h-8.5 bg-transparent"
              data={LAYOUTS}
            />

            <DropdownCommon
              id="trigger_event"
              name="trigger_event"
              label="Trigger"
              value={form.trigger_event}
              onChange={(e) => set('trigger_event', e.target.value)}
              className="h-8.5 bg-transparent"
              data={TRIGGERS}
            />

            <div className="md:col-span-2">
              <label className="block text-sm">Image</label>
              <div className="flex items-center gap-2">
                <Input
                  className={`${FIELD_BASE} h-8.5 w-full p-1 text-sm`}
                  placeholder="Paste an image URL, or upload"
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                />
                <label className="flex h-8.5 shrink-0 cursor-pointer items-center gap-1 rounded bg-primary px-3 text-sm font-semibold text-white">
                  <FiUpload />
                  {uploading ? 'Uploading…' : 'Upload'}
                  <Input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                </label>
              </div>
            </div>

            <InputElement
              id="primary_label"
              name="primary_label"
              label="Primary button label"
              className="h-8.5"
              value={form.primary_label}
              onChange={(e: any) => set('primary_label', e.target.value)}
            />
            <InputElement
              id="primary_action"
              name="primary_action"
              label="Primary action (route or URL)"
              placeholder="/dashboard or https://…"
              className="h-8.5"
              value={form.primary_action}
              onChange={(e: any) => set('primary_action', e.target.value)}
            />
            <InputElement
              id="secondary_label"
              name="secondary_label"
              label="Secondary button label"
              className="h-8.5"
              value={form.secondary_label}
              onChange={(e: any) => set('secondary_label', e.target.value)}
            />
            <InputElement
              id="secondary_action"
              name="secondary_action"
              label="Secondary action"
              className="h-8.5"
              value={form.secondary_action}
              onChange={(e: any) => set('secondary_action', e.target.value)}
            />

            <div>
              <label className="block text-sm">Background colour</label>
              <Input
                type="color"
                value={form.bg_color || 'rgb(var(--c-white))'}
                onChange={(e) => set('bg_color', e.target.value)}
                className="h-8.5 w-full rounded-xs border border-gray-300 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm">Text colour</label>
              <Input
                type="color"
                value={form.text_color || 'rgb(var(--c-gray-900))'}
                onChange={(e) => set('text_color', e.target.value)}
                className="h-8.5 w-full rounded-xs border border-gray-300 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm">Button colour</label>
              <Input
                type="color"
                value={form.button_color || 'rgb(var(--c-primary))'}
                onChange={(e) => set('button_color', e.target.value)}
                className="h-8.5 w-full rounded-xs border border-gray-300 dark:border-gray-600"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => {
                  set('bg_color', '');
                  set('text_color', '');
                  set('button_color', '');
                }}
                className="h-8.5 w-full rounded border border-stroke text-sm dark:border-strokedark"
              >
                Use app theme colours
              </Button>
            </div>

            <DropdownCommon
              id="audience_type"
              name="audience_type"
              label="Audience"
              value={form.audience_type}
              onChange={(e) => set('audience_type', e.target.value)}
              className="h-8.5 bg-transparent"
              data={AUDIENCES}
            />
            {needed ? (
              <InputElement
                id={needed}
                name={needed}
                label={needed.replace('_', ' ')}
                type="number"
                className="h-8.5"
                value={form[needed]}
                onChange={(e: any) => set(needed, e.target.value)}
              />
            ) : (
              <div />
            )}

            <DropdownCommon
              id="platform"
              name="platform"
              label="Platform"
              value={form.platform}
              onChange={(e) => set('platform', e.target.value)}
              className="h-8.5 bg-transparent"
              data={PLATFORMS}
            />
            <DropdownCommon
              id="status"
              name="status"
              label="Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="h-8.5 bg-transparent"
              data={STATUSES}
            />

            {/* The app's own calendar rather than the browser's, so these read
                like every other date on the screen. The stored value keeps its
                YYYY-MM-DDTHH:mm shape, which is what the API is given. */}
            <InputDatePicker
              label="Starts at"
              showTime
              placeholder="dd/mm/yyyy hh:mm"
              className="h-8.5 w-full text-sm"
              selectedDate={parseLocalDateTime(form.starts_at)}
              setSelectedDate={(date) => set('starts_at', formatLocalDateTime(date))}
              setCurrentDate={() => undefined}
            />
            <InputDatePicker
              label="Ends at"
              showTime
              placeholder="dd/mm/yyyy hh:mm"
              className="h-8.5 w-full text-sm"
              selectedDate={parseLocalDateTime(form.ends_at)}
              setSelectedDate={(date) => set('ends_at', formatLocalDateTime(date))}
              setCurrentDate={() => undefined}
            />

            <InputElement
              id="display_limit"
              name="display_limit"
              label="Show how many times (blank = unlimited)"
              type="number"
              className="h-8.5"
              value={form.display_limit}
              onChange={(e: any) => set('display_limit', e.target.value)}
            />
            <InputElement
              id="min_interval_hours"
              name="min_interval_hours"
              label="Gap between two showings (hours)"
              type="number"
              className="h-8.5"
              value={form.min_interval_hours}
              onChange={(e: any) => set('min_interval_hours', e.target.value)}
            />
            <InputElement
              id="priority"
              name="priority"
              label="Priority (higher shows first)"
              type="number"
              className="h-8.5"
              value={form.priority}
              onChange={(e: any) => set('priority', e.target.value)}
            />
            <label className="flex items-end gap-2 pb-1 text-sm">
              <Input
                type="checkbox"
                checked={form.require_ack}
                onChange={(e) => set('require_ack', e.target.checked)}
                className={FIELD_CHECKBOX}
              />
              Must acknowledge (no close button)
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <ButtonLoading
              onClick={handleSave}
              buttonLoading={saving}
              label={isEdit ? 'Update' : 'Save'}
              className="mr-0 h-8.5 whitespace-nowrap text-center"
              icon={<FiSave className="ml-2 mr-2 text-lg" />}
            />
            <ButtonLoading
              onClick={() => navigate(routes.admin_in_app_messages)}
              buttonLoading={false}
              label="Back"
              className="mr-0 h-8.5 whitespace-nowrap text-center"
              icon={<FiArrowLeft className="ml-2 mr-2 text-lg" />}
            />
          </div>
        </div>

        {/* ---------------- LIVE PREVIEW ---------------- */}
        <div className="rounded border border-stroke bg-gray-100 p-4 dark:border-strokedark dark:bg-meta-4">
          <div className="mb-2 text-sm font-semibold">Preview</div>
          <div className="rounded bg-white p-3 dark:bg-boxdark">
            <InAppMessageView
              preview
              message={previewMessage}
              onPrimary={() => {}}
              onSecondary={() => {}}
              onClose={() => {}}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Banners stretch full width on the real screen; here they are shown inline.
          </p>
        </div>
      </div>
    </>
  );
};

export default AdminInAppMessageForm;
