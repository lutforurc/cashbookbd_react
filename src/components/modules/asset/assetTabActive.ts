import { createContext, useContext, useEffect, useRef } from 'react';

/**
 * What the Fixed Assets screen tells each of its tabs, and hears back.
 *
 * The tabs stay mounted once opened (see AssetSetup), and a tab just chosen is
 * not put on screen until it has something to show -- the tab before it stays
 * where it is until then, so the page is never empty in between.
 *
 *   `active`  this is the tab the person chose. A tab that is not must leave
 *             the shared address (`?form=`) alone, and reads its figures again
 *             when it is chosen again -- another tab may have changed them.
 *
 *   `loaded`  the tab calls this when a read has come back, which is what lets
 *             the screen swap it in.
 */
export const AssetTabContext = createContext<{ active: boolean; loaded: () => void }>({
  active: true,
  loaded: () => undefined,
});

export const useAssetTabActive = (): boolean => useContext(AssetTabContext).active;

/**
 * Report the end of a read. Given the tab's own `loading` flag: the report goes
 * out when it falls after having been up, so a tab whose flag starts down is
 * not announced before it has asked for anything.
 */
export const useAssetTabLoaded = (loading: boolean): void => {
  const { loaded } = useContext(AssetTabContext);
  const began = useRef(false);

  useEffect(() => {
    if (loading) {
      began.current = true;
    } else if (began.current) {
      loaded();
    }
    // `loaded` is a new function on every render of the screen; only the flag
    // is the event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);
};
