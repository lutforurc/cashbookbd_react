import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import httpService from '../../services/httpService';
import { API_ACCOUNT_DELETION_ADMIN_LIST_URL } from '../../services/apiRoutes';

/*
 * The platform-operator review console for account / company deletion requests.
 *
 * ⚠️ The API behind this list is guarded by `platform.admin`; this screen is
 * only the visible half. A tenant administrator who reached the URL would still
 * be refused by the server.
 */

const STATUSES = [
  'submitted',
  'verification_pending',
  'under_review',
  'awaiting_final_confirmation',
  'processing',
  'completed',
  'declined',
  'failed',
];

const statusTone: Record<string, string> = {
  submitted: 'bg-meta-1/15 text-meta-1',
  verification_pending: 'bg-meta-6/15 text-meta-6',
  under_review: 'bg-primary/15 text-primary',
  awaiting_final_confirmation: 'bg-meta-4/20 text-[rgb(var(--c-text))]',
  processing: 'bg-meta-6/15 text-meta-6',
  completed: 'bg-meta-3/15 text-meta-3',
  declined: 'bg-danger/15 text-danger',
  failed: 'bg-danger/15 text-danger',
};

const AccountDeletionList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await httpService.get(API_ACCOUNT_DELETION_ADMIN_LIST_URL, {
        params: { page, status: status || undefined, type: type || undefined, q: search || undefined },
      });
      const d = res.data?.data?.data;
      setItems(d?.items ?? []);
      setTotal(d?.total ?? 0);
      setLastPage(d?.last_page ?? 1);
    } catch {
      toast.error('Could not load deletion requests.');
    } finally {
      setLoading(false);
    }
  }, [page, status, type, search]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-6 shadow-default">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-lg font-semibold text-[rgb(var(--c-text))]">Account Deletion Requests</h2>
        <select
          className="rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          className="rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2 text-sm"
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value);
          }}
        >
          <option value="">All types</option>
          <option value="personal">Personal</option>
          <option value="company">Company</option>
        </select>
        <input
          className="rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-3 py-2 text-sm"
          placeholder="Reference, name, email…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto text-left text-sm">
          <thead>
            <tr className="border-b border-[rgb(var(--c-border))] text-xs uppercase text-[rgb(var(--c-text-muted))]">
              <th className="px-3 py-2">Reference</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Requester</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-b border-[rgb(var(--c-border))] text-[rgb(var(--c-text))]">
                <td className="px-3 py-2 font-mono text-xs">{r.reference_no}</td>
                <td className="px-3 py-2 capitalize">{r.request_type}</td>
                <td className="px-3 py-2">
                  <div>{r.full_name}</div>
                  <div className="text-xs text-[rgb(var(--c-text-muted))]">{r.email || r.mobile}</div>
                </td>
                <td className="px-3 py-2">{r.company_name || (r.company_id ? `#${r.company_id}` : '—')}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone[r.status] ?? ''}`}>
                    {String(r.status).replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{r.created_at}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    className="rounded-md border border-[rgb(var(--c-border))] px-3 py-1.5 text-xs font-medium hover:text-primary"
                    onClick={() => navigate(`/admin/account-deletions/${r.id}`)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-[rgb(var(--c-text-muted))]">
                  No requests.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-[rgb(var(--c-text))]">
        <span>{total} request(s)</span>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-[rgb(var(--c-border))] px-3 py-1.5 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span>
            {page} / {lastPage}
          </span>
          <button
            className="rounded-md border border-[rgb(var(--c-border))] px-3 py-1.5 disabled:opacity-50"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionList;
