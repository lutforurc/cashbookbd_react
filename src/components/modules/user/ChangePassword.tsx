import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiLock } from 'react-icons/fi';
import Breadcrumb from '../../Breadcrumbs/Breadcrumb';
import HelmetTitle from '../../utils/others/HelmetTitle';
import PasswordElement from '../../utils/fields/PasswordElement';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import httpService from '../../services/httpService';
import { API_USER_CHANGE_PASSWORD_URL } from '../../services/apiRoutes';
import { extractApiErrorMessage } from './userSlice';

// The API's own rule (min:8); the check here only saves the round trip.
const PASSWORD_MIN_LENGTH = 8;

const EMPTY = {
  current_password: '',
  password: '',
  password_confirmation: '',
};

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
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Said here, before the round trip, in the words the API would use.
    if (!form.current_password) {
      toast.error('Please enter your current password.');
      return;
    }
    if (form.password.length < PASSWORD_MIN_LENGTH) {
      toast.error(`New password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (form.password === form.current_password) {
      toast.error('New password must be different from the current one.');
      return;
    }
    if (form.password !== form.password_confirmation) {
      toast.error('New password and Confirm Password do not match.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await httpService.post(API_USER_CHANGE_PASSWORD_URL, form);
      if (data?.success) {
        toast.success(data.message || 'Password changed successfully.');
        setForm(EMPTY);
      } else {
        toast.error(extractApiErrorMessage(data, 'Password change failed.'));
      }
    } catch (err: any) {
      toast.error(extractApiErrorMessage(err?.response?.data, 'Password change failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Change Password" />
      <Breadcrumb pageName="Change Password" />

      <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-5 pb-5 pt-6 shadow-default">
        <div className="mb-4 flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary dark:bg-primary/20">
            <FiLock className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Change your password
            </h3>
            <p className="text-sm text-[rgb(var(--c-text-muted))]">
              Enter your current password, then the new one twice. At least {PASSWORD_MIN_LENGTH} characters.
              Your other signed-in devices will be signed out.
            </p>
          </div>
        </div>

        {/* A real form, so Enter submits and the browser's password manager
            sees a current-password / new-password pair and offers to update. */}
        <form onSubmit={handleSubmit} autoComplete="on">
          <div className="grid max-w-xl grid-cols-1 gap-4">
            <PasswordElement
              id="current_password"
              name="current_password"
              label="Current Password"
              placeholder="Enter your current password"
              value={form.current_password}
              onChange={handleChange}
              className=""
            />
            <PasswordElement
              id="password"
              name="password"
              label="New Password"
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              value={form.password}
              onChange={handleChange}
              className=""
            />
            <PasswordElement
              id="password_confirmation"
              name="password_confirmation"
              label="Confirm New Password"
              placeholder="Enter the new password again"
              value={form.password_confirmation}
              onChange={handleChange}
              className=""
            />

            <div>
              <ButtonLoading
                type="submit"
                buttonLoading={saving}
                label="Change Password"
                icon={<FiCheckSquare />}
                className="px-6"
              />
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChangePassword;
