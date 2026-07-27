import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import InAppMessageView from './InAppMessageView';
import {
  flushInAppEvents,
  recordInAppEvent,
  resolveTrigger,
  syncInAppMessages,
} from './inAppMessageService';
import { InAppMessage } from './types';

/**
 * Shows admin-authored pop-up campaigns over the whole app.
 *
 * Mounted once in DefaultLayout, it syncs on app load, then plays the eligible
 * campaigns one at a time, highest priority first. Nothing is pushed from the
 * server — the queue is fetched once and drained locally, so it behaves the
 * same on a flaky connection.
 */
const InAppMessageHost: React.FC = () => {
  const navigate = useNavigate();
  const settings = useSelector((state: any) => state.settings);
  const user = useSelector((state: any) => state.auth?.me);

  const [queue, setQueue] = useState<InAppMessage[]>([]);
  const syncedRef = useRef(false);
  // Guards the impression call, which must fire once per showing and not again
  // on every re-render of the same message.
  const impressionRef = useRef<number | null>(null);

  const branchId = user?.branch_id || settings?.data?.branch?.id;
  const current = queue[0] || null;

  useEffect(() => {
    if (syncedRef.current) return;
    if (!user?.id) return;

    syncedRef.current = true;

    // Anything the last session queued but could not deliver goes first, so the
    // cap the server applies below is based on complete history.
    flushInAppEvents()
      .then(() => syncInAppMessages(resolveTrigger(), branchId))
      .then(setQueue)
      .catch(() => setQueue([]));
  }, [user?.id, branchId]);

  useEffect(() => {
    if (!current) return;
    if (impressionRef.current === current.id) return;

    impressionRef.current = current.id;
    recordInAppEvent(current.id, 'IMPRESSION');
  }, [current]);

  if (!current) return null;

  const advance = () => {
    impressionRef.current = null;
    setQueue((rest) => rest.slice(1));
  };

  const follow = (action?: string | null) => {
    if (!action) return;

    if (/^https?:\/\//i.test(action)) {
      window.open(action, '_blank', 'noopener');
      return;
    }

    navigate(action.startsWith('/') ? action : `/${action}`);
  };

  const handlePrimary = () => {
    // An acknowledgement is what lets require_ack campaigns stop coming back.
    if (current.require_ack) recordInAppEvent(current.id, 'ACK');
    if (current.primary_action) {
      recordInAppEvent(current.id, 'CLICK', current.primary_action);
    }
    follow(current.primary_action);
    advance();
  };

  const handleSecondary = () => {
    if (current.secondary_action) {
      recordInAppEvent(current.id, 'CLICK', current.secondary_action);
    }
    follow(current.secondary_action);
    advance();
  };

  const handleClose = () => {
    recordInAppEvent(current.id, 'DISMISS');
    advance();
  };

  return (
    <InAppMessageView
      message={current}
      onPrimary={handlePrimary}
      onSecondary={handleSecondary}
      onClose={handleClose}
    />
  );
};

export default InAppMessageHost;
