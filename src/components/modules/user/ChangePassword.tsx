import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiCircle,
  FiEye,
  FiEyeOff,
  FiKey,
  FiLock,
  FiShield,
  FiSmartphone,
  FiXCircle,
} from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL, fieldClass } from '../../../theme/fieldStyles';
import httpService from '../../services/httpService';
import { API_USER_CHANGE_PASSWORD_URL } from '../../services/apiRoutes';
import { extractApiErrorMessage } from './userSlice';

// The API's own rule (min:8); the checks here only save the round trip.
const PASSWORD_MIN_LENGTH = 8;

const EMPTY = {
  current_password: '',
  password: '',
  password_confirmation: '',
};

type FieldName = keyof typeof EMPTY;

/**
 * How strong the new password is, 0-4, from what it is made of. Not a gate --
 * the API only asks for eight characters -- but a nudge: a bar that stays red
 * says more than a rule written under the box.
 */
const strengthOf = (value: string) => {
  if (!value) return 0;
  let score = 0;
  if (value.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH = [
  { label: 'Too short', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Weak', bar: 'bg-danger', text: 'text-danger' },
  { label: 'Fair', bar: 'bg-warning', text: 'text-warning' },
  { label: 'Good', bar: 'bg-primary', text: 'text-primary' },
  { label: 'Strong', bar: 'bg-success', text: 'text-success' },
];

/**
 * The signed-in user's own password. Personal, like My Devices: no permission
 * stands in front of it, and nothing here reaches another account -- resetting
 * somebody else's is the User Edit screen's job.
 *
 * The current password is asked for and checked by the API before the new one
 * is written, so a session left open on a shared machine cannot be used to
 * lock the owner out. On success every other device is signed out; this one
 * stays, so the change does not end with the login screen.
 */
const ChangePassword: React.FC = () => {
  const [form, setForm] = useState(EMPTY);
  const [shown, setShown] = useState<Record<FieldName, boolean>>({
    current_password: false,
    password: false,
    password_confirmation: false,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // The three rules the API will apply, answered live so the button only
  // lights up once a submit would go through.
  const checks = useMemo(
    () => ({
      length: form.password.length >= PASSWORD_MIN_LENGTH,
      different: form.password.length > 0 && form.password !== form.current_password,
      match: form.password.length > 0 && form.password === form.password_confirmation,
    }),
    [form],
  );
  const canSubmit =
    form.current_password.length > 0 && checks.length && checks.different && checks.match;

  const strength = strengthOf(form.password);
  const strengthMeta = STRENGTH[strength];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormError('');
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleShown = (name: FieldName) =>
    setShown((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;

    setSaving(true);
    setFormError('');
    try {
      const { data } = await httpService.post(API_USER_CHANGE_PASSWORD_URL, form);
      if (data?.success) {
        toast.success(data.message || 'Password changed successfully.');
        setForm(EMPTY);
      } else {
        setFormError(extractApiErrorMessage(data, 'Password change failed.'));
      }
    } catch (err: any) {
      setFormError(extractApiErrorMessage(err?.response?.data, 'Password change failed.'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * One password box: a lock on the left, an eye on the right. Built here
   * rather than on PasswordElement because that one has no room for either,
   * and a password box without a way to see what was typed is where most
   * "does not match" errors come from.
   */
  const passwordField = (
    name: FieldName,
    label: string,
    placeholder: string,
    autoComplete: 'current-password' | 'new-password',
  ) => (
    <div>
      <label htmlFor={name} className={`${FIELD_LABEL} mb-1.5 block text-sm font-medium`}>
        {label}
      </label>
      <div className="relative">
        <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          id={name}
          name={name}
          type={shown[name] ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          className={fieldClass(undefined, 'w-full pl-9 pr-10')}
        />
        <Button
          type="button"
          onClick={() => toggleShown(name)}
          aria-label={shown[name] ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-primary"
        >
          {shown[name] ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  /**
   * One requirement, in one of three states. Grey until there is something
   * to judge -- a page that opens with three red crosses is scolding someone
   * who has not typed yet. Then green when met, red when not.
   */
  const check = (ok: boolean, judged: boolean, text: string) => {
    const state = ok ? 'ok' : judged ? 'fail' : 'idle';
    const tone = {
      ok: 'text-success',
      fail: 'text-danger',
      idle: 'text-[rgb(var(--c-text-muted))]',
    }[state];
    const Icon = { ok: FiCheckCircle, fail: FiXCircle, idle: FiCircle }[state];

    return (
      <li className={`flex items-center gap-2.5 text-sm ${tone}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span>{text}</span>
      </li>
    );
  };

  // Length and difference are judged as soon as a new password is typed; the
  // match only once the confirmation box has something in it, or it would go
  // red the moment the first box did.
  const typedNew = form.password.length > 0;
  const typedConfirm = form.password_confirmation.length > 0;

  return (
    <>
      <HelmetTitle title="Change Password" />

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* The form. A real one, so Enter submits and the browser's password
              manager sees a current-password / new-password pair and offers
              to update what it has saved. */}
          <form
            onSubmit={handleSubmit}
            autoComplete="on"
            className="rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default"
          >
            <div className="flex items-center gap-4 border-b border-[rgb(var(--c-border))] px-6 py-5">
              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                <FiKey className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-[rgb(var(--c-text))]">Change Password</h2>
                <p className="text-sm text-[rgb(var(--c-text-muted))]">
                  Confirm who you are with your current password, then choose a new one.
                </p>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6">
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
                >
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {passwordField(
                'current_password',
                'Current Password',
                'Enter your current password',
                'current-password',
              )}

              {/* A rule between what is being proven and what is being set. */}
              <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-[rgb(var(--c-text-muted))]">
                <span className="h-px flex-1 bg-[rgb(var(--c-border))]" />
                New password
                <span className="h-px flex-1 bg-[rgb(var(--c-border))]" />
              </div>

              <div>
                {passwordField(
                  'password',
                  'New Password',
                  `At least ${PASSWORD_MIN_LENGTH} characters`,
                  'new-password',
                )}

                {/* Four segments that fill as the password gets harder to
                    guess. Empty box, empty bar -- no verdict on nothing. */}
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="flex flex-1 gap-1" aria-hidden="true">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          form.password && step <= Math.max(strength, 1)
                            ? strengthMeta.bar
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`w-16 text-right text-xs font-medium ${
                      form.password ? strengthMeta.text : 'text-transparent'
                    }`}
                  >
                    {form.password ? strengthMeta.label : '—'}
                  </span>
                </div>
              </div>

              {passwordField(
                'password_confirmation',
                'Confirm New Password',
                'Enter the new password again',
                'new-password',
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[rgb(var(--c-border))] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs text-[rgb(var(--c-text-muted))]">
                <FiSmartphone className="h-3.5 w-3.5 shrink-0" />
                Your other signed-in devices will be signed out.
              </p>
              <ButtonLoading
                type="submit"
                buttonLoading={saving}
                disabled={!canSubmit || saving}
                label="Update Password"
                icon={<FiCheck />}
                className="px-6"
              />
            </div>
          </form>

          {/* What the API will ask, answered as the user types -- so a refusal
              is never the first time they hear of a rule. */}
          <aside className="h-fit rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-5 shadow-default">
            <div className="mb-4 flex items-center gap-2.5">
              <FiShield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-[rgb(var(--c-text))]">Requirements</h3>
            </div>
            <ul className="space-y-2.5">
              {check(checks.length, typedNew, `At least ${PASSWORD_MIN_LENGTH} characters`)}
              {check(checks.different, typedNew, 'Different from your current password')}
              {check(checks.match, typedConfirm, 'Both new password fields match')}
            </ul>

            <div className="mt-5 rounded-md bg-gray-50 p-3.5 text-xs leading-relaxed text-[rgb(var(--c-text-muted))] dark:bg-white/5">
              <p className="mb-1 font-medium text-[rgb(var(--c-text))]">Tips</p>
              <p>
                Longer is stronger. Mix letters, numbers and symbols, and avoid your name,
                phone number or anything you use elsewhere.
              </p>
              <p className="mt-2">
                Forgotten your current password? Sign out and use <span className="font-medium">Forgot Password</span> on
                the login screen.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};

export default ChangePassword;
