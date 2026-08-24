import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FIELD_TOOLTIP,
  FIELD_TOOLTIP_CARET_RIGHT,
  FIELD_TOOLTIP_CARET_UP,
} from '../../../theme/fieldStyles';

/**
 * The app's own tooltip, for anything that is not a form field.
 *
 * InputElement has drawn this bubble for a long time and does it well, but it
 * does it privately -- so everything else on screen has been falling back to
 * the browser's `title=`, which draws a pale system box, in its own font, half
 * a second late, wherever the pointer happens to be. Two tooltips in one
 * application, and only one of them looks like the application.
 *
 * This is that bubble, lifted out so a button, a tile or a table cell can have
 * it. InputElement is deliberately left alone: it carries some nine hundred
 * call sites, and rewriting it to consume this would be a large change to prove
 * for no gain today. What matters is that both read their look from
 * FIELD_TOOLTIP, so there is one bubble described in one place.
 *
 * ⚠️ It is drawn into the body through a portal, and that is the whole reason
 * it exists as a hook rather than a few lines of CSS. A bubble laid out beside
 * its anchor lives inside whatever the anchor lives inside -- and a room tile
 * sits in a row with `overflow-x: auto`, which clips its other axis too. Such a
 * bubble is cut in half by the row it belongs to. Drawn into the body it is
 * inside nothing, so nothing can clip it.
 *
 * Usage keeps the anchor's own element, so no wrapper appears in the layout:
 *
 *     const { anchorProps, tooltip } = useTooltip(<>Room 302 · Deluxe</>);
 *
 *     return (
 *       <>
 *         <button {...anchorProps}>302</button>
 *         {tooltip}
 *       </>
 *     );
 */
export const useTooltip = <T extends HTMLElement>(
  content: React.ReactNode,
  placement: 'bottom' | 'left' = 'bottom',
) => {
  const anchor = useRef<T | null>(null);
  const [bubble, setBubble] = useState<{ top: number; left: number } | null>(null);

  // Measured at the moment of hover rather than laid out in advance: the tile
  // may have been scrolled sideways since it was drawn, and a position worked
  // out earlier would point at where it used to be.
  const show = () => {
    const box = anchor.current?.getBoundingClientRect();

    if (!box || !content) return;

    setBubble(
      placement === 'left'
        ? { top: box.top + box.height / 2, left: box.left - 10 }
        : { top: box.bottom + 8, left: box.left + box.width / 2 },
    );
  };

  const hide = () => setBubble(null);

  // Fixed to the viewport, so anything that moves the anchor underneath leaves
  // the bubble pointing at empty air. Cheaper to take it away than to follow
  // the anchor around -- and `true` for the capture phase, because the row the
  // tile sits in scrolls on its own without the window ever hearing about it.
  useEffect(() => {
    if (!bubble) return undefined;

    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);

    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [bubble]);

  return {
    /**
     * Spread onto the element the bubble belongs to.
     *
     * Focus and blur as well as the pointer, so the bubble is reachable by
     * keyboard -- the browser's own `title` was, and losing that on the way to
     * a prettier box would be a poor trade.
     */
    anchorProps: {
      ref: anchor,
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide,
    },

    tooltip:
      content && bubble
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: 'fixed',
                top: bubble.top,
                left: bubble.left,
                transform: placement === 'left' ? 'translate(-100%, -50%)' : 'translateX(-50%)',
                zIndex: 9999,
              }}
              className={FIELD_TOOLTIP}
            >
              <span
                className={placement === 'left' ? FIELD_TOOLTIP_CARET_RIGHT : FIELD_TOOLTIP_CARET_UP}
              />
              {content}
            </div>,
            document.body,
          )
        : null,
  };
};

export default useTooltip;
