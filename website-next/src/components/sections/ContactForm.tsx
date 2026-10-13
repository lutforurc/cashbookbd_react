'use client';

import { useState, type FormEvent } from 'react';

/**
 * The public contact form. Posts same-origin to the Laravel public API (nginx
 * routes /api there in production, the dev proxy does locally), so the message
 * is stamped with the tenant the visitor is actually on. Rendered by the
 * `contact` section and by the standalone /contact page.
 */
export default function ContactForm({ honeypot }: { honeypot: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setError('');

    const data = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const res = await fetch('/api/public/site/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as Record<string, unknown>));
        const errors = (body as { errors?: Record<string, string[]> }).errors;
        const first = errors ? Object.values(errors)[0]?.[0] : undefined;
        setError(first ?? (body as { message?: string }).message ?? 'Please check the form and try again.');
        setStatus('error');
        return;
      }

      setStatus('sent');
    } catch {
      setError('Please check the form and try again.');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return <div className="notice" data-testid="contact-sent">Thank you — your message has been sent.</div>;
  }

  return (
    <form onSubmit={onSubmit} data-testid="contact-form">
      {status === 'error' && <div className="notice notice--error">{error}</div>}

      {/* Honeypot: hidden from people, tempting to bots. */}
      <input className="honeypot" type="text" name={honeypot} tabIndex={-1} autoComplete="off" aria-hidden="true" />

      <div className="field">
        <label htmlFor="site-name">Your name *</label>
        <input id="site-name" name="name" required data-testid="contact-name" />
      </div>
      <div className="field">
        <label htmlFor="site-email">Email</label>
        <input id="site-email" type="email" name="email" data-testid="contact-email" />
      </div>
      <div className="field">
        <label htmlFor="site-phone">Phone</label>
        <input id="site-phone" name="phone" />
      </div>
      <div className="field">
        <label htmlFor="site-subject">Subject</label>
        <input id="site-subject" name="subject" />
      </div>
      <div className="field">
        <label htmlFor="site-message">Message *</label>
        <textarea id="site-message" name="message" rows={5} required data-testid="contact-message" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={status === 'sending'} data-testid="contact-submit">
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
