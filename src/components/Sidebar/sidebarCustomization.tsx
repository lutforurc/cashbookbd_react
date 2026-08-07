import { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { API_USER_DASHBOARD_PREFERENCES_URL } from '../services/apiRoutes';
import httpService from '../services/httpService';

/**
 * Lets each user put the sidebar in the order they want, and hide what they
 * never open.
 *
 * It rides on the preferences endpoint the dashboard already uses. That endpoint
 * takes any key and returns { order, hidden }, so a second one would have been
 * the same code under a different name. It is stored against the user, so the
 * arrangement follows them between browsers and machines -- a sidebar arranged
 * at the office is still arranged from home -- and, because a user belongs to
 * one company, it is a single arrangement per user per company rather than one
 * for every branch they open.
 *
 * localStorage holds the same thing so the sidebar draws in the user's order on
 * the very first paint, before the request comes back. Without it the menu would
 * visibly rearrange itself a moment after every page load.
 */

export type SidebarItem = {
  id: string;
  title: string;
};

type SidebarPreferences = {
  order: string[];
  hidden: string[];
};

const EMPTY: SidebarPreferences = { order: [], hidden: [] };

/**
 * The sidebar and the arrange page each hold their own copy of these
 * preferences, so a change made on one has to reach the other. Saving announces
 * itself here and every other copy re-reads, which is what lets the sidebar
 * rearrange itself as you drag on the page rather than on the next reload.
 */
const CHANGED = 'sidebar-customization-changed';

/**
 * Write, then tell everyone.
 *
 * The write has to happen here and not in an effect. Effects run after the
 * render, so announcing first meant every listener -- including the copy that
 * had just saved -- read the previous value out of localStorage and set itself
 * back to it. A divider added on the page appeared and vanished in the same
 * instant, which is exactly what it looked like.
 */
const announce = (storageKey: string, preferences: SidebarPreferences) => {
  window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(CHANGED, { detail: { storageKey } }));
};

const normalize = (value: any): SidebarPreferences => ({
  order: Array.isArray(value?.order)
    ? value.order.filter((id: any) => typeof id === 'string' && id)
    : [],
  hidden: Array.isArray(value?.hidden)
    ? value.hidden.filter((id: any) => typeof id === 'string' && id)
    : [],
});

const same = (a: SidebarPreferences, b: SidebarPreferences) =>
  JSON.stringify(a) === JSON.stringify(b);

const read = (storageKey: string): SidebarPreferences => {
  if (typeof window === 'undefined') return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? normalize(JSON.parse(raw)) : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
};

/**
 * A divider the user has put between two menus, with the name they gave it.
 *
 * Both live inside the id -- "divider:k3f9:Product" -- because the preferences
 * record the API stores is an array of strings and nothing else. Encoding the
 * label here means dividers need no new field, no new endpoint and no migration;
 * the cost is that renaming one changes its id, which is why the key in the
 * middle exists: it is what the reorder logic holds on to while the label moves.
 *
 * The API caps each entry at 80 characters, so labels are cut to 40 -- long
 * enough for a heading, short enough that the id can never be refused.
 */
const DIVIDER = 'divider:';
export const DIVIDER_LABEL_MAX = 40;

export const isDivider = (id: string) => id.startsWith(DIVIDER);

export const dividerLabel = (id: string) => {
  const rest = id.slice(DIVIDER.length);
  const cut = rest.indexOf(':');
  return cut < 0 ? rest : rest.slice(cut + 1);
};

const dividerKey = (id: string) => {
  const rest = id.slice(DIVIDER.length);
  const cut = rest.indexOf(':');
  return cut < 0 ? rest : rest.slice(0, cut);
};

const makeDividerId = (label: string, key?: string) =>
  DIVIDER +
  (key ?? Math.random().toString(36).slice(2, 6)) +
  ':' +
  label.slice(0, DIVIDER_LABEL_MAX);

/**
 * Applies a saved order to the items that exist right now.
 *
 * Saved ids that no longer exist are dropped, and items the save has never seen
 * keep their place at the end. That is what stops a release that adds a menu
 * from either losing it or throwing away an order the user set months ago.
 */
