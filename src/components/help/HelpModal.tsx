import { useEffect, useRef, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import routes from '../services/appRoutes';
import HelpTopicView from './HelpTopicView';
import {
  HELP_TOPIC_MISSING_MESSAGE,
  HELP_UNAVAILABLE_MESSAGE,
  loadTopic,
  type HelpTopic,
} from './helpLoader';

type Props = {
  topicId: string;
  onClose: () => void;
};

/**
 * The screen's own help, over the screen it belongs to.
 *
 * ⚠️ ONE INSTANCE FOR THE WHOLE PROJECT, mounted by HelpProvider. A screen does
 * not render this and does not hold its state. Because the dialog is above the
 * routed screen, the form beneath it is never unmounted and the address is
 * never rewritten: a half-typed entry must survive a look at the help. Only the
 * explicit "see the whole thing" link at the bottom leaves the screen, and that
 * is a deliberate click.
 *
 * The shell follows the dialogs already in the app (ConfirmModalProps,
 * StockShortageModal): one fixed backdrop, a bordered panel on the theme's
 * surface colour, a title bar and a footer. It adds role="dialog", an
 * aria-label, Escape, and a body that scrolls inside the panel instead of
 * letting the page scroll beside it.
 */
const HelpModal = ({ topicId, onClose }: Props) => {
  const [topic, setTopic] = useState<HelpTopic | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const closeRef = useRef<HTMLButtonElement>(null);

  // The parent passes a stable handler, but keep the latest anyway so the key
  // listener is attached once, not on every render.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    let alive = true;

    setState('loading');
    setTopic(null);

    loadTopic(topicId)
      .then((found) => {
        if (!alive) return;
        setTopic(found);
        setState('ready');
      })
      .catch(() => {
        if (!alive) return;
        setState('error');
      });

    return () => {
      alive = false;
    };
  }, [topicId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
    };

    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const missing = state === 'ready' && !topic;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 px-3 py-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={topic?.title || 'সহায়তা'}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-[rgb(var(--c-text))] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--c-border))] px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[rgb(var(--c-text))]">
              {topic?.title || 'সহায়তা'}
            </h2>
            <p className="mt-0.5 text-xs text-[rgb(var(--c-text-muted))]">
              {topic?.module || ''}
              {topic?.updated ? (
                <span className={topic.module ? 'ml-2' : ''}>হালনাগাদ: {topic.updated}</span>
              ) : null}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            title="বন্ধ করুন"
            className="rounded p-1.5 text-[rgb(var(--c-text-muted))] transition hover:bg-[rgb(var(--c-page))] hover:text-[rgb(var(--c-text))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgb(var(--c-primary))]"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4">
          {state === 'loading' ? (
            <p className="text-sm text-[rgb(var(--c-text-muted))]">লোড হচ্ছে…</p>
          ) : state === 'error' ? (
            <p className="text-sm text-[rgb(var(--c-text))]">{HELP_UNAVAILABLE_MESSAGE}</p>
          ) : missing ? (
            <p className="text-sm text-[rgb(var(--c-text))]">{HELP_TOPIC_MISSING_MESSAGE}</p>
          ) : topic ? (
            <HelpTopicView topic={topic} />
          ) : null}
        </div>

        {topic ? (
          <div className="border-t border-[rgb(var(--c-border))] px-4 py-3">
            <Link
              to={`${routes.help}?topic=${encodeURIComponent(topicId)}`}
              onClick={onClose}
              className="text-sm font-medium text-[rgb(var(--c-primary))] underline underline-offset-4"
            >
              Help-এ পুরোটা দেখুন →
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HelpModal;
