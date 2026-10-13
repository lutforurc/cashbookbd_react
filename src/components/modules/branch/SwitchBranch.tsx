import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiAlertCircle, FiGitBranch } from 'react-icons/fi';

import Breadcrumb from '../../Breadcrumbs/Breadcrumb';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL } from '../../../theme/fieldStyles';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';
import httpService from '../../services/httpService';
import {
  API_ALL_DDL_BRANCH_URL,
  API_USER_SWITCH_BRANCH_URL,
} from '../../services/apiRoutes';
import { extractApiErrorMessage } from '../user/userSlice';
import routes from '../../services/appRoutes';

/**
 * Move this login to another branch.
 *
 * Personal, like Change Password above it: no permission stands in front of it,
 * it writes the caller's own row, and there is nothing here another user could
 * see or change.
 *
 * ⚠️ THE PAGE ENDS IN A FULL RELOAD, not a `navigate()`. Every branch-scoped
 * thing on screen -- the dashboard's figures, the day book's date, the lists --
 * was fetched for the branch the books were in a moment ago, and a client-side
 * route change would keep showing it under the new branch's name.
 *
 * The list is `branch/ddl/all-branch`, which applies the same access rule the
 * rest of the app applies (CompanyRoleScope), so what is offered here is
 * exactly what the user may work in -- and the API checks the selection against
 * that rule again rather than trusting the list it just handed out.
 */
const SwitchBranch: React.FC = () => {
  const { me } = useSelector((state: any) => state.auth);

  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const currentBranchId = me?.branch_id != null ? String(me.branch_id) : '';

  useEffect(() => {
    let cancelled = false;

    httpService
      .get(API_ALL_DDL_BRANCH_URL)
      .then((res) => {
        if (cancelled) return;
        // ⚠️ Array.isArray, not `?? []`: a refusal answers with an object
        // (`data.data` is `[]` on the success path, but the shape is not the
        // same in every envelope) and mapping over an object throws.
        const list = res.data?.success ? res.data?.data?.data : null;
        setBranches(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setFormError('Could not load the branch list.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The branch the books are being written in now, preselected -- held in state
  // rather than read off `me` at render, so the box can be moved.
  useEffect(() => {
    if (currentBranchId) setSelected(currentBranchId);
  }, [currentBranchId]);

  const alreadyHere = selected !== '' && selected === currentBranchId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !selected || alreadyHere) return;

    setSaving(true);
    setFormError('');
    try {
      const { data } = await httpService.post(API_USER_SWITCH_BRANCH_URL, {
        branch_id: Number(selected),
      });

      if (!data?.success) {
        setFormError(extractApiErrorMessage(data, 'Could not switch branch.'));
        setSaving(false);
        return;
      }

      toast.success(data.message || 'Working branch changed.');
      window.location.href = routes.dashboard;
    } catch (err: any) {
      setFormError(
        extractApiErrorMessage(err?.response?.data, 'Could not switch branch.'),
      );
      setSaving(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Switch Branch" />
      <Breadcrumb pageName="Switch Branch" />

      <div className="mx-auto max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default"
        >
          <div className="flex items-center gap-4 border-b border-[rgb(var(--c-border))] px-6 py-5">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
              <FiGitBranch className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[rgb(var(--c-text))]">
                Switch Branch
              </h2>
              <p className="text-sm text-[rgb(var(--c-text-muted))]">
                Working in: {me?.branch || '—'}
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

            <div>
              <label
                htmlFor="branch_id"
                className={`${FIELD_LABEL} mb-1.5 block text-sm font-medium`}
              >
                Branch
              </label>

              {loading ? (
                <Loader />
              ) : (
                <BranchDropdown
                  id="branch_id"
                  name="branch_id"
                  value={selected}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setFormError('');
                    setSelected(e.target.value);
                  }}
                  branchDdl={branches}
                  className="w-full"
                />
              )}
            </div>

            {/* Nothing to save when the box already shows the branch the books
                are in, so the button says so rather than posting a no-op. The
                API refuses to write the same branch twice as well. */}
            {alreadyHere && (
              <p className="text-sm text-[rgb(var(--c-text-muted))]">
                This is already your working branch.
              </p>
            )}

            {!loading && branches.length <= 1 && (
              <p className="text-sm text-[rgb(var(--c-text-muted))]">
                You have access to one branch, so there is nothing to switch to.
              </p>
            )}

            <ButtonLoading
              type="submit"
              buttonLoading={saving}
              disabled={loading || saving || alreadyHere || !selected}
              label="Switch Branch"
              className="w-full justify-center"
              icon={<FiGitBranch className="text-lg ml-2 mr-2" />}
            />
          </div>
        </form>
      </div>
    </>
  );
};

export default SwitchBranch;