export const applySidebarOrder = <T extends { id: string }>(
  items: T[],
  order: string[],
): T[] => {
  if (!order.length) return items;

  const known = new Map(items.map((item) => [item.id, item]));
  const ordered: T[] = [];

  order.forEach((id) => {
    const item = known.get(id);
    if (item) {
      ordered.push(item);
      known.delete(id);
    }
  });

  // Whatever the saved order did not mention -- new menus, mostly -- keeps the
  // relative position it has in the code.
  items.forEach((item) => {
    if (known.has(item.id)) ordered.push(item);
  });

  return ordered;
};

export const useSidebarCustomization = (
  storageKey: string,
  items: SidebarItem[],
) => {
  const [preferences, setPreferences] = useState<SidebarPreferences>(() => read(storageKey));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences, storageKey]);

  // Re-read when another copy of this hook saves -- the sidebar while the
  // arrange page is open, and the other way round.
  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.storageKey !== storageKey) return;
      setPreferences(read(storageKey));
    };

    window.addEventListener(CHANGED, onChanged);
    return () => window.removeEventListener(CHANGED, onChanged);
  }, [storageKey]);

  // branch_id is deliberately never sent. The endpoint then falls back to
  // auth()->user()->branch_id -- the user's own branch, not whichever one they
  // are looking at -- so the arrangement is one per user, and therefore one per
  // company, since a user belongs to a single company. Sending the branch on
  // screen would have given the same person a different sidebar in every branch
  // they opened, and made them arrange it again each time.
  useEffect(() => {
    let cancelled = false;

    httpService
      .get(API_USER_DASHBOARD_PREFERENCES_URL, {
        params: { dashboard: 'sidebar' },
      })
      .then((response) => {
        if (cancelled) return;
        const remote = normalize(response?.data?.data?.preferences);

        setPreferences((current) => {
          // An empty answer means the server has never been told anything --
          // it must not overwrite an arrangement this browser already holds.
          // Getting this wrong wiped the order on every reload: the load
          // replaced it with nothing, and the write below saved the nothing.
          if (!remote.order.length && !remote.hidden.length) return current;

          return same(current, remote) ? current : remote;
        });
      })
      .catch(() => {
        // A sidebar that cannot reach the server is still a working sidebar.
        // The local copy is already on screen; there is nothing to report.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (next: SidebarPreferences) => {
      setPreferences(next);
      announce(storageKey, next);

      // Saved on every change, with no gate. The earlier version waited for the
      // GET to have returned before it would send anything, so an arrangement
      // made in the first moments after login was dropped without a word -- and
      // it was the very reload that followed which showed the old order back.
      httpService
        .post(API_USER_DASHBOARD_PREFERENCES_URL, {
          dashboard: 'sidebar',
          preferences: next,
        })
        .catch(() => {
          // localStorage already has it, so this browser keeps the arrangement
          // either way; only carrying it to another machine is lost.
        });
    },
    [],
  );

  /**
   * The menus plus whatever dividers the user has inserted, in their order.
   *
   * Dividers exist only in the saved order -- there is no declared list of them
   * to merge with -- so they are read back out of it here. That also means a
   * divider cannot outlive being deleted: drop it from the order and it is gone.
   */
  const ordered = useMemo(() => {
    const dividers = preferences.order
      .filter(isDivider)
      .map((id) => ({ id, title: dividerLabel(id) }));

    return applySidebarOrder([...items, ...dividers], preferences.order);
  }, [items, preferences.order]);

  /**
   * An empty name is allowed and means a plain rule -- a break with no heading,
   * for separating two groups that need no naming.
   */
  const addDivider = useCallback(
    (label: string) => {
      // Added at the top, where it is immediately visible and can be dragged
      // down to wherever it belongs. Appending would put it below sixteen menus,
      // out of sight on a short window.
      persist({ ...preferences, order: [makeDividerId(label.trim()), ...preferences.order] });
    },
    [preferences, persist],
  );

  /**
   * Renaming rewrites the id, since the label lives inside it. The key in the
   * middle is kept so the divider stays the same divider -- it holds its place
   * in the order and its hidden state rather than being replaced by a new one.
   */
  const renameDivider = useCallback(
    (id: string, label: string) => {
      // Clearing the name is how a heading becomes a plain rule, so an empty
      // value is a real edit rather than something to ignore.
      const next = makeDividerId(label.trim(), dividerKey(id));
      if (next === id) return;

      persist({
        order: preferences.order.map((entry) => (entry === id ? next : entry)),
        hidden: preferences.hidden.map((entry) => (entry === id ? next : entry)),
      });
    },
    [preferences, persist],
  );

  const removeDivider = useCallback(
    (id: string) => {
      persist({
        order: preferences.order.filter((entry) => entry !== id),
        hidden: preferences.hidden.filter((entry) => entry !== id),
      });
    },
    [preferences, persist],
  );

  const move = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const ids = ordered.map((item) => item.id);
      const from = ids.indexOf(id);
      if (from < 0) return;

      const to = direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= ids.length) return;

      [ids[from], ids[to]] = [ids[to], ids[from]];
      persist({ ...preferences, order: ids });
    },
    [ordered, preferences, persist],
  );

  /**
   * Drop `draggedId` where `targetId` currently sits.
   *
   * Written against the ids on screen rather than the saved order, because the
   * saved order may not mention a menu at all -- a new one, or one the user has
   * never moved. Reading the positions off what is displayed and saving the
   * whole list back means the result is always exactly what the user just saw.
   */
  const reorder = useCallback(
    (draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;

      const ids = ordered.map((item) => item.id);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;

      ids.splice(from, 1);
      ids.splice(to, 0, draggedId);
      persist({ ...preferences, order: ids });
    },
    [ordered, preferences, persist],
  );

  const toggleHidden = useCallback(
    (id: string) => {
      const hidden = preferences.hidden.includes(id)
        ? preferences.hidden.filter((item) => item !== id)
        : [...preferences.hidden, id];

      persist({ ...preferences, hidden });
    },
    [preferences, persist],
  );

  const reset = useCallback(() => persist({ ...EMPTY }), [persist]);

  const isHidden = useCallback(
    (id: string) => preferences.hidden.includes(id),
    [preferences.hidden],
  );

  return {
    ordered,
    move,
    reorder,
    toggleHidden,
    isHidden,
    reset,
    preferences,
    addDivider,
    renameDivider,
    removeDivider,
  };
};

