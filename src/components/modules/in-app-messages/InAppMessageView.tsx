import React from 'react';
import { FiX } from 'react-icons/fi';

import { InAppMessage } from './types';

type Props = {
  message: InAppMessage;
  onPrimary: () => void;
  onSecondary: () => void;
  onClose: () => void;
  /** Preview mode drops the fixed positioning so the admin form can embed it. */
  preview?: boolean;
};

const surfaceStyle = (message: InAppMessage): React.CSSProperties => ({
  ...(message.bg_color ? { backgroundColor: message.bg_color } : {}),
  ...(message.text_color ? { color: message.text_color } : {}),
});

const buttonStyle = (message: InAppMessage): React.CSSProperties =>
  message.button_color
    ? { backgroundColor: message.button_color, borderColor: message.button_color }
    : {};

const Buttons: React.FC<{
  message: InAppMessage;
  onPrimary: () => void;
  onSecondary: () => void;
  compact?: boolean;
}> = ({ message, onPrimary, onSecondary, compact }) => {
  // A message with no button of its own still needs a way out when it demands
  // acknowledgement, so fall back to a plain OK.
  const primaryLabel =
    message.primary_label || (message.require_ack ? 'OK' : null);

  if (!primaryLabel && !message.secondary_label) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'mt-4'}`}>
      {primaryLabel ? (
        <button
          type="button"
          onClick={onPrimary}
          style={buttonStyle(message)}
          className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {primaryLabel}
        </button>
      ) : null}
      {message.secondary_label ? (
        <button
          type="button"
          onClick={onSecondary}
          className="rounded border border-current px-4 py-1.5 text-sm font-semibold opacity-80 transition hover:opacity-100"
        >
          {message.secondary_label}
        </button>
      ) : null}
    </div>
  );
};

const CloseButton: React.FC<{ onClose: () => void; className?: string }> = ({
  onClose,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClose}
    aria-label="Close message"
    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20 text-white transition hover:bg-black/40 ${className}`}
  >
    <FiX />
  </button>
);

/**
 * Renders one campaign in whichever layout it was authored with. Shared by the
 * live pop-up host and the admin form's preview, so what an operator sees while
 * composing is what the user gets.
 */
const InAppMessageView: React.FC<Props> = ({
  message,
  onPrimary,
  onSecondary,
  onClose,
  preview = false,
}) => {
  // require_ack means the message may only be closed through its own button.
  const closable = !message.require_ack;
  const layout = message.layout;

  if (layout === 'BANNER_TOP' || layout === 'BANNER_BOTTOM') {
    const position = preview
      ? 'relative'
      : `fixed left-0 right-0 z-[9999] ${layout === 'BANNER_TOP' ? 'top-0' : 'bottom-0'}`;

    return (
      <div className={position}>
        <div
          style={surfaceStyle(message)}
          className="mx-auto flex max-w-screen-xl items-center gap-3 border border-stroke bg-white px-4 py-3 shadow-lg dark:border-strokedark dark:bg-boxdark"
        >
          {message.image_url ? (
            <img
              src={message.image_url}
              alt=""
              className="h-10 w-10 shrink-0 rounded object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{message.title}</div>
            {message.body ? (
              <div className="truncate text-xs opacity-80">{message.body}</div>
            ) : null}
          </div>
          <Buttons
            message={message}
            onPrimary={onPrimary}
            onSecondary={onSecondary}
            compact
          />
          {closable ? <CloseButton onClose={onClose} className="bg-black/10 !text-current" /> : null}
        </div>
      </div>
    );
  }

  const overlay = preview
    ? 'relative flex justify-center'
    : 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4';

  if (layout === 'IMAGE_ONLY') {
    return (
      <div className={overlay} onClick={closable && !preview ? onClose : undefined}>
        <div
          className="relative max-w-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {closable ? (
            <CloseButton onClose={onClose} className="absolute -right-2 -top-2 z-10" />
          ) : null}
          <button type="button" onClick={onPrimary} className="block">
            <img
              src={message.image_url || ''}
              alt={message.title}
              className="max-h-[70vh] w-full rounded-lg object-contain shadow-2xl"
            />
          </button>
        </div>
      </div>
    );
  }

  if (layout === 'CARD') {
    return (
      <div className={overlay} onClick={closable && !preview ? onClose : undefined}>
        <div
          style={surfaceStyle(message)}
          onClick={(event) => event.stopPropagation()}
          className="relative flex w-full max-w-xl gap-4 rounded-lg border border-stroke bg-white p-4 shadow-2xl dark:border-strokedark dark:bg-boxdark"
        >
          {closable ? (
            <CloseButton onClose={onClose} className="absolute right-2 top-2 bg-black/10 !text-current" />
          ) : null}
          {message.image_url ? (
            <img
              src={message.image_url}
              alt=""
              className="h-28 w-28 shrink-0 rounded object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1 pr-6">
            <h4 className="text-base font-bold">{message.title}</h4>
            {message.body ? (
              <p className="mt-1 whitespace-pre-line text-sm opacity-90">{message.body}</p>
            ) : null}
            <Buttons message={message} onPrimary={onPrimary} onSecondary={onSecondary} />
          </div>
        </div>
      </div>
    );
  }

  // MODAL — the default.
  return (
    <div className={overlay} onClick={closable && !preview ? onClose : undefined}>
      <div
        style={surfaceStyle(message)}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-stroke bg-white shadow-2xl dark:border-strokedark dark:bg-boxdark"
      >
        {closable ? (
          <CloseButton onClose={onClose} className="absolute right-2 top-2 z-10" />
        ) : null}
        {message.image_url ? (
          <img
            src={message.image_url}
            alt=""
            className="max-h-56 w-full object-cover"
          />
        ) : null}
        <div className="p-5">
          <h4 className="text-lg font-bold">{message.title}</h4>
          {message.body ? (
            <p className="mt-2 whitespace-pre-line text-sm opacity-90">{message.body}</p>
          ) : null}
          <Buttons message={message} onPrimary={onPrimary} onSecondary={onSecondary} />
        </div>
      </div>
    </div>
  );
};

export default InAppMessageView;
