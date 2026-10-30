import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import httpService from '../../services/httpService';
import { API_ACCOUNT_DELETION_ADMIN_LIST_URL } from '../../services/apiRoutes';

/*
 * One deletion request: verify, review, confirm, process.
 *
 * ⚠️ The two things this screen refuses to do casually:
 *   - it shows the COMPANY and its scope before the final confirmation, and
 *     the reviewer echoes the company id, so "delete this company" is a
 *     decision about a named company, not a button pressed blind;
 *   - nothing here marks a request `completed` -- only the API does, and only
 *     once the deletion has actually finished.
 */

const AccountDeletionDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState('document_check');
  const [declineReason, setDeclineReason] = useState('');
  const [confirmCompany, setConfirmCompany] = useState(false);

  const base = `${API_ACCOUNT_DELETION_ADMIN_LIST_URL}/${id}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpService.get(base);
      setState(res.data?.data?.data);
    } catch {
      toast.error('Could not load the request.');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (path: string, body: any, okMessage: string) => {
    setBusy(true);
    try {
      const res = await httpService.post(`${base}/${path}`, body);
      if (res.data?.success === false) {
        toast.error(res.data?.error?.message || res.data?.message || 'The action was refused.');
        return;
      }
      toast.success(okMessage);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'The action failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-[rgb(var(--c-text))]">Loading…</div>;
  if (!state?.request) return <div className="p-6 text-sm text-[rgb(var(--c-text))]">Request not found.</div>;

  const r = state.request;
  const company = state.company;
  const isCompany = r.request_type === 'company';
  const canProcess = isCompany
    ? r.status === 'awaiting_final_confirmation'
    : ['under_review', 'awaiting_final_confirmation'].includes(r.status);

  const box = 'rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-5 shadow-default';
  const field = 'w-full rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2 text-sm';

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/admin/account-deletions')} className="text-sm text-primary">
        ← Back to requests
      </button>

      <div className={box}>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto text-lg font-semibold text-[rgb(var(--c-text))]">{r.reference_no}</h2>
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium capitalize text-primary">
            {r.request_type}
          </span>
          <span className="rounded-full bg-meta-4/20 px-3 py-1 text-xs font-medium text-[rgb(var(--c-text))]">
            {String(r.status).replace(/_/g, ' ')}
          </span>
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm text-[rgb(var(--c-text))] sm:grid-cols-2">
          <div><dt className="text-xs text-[rgb(var(--c-text-muted))]">Requester</dt><dd>{r.full_name}</dd></div>
          <div><dt className="text-xs text-[rgb(var(--c-text-muted))]">Email</dt><dd>{r.email || '—'}</dd></div>
          <div><dt className="text-xs text-[rgb(var(--c-text-muted))]">Mobile</dt><dd>{r.mobile || '—'}</dd></div>
          <div><dt className="text-xs text-[rgb(var(--c-text-muted))]">Submitted company name</dt><dd>{r.company_name || '—'}</dd></div>
          <div><dt className="text-xs text-[rgb(var(--c-text-muted))]">Verified</dt><dd>{r.verified_at ? `${r.verified_at} (${r.verification_method})` : 'Not yet'}</dd></div>
          <div><dt className="text-xs text-[rgb(var(--c-text-muted))]">Final confirmed</dt><dd>{r.final_confirmed_at || 'Not yet'}</dd></div>
          {r.reason ? <div className="sm:col-span-2"><dt className="text-xs text-[rgb(var(--c-text-muted))]">Reason</dt><dd>{r.reason}</dd></div> : null}
          {r.decline_reason ? <div className="sm:col-span-2"><dt className="text-xs text-[rgb(var(--c-text-muted))]">Decline reason</dt><dd>{r.decline_reason}</dd></div> : null}
          {r.failure_message ? <div className="sm:col-span-2"><dt className="text-xs text-[rgb(var(--c-text-muted))]">Failure</dt><dd className="text-danger">{r.failure_message}</dd></div> : null}
        </dl>
      </div>

      {isCompany && (
        <div className={`${box} border-meta-1`}>
          <h3 className="mb-2 text-base font-semibold text-[rgb(var(--c-text))]">Scope of this deletion</h3>
          {company ? (
            <p className="text-sm text-[rgb(var(--c-text))]">
              Company <strong>{company.name}</strong> (#{company.id}) — {company.branches} branch(es),{' '}
              {company.users} user(s). Deleting it removes every branch and all accounting, inventory, sales,
              purchase, real-estate, hotel, payroll and asset record it owns. Other companies are untouched.
            </p>
          ) : (
            <p className="text-sm text-danger">
              No company is attached yet. Verify identity and select the company before proceeding.
            </p>
          )}
          {r.confirmed_company_id ? (
            <p className="mt-2 text-xs text-[rgb(var(--c-text-muted))]">
              Company confirmed at final confirmation: #{r.confirmed_company_id}
            </p>
          ) : null}
        </div>
      )}

      {/* Verify */}
      <div className={box}>
        <h3 className="mb-3 text-base font-semibold text-[rgb(var(--c-text))]">Verify identity & authority</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-[rgb(var(--c-text-muted))]">Method</span>
            <select className={field} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="document_check">Document check</option>
              <option value="phone_callback">Phone callback</option>
              <option value="email_reply">Reply from registered email</option>
              <option value="in_person">In person</option>
            </select>
          </label>
          {isCompany && (
            <label className="text-sm">
              <span className="mb-1 block text-xs text-[rgb(var(--c-text-muted))]">Verified company id</span>
              <input
                className={field}
                placeholder="company id"
                defaultValue={company?.id ?? r.company_id ?? ''}
                onChange={(e) => (r._companyId = e.target.value)}
              />
            </label>
          )}
          <button
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => act('verify', { verification_method: method, company_id: r._companyId ? Number(r._companyId) : company?.id }, 'Verified.')}
          >
            Mark verified
          </button>
        </div>
        <p className="mt-2 text-xs text-[rgb(var(--c-text-muted))]">
          Holding a company name or an email address is not verification on its own.
        </p>
      </div>

      {/* Review / decline */}
      <div className={box}>
        <h3 className="mb-3 text-base font-semibold text-[rgb(var(--c-text))]">Review</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          <button disabled={busy} className="rounded-md border border-[rgb(var(--c-border))] px-3 py-2 text-sm" onClick={() => act('status', { status: 'verification_pending' }, 'Status updated.')}>Verification pending</button>
          <button disabled={busy} className="rounded-md border border-[rgb(var(--c-border))] px-3 py-2 text-sm" onClick={() => act('status', { status: 'under_review' }, 'Status updated.')}>Under review</button>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grow text-sm">
            <span className="mb-1 block text-xs text-[rgb(var(--c-text-muted))]">Decline reason</span>
            <input className={field} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} />
          </label>
          <button
            disabled={busy || !declineReason.trim()}
            className="rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger disabled:opacity-60"
            onClick={() => act('decline', { reason: declineReason }, 'Request declined.')}
          >
            Decline
          </button>
        </div>
      </div>

      {/* Final confirmation */}
      <div className={box}>
        <h3 className="mb-3 text-base font-semibold text-[rgb(var(--c-text))]">Final confirmation</h3>
        <label className="flex items-start gap-2.5 text-sm text-[rgb(var(--c-text))]">
          <input type="checkbox" className="mt-0.5" checked={confirmCompany} onChange={(e) => setConfirmCompany(e.target.checked)} />
          <span>
            {isCompany
              ? `I have verified the owner and confirm permanent deletion of company #${company?.id ?? r.company_id} and all of its data.`
              : 'I confirm deletion of this personal account.'}
          </span>
        </label>
        <button
          disabled={busy || !confirmCompany}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => act('final-confirm', { confirm: true, company_id: company?.id ?? r.company_id }, 'Final confirmation recorded.')}
        >
          Record final confirmation
        </button>
      </div>

      {/* Process */}
      <div className={`${box} border-danger`}>
        <h3 className="mb-2 text-base font-semibold text-danger">Execute deletion</h3>
        <p className="mb-3 text-sm text-[rgb(var(--c-text))]">
          This runs the deletion now. It cannot be undone through the application.
        </p>
        <p className="mb-3 text-xs text-[rgb(var(--c-text-muted))]">
          Deletion is executed only after the 14-day waiting period has passed and this request has been reviewed and approved.
        </p>
        <button
          disabled={busy || !canProcess}
          className="rounded-md bg-danger px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          onClick={() => act('process', {}, 'Deletion processed.')}
        >
          {isCompany ? 'Delete company permanently' : 'Delete personal account'}
        </button>
        {!canProcess ? (
          <p className="mt-2 text-xs text-[rgb(var(--c-text-muted))]">
            A company deletion must be verified and finally confirmed first.
          </p>
        ) : null}
      </div>

      {/* Audit trail */}
      <div className={box}>
        <h3 className="mb-3 text-base font-semibold text-[rgb(var(--c-text))]">History</h3>
        <ul className="space-y-2 text-sm text-[rgb(var(--c-text))]">
          {(r.events ?? []).map((e: any, i: number) => (
            <li key={i} className="flex flex-wrap gap-x-3 border-b border-[rgb(var(--c-border))] pb-2">
              <span className="font-medium">{e.action}</span>
              <span className="text-xs text-[rgb(var(--c-text-muted))]">
                {e.from_status ? `${e.from_status} → ` : ''}{e.to_status || ''}
              </span>
              <span className="text-xs text-[rgb(var(--c-text-muted))]">{e.actor_type}{e.actor_id ? ` #${e.actor_id}` : ''}</span>
              <span className="ml-auto text-xs text-[rgb(var(--c-text-muted))]">{e.at}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AccountDeletionDetail;