/**
 * The same thing for the entries inside a menu.
 *
 * One record holds every menu's inner order, not one per menu: twelve records
 * would be twelve requests on every page load to arrange a list most people
 * never touch. The ids are namespaced "<menu>/<entry>", so a single flat array
 * carries them all and the group an id belongs to is readable from the id.
 *
 * Reordering is always scoped to one menu. A drag inside Transaction rewrites
 * only the Transaction ids and leaves every other menu's stretch of the array
 * exactly as it was.
 */
export const useSidebarSubCustomization = (storageKey: string) => {
  const [preferences, setPreferences] = useState<SidebarPreferences>(() => read(storageKey));

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences, storageKey]);

  // Re-read when another copy of this hook saves -- the sidebar while the
  // arrange page is open, and the other way round.
  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.storageKey !== storageKey) return;
      setPreferences(read(storageKey));
    };

    window.addEventListener(CHANGED, onChanged);
    return () => window.removeEventListener(CHANGED, onChanged);
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;

    httpService
      .get(API_USER_DASHBOARD_PREFERENCES_URL, { params: { dashboard: 'sidebar-sub' } })
      .then((response) => {
        if (cancelled) return;
        const remote = normalize(response?.data?.data?.preferences);

        setPreferences((current) => {
          if (!remote.order.length && !remote.hidden.length) return current;
          return same(current, remote) ? current : remote;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (next: SidebarPreferences) => {
      setPreferences(next);
      announce(storageKey, next);

      httpService
        .post(API_USER_DASHBOARD_PREFERENCES_URL, {
          dashboard: 'sidebar-sub',
          preferences: next,
        })
        .catch(() => {});
    },
    [storageKey],
  );

  const key = (menuId: string, itemId: string) => `${menuId}/${itemId}`;

  /**
   * Where an entry sits inside its menu, and whether it is hidden.
   *
   * Entries the saved order has never seen answer 999, which leaves them after
   * everything that has been placed -- in the order the code declares them,
   * since equal flex order falls back to document order. A menu entry added in
   * a later release therefore lands at the bottom of its menu rather than
   * jumping to the top or vanishing.
   */
  const slot = useCallback(
    (menuId: string, itemId: string): CSSProperties => {
      const id = key(menuId, itemId);
      const position = preferences.order.indexOf(id);

      return {
        order: position < 0 ? 999 : position,
        display: preferences.hidden.includes(id) ? 'none' : undefined,
      };
    },
    [preferences],
  );

  /**
   * The ids of one menu, in the order they are on screen.
   *
   * Dividers the user has put inside this menu come through too. They are not
   * in `declared` -- nothing declares them -- so they are kept on the strength
   * of being dividers, while an entry that no longer exists in the code is
   * dropped.
   */
  const idsOf = useCallback(
    (menuId: string, declared: string[]) => {
      const prefix = `${menuId}/`;
      const saved = preferences.order
        .filter((id) => id.startsWith(prefix))
        .map((id) => id.slice(prefix.length))
        .filter((id) => declared.includes(id) || isDivider(id));

      return [...saved, ...declared.filter((id) => !saved.includes(id))];
    },
    [preferences.order],
  );

  /** Write one menu's order back, leaving every other menu's untouched. */
  const writeGroup = useCallback(
    (menuId: string, ids: string[]) => {
      const prefix = `${menuId}/`;
      const others = preferences.order.filter((id) => !id.startsWith(prefix));

      persist({ ...preferences, order: [...others, ...ids.map((id) => key(menuId, id))] });
    },
    [preferences, persist],
  );

  const moveSub = useCallback(
    (menuId: string, declared: string[], itemId: string, direction: 'up' | 'down') => {
      const ids = idsOf(menuId, declared);
      const from = ids.indexOf(itemId);
      if (from < 0) return;

      const to = direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= ids.length) return;

      [ids[from], ids[to]] = [ids[to], ids[from]];
      writeGroup(menuId, ids);
    },
    [idsOf, writeGroup],
  );

  const reorderSub = useCallback(
    (menuId: string, declared: string[], draggedId: string, targetId: string) => {
      if (draggedId === targetId) return;

      const ids = idsOf(menuId, declared);
      const from = ids.indexOf(draggedId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;

      ids.splice(from, 1);
      ids.splice(to, 0, draggedId);
      writeGroup(menuId, ids);
    },
    [idsOf, writeGroup],
  );

  const toggleSubHidden = useCallback(
    (menuId: string, itemId: string) => {
      const id = key(menuId, itemId);
      const hidden = preferences.hidden.includes(id)
        ? preferences.hidden.filter((item) => item !== id)
        : [...preferences.hidden, id];

      persist({ ...preferences, hidden });
    },
    [preferences, persist],
  );

  const resetSub = useCallback(() => persist({ ...EMPTY }), [persist]);

  /**
   * A divider inside one menu. Same encoding as the outer ones, namespaced to
   * the menu it belongs to -- "transaction/divider:k3f9:Cash".
   */
  const addSubDivider = useCallback(
    (menuId: string, declared: string[], label: string) => {
      writeGroup(menuId, [makeDividerId(label.trim()), ...idsOf(menuId, declared)]);
    },
    [idsOf, writeGroup],
  );

  const renameSubDivider = useCallback(
    (menuId: string, declared: string[], id: string, label: string) => {
      const next = makeDividerId(label.trim(), dividerKey(id));
      if (next === id) return;

      writeGroup(
        menuId,
        idsOf(menuId, declared).map((entry) => (entry === id ? next : entry)),
      );
    },
    [idsOf, writeGroup],
  );

  const removeSubDivider = useCallback(
    (menuId: string, declared: string[], id: string) => {
      writeGroup(
        menuId,
        idsOf(menuId, declared).filter((entry) => entry !== id),
      );
    },
    [idsOf, writeGroup],
  );

  return {
    slot,
    idsOf,
    moveSub,
    reorderSub,
    toggleSubHidden,
    resetSub,
    addSubDivider,
    renameSubDivider,
    removeSubDivider,
  };
};
