'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { MessagesResponse } from '@/lib/site-types';

export default function MessagesPage() {
  const ready = useRequireAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<MessagesResponse['messages']>([]);
  const [meta, setMeta] = useState<MessagesResponse['meta'] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await builderFetch<MessagesResponse>('/messages');
      setMessages(res.messages);
      setMeta(res.meta);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
      else setNotice({ kind: 'err', text: 'Could not load the messages.' });
    }
  }, [router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  async function markRead(id: number) {
    setBusy(true);
    try {
      await builderFetch(`/messages/${id}/read`, { method: 'POST' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not update.' });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm('Delete this message?')) return;
    setBusy(true);
    try {
      await builderFetch(`/messages/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not delete.' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Messages"><Forbidden /></BuilderShell>;

  return (
    <BuilderShell title="Contact messages">
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      {messages.length === 0 && <div className="b-card b-muted">No messages yet.</div>}

      {messages.map((message) => (
        <div className="b-card" key={message.id} data-testid="message-item">
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
            <strong>{message.name}</strong>
            {!message.is_read && <span className="b-pill">new</span>}
            <span className="b-muted">{message.email ?? ''} {message.phone ?? ''}</span>
            <span style={{ marginLeft: 'auto' }} className="b-muted">{message.created_at ?? ''}</span>
          </div>
          {message.subject && <p style={{ margin: '8px 0 4px' }}><strong>{message.subject}</strong></p>}
          <p style={{ whiteSpace: 'pre-wrap' }}>{message.message}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {!message.is_read && <button className="b-btn" disabled={busy} onClick={() => markRead(message.id)}>Mark as read</button>}
            <button className="b-btn b-btn--danger" disabled={busy} onClick={() => remove(message.id)}>Delete</button>
          </div>
        </div>
      ))}

      {meta && meta.last_page > 1 && (
        <p className="b-muted">Page {meta.current_page} of {meta.last_page} · {meta.total} messages</p>
      )}
    </BuilderShell>
  );
}
