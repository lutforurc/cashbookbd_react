import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { FiChevronRight, FiHelpCircle, FiPrinter, FiShoppingCart, FiTruck } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';
import HelmetTitle from '../utils/others/HelmetTitle';
import InputElement from '../utils/fields/InputElement';
import { ButtonLoading } from '../../pages/UiElements/CustomButtons';
import HelpTopicView from './HelpTopicView';
import {
  HELP_UNAVAILABLE_MESSAGE,
  loadAllTopics,
  type HelpDocument,
  type HelpTopic,
} from './helpLoader';
import { helpTopicForPath } from './helpTopicForPath';
import routes from '../services/appRoutes';
import SidebarLinkGroup from '../Sidebar/SidebarLinkGroup';
import { SIDEBAR_MENUS, SIDEBAR_MENU_ICONS, SIDEBAR_SUBMENUS } from '../Sidebar';
import { SUB_MENU_ACTIVE, SUB_MENU_BASE } from '../Sidebar/sidebarStyles';
import {
  useSidebarCustomization,
  useSidebarSubCustomization,
} from '../Sidebar/sidebarCustomization';

const topicText = (topic: HelpTopic): string => {
  const sections = Array.isArray(topic.sections) ? topic.sections : [];

  return [
    topic.title,
    topic.module,
    topic.intro,
    ...sections.flatMap((section) => [
      section.heading,
      section.menu,
      section.warning,
      ...(section.steps ?? []),
      ...(section.table?.headers ?? []),
      ...(section.table?.rows ?? []).flat(),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

type MenuLink = {
  menuId: string;
  id: string;
  title: string;
  path: string;
  topic: string | null;
};

/**
 * Sidebar ids that are not the same as their route.
 *
 * The Check Register entry kept its old id when its link was pointed at the
 * cheque register, and Reseller is a menu id rather than a route key. Reading
 * the link the sidebar actually renders is what keeps the Help menu honest.
 */
const MENU_PATHS: Record<string, string> = {
  'admin/check-register': routes.unit_payment_list,
  reseller: routes.reseller_dashboard,
  customer_dashboard: routes.customer_dashboard,
  help: routes.help,
};

const pathForMenuId = (id: string): string =>
  MENU_PATHS[id] ?? (routes as Record<string, string>)[id] ?? (id.startsWith('/') ? id : `/${id}`);

/** The sixth menu on this page: topics that no sidebar link points at. */
const OTHER_MENU_ID = '__other__';

/**
 * The Sales and Purchase screens, which share a route.
 *
 * One route renders a different form for each business type, so the sidebar
 * cannot name them separately. The Help menu can: each entry is one screen's
 * own topic, and the screen itself passes the same topic to its title row.
 */
const VARIANT_MENUS = [
  {
    id: '__sales__',
    title: 'Sales',
    topics: [
      { id: 'sales-general', title: 'General Sales' },
      { id: 'sales-trading', title: 'Trading Sales' },
      { id: 'sales-tiles', title: 'Tiles Sales' },
      { id: 'sales-electronics', title: 'Electronics Sales' },
      { id: 'sales-company-scheme', title: 'Company Scheme Sales' },
      { id: 'sales-return-general', title: 'General Sales Return' },
      { id: 'sales-return-tiles', title: 'Tiles Sales Return' },
      { id: 'sales-import-trading', title: 'Trading Sales Import' },
      { id: 'combined-trading', title: 'Trading Combined' },
      { id: 'combined-tiles', title: 'Tiles Combined' },
      { id: 'delivery', title: 'Delivery' },
      { id: 'labour-invoice', title: 'Labour Invoice' },
    ],
  },
  {
    id: '__purchase__',
    title: 'Purchase',
    topics: [
      { id: 'purchase-trading', title: 'Trading Purchase' },
      { id: 'purchase-construction', title: 'Construction Purchase' },
      { id: 'purchase-tiles', title: 'Tiles Purchase' },
      { id: 'purchase-electronics', title: 'Electronics Purchase' },
      { id: 'purchase-return-construction', title: 'Construction Purchase Return' },
      { id: 'purchase-return-tiles', title: 'Tiles Purchase Return' },
      { id: 'purchase-import-trading', title: 'Trading Purchase Import' },
      { id: 'combined-trading', title: 'Trading Combined' },
      { id: 'combined-tiles', title: 'Tiles Combined' },
      { id: 'labour-invoice', title: 'Labour Invoice' },
    ],
  },
];

/**
 * Help: the same menus as the sidebar, and the whole of the chosen topic.
 *
 * ⚠️ NO PERMISSION GATE. This is the product's own manual; every signed-in user
 * may read it. The menu names, order, icons and submenus are the sidebar's own
 * exported definitions, so a menu added there appears here without a second
 * list to maintain. The user's own arrangement is read too.
 *
 * The topic lives in the address (`?topic=asset-category`), so a link can be
 * sent and a reload comes back to the same page. The search reads the title and
 * every word of the writing, Bengali and English alike.
 */
const HelpPage = () => {
  const [params, setParams] = useSearchParams();
  const topicId = params.get('topic') ?? '';

  const [helpDoc, setHelpDoc] = useState<HelpDocument | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  // Set only when the reader chose a row under Sales or Purchase, so a topic
  // that also has a sidebar link does not fight over which menu owns it.
  const [variantMenu, setVariantMenu] = useState<string | null>(null);

  const settingsBranch = useSelector((s: any) => s?.settings?.data?.branch ?? null);
  const currentBranch = useSelector((s: any) => s?.branchList?.currentBranch ?? null);

  // The branch's business type, read the way the sidebar reads it. Only "all"
  // is used by the first topic; a topic naming a type is shown only on that
  // branch. The ids differ per installation, so names are matched when present
  // and the numeric id is matched as a string as a fallback.
  const businessKeys = useMemo(() => {
    const keys = new Set<string>();

    [settingsBranch, currentBranch].filter(Boolean).forEach((branch: any) => {
      [
        branch.business_type_id,
        branch.business_type_name,
        branch.business_type?.name,
        branch.business_type,
      ].forEach((value) => {
        if (value === null || value === undefined) return;

        if (typeof value === 'object') {
          if (value.name) keys.add(String(value.name).toLowerCase());
          return;
        }

        keys.add(String(value).toLowerCase());
      });
    });

    return Array.from(keys);
  }, [settingsBranch, currentBranch]);

  const isAllowed = (topic: HelpTopic): boolean => {
    const types = topic.businessTypes;

    if (!Array.isArray(types) || types.length === 0) return true;
    if (types.includes('all')) return true;

    return types.some((type) => businessKeys.includes(String(type).toLowerCase()));
  };

  useEffect(() => {
    let alive = true;

    loadAllTopics()
      .then((loaded) => {
        if (!alive) return;
        setHelpDoc(loaded);
        setState('ready');
      })
      .catch(() => {
        if (!alive) return;
        setState('error');
      });

    return () => {
      alive = false;
    };
  }, []);

  const entries = useMemo(
    () =>
      Object.entries(helpDoc ?? {}).filter(([, topic]) => isAllowed(topic)) as [string, HelpTopic][],
    // isAllowed closes over businessKeys, which is in the dependency list.
    [helpDoc, businessKeys],
  );

  const needle = query.trim().toLowerCase();

  const shown = useMemo(
    () => (needle ? entries.filter(([id, topic]) => `${id} ${topicText(topic)}`.includes(needle)) : entries),
    [entries, needle],
  );

  /**
   * Every link the sidebar offers, in the raw declaration order. The topic is
   * read from the same map the title-row `?` uses.
   */
  const menuLinks = useMemo<MenuLink[]>(() => {
    const links: MenuLink[] = [];

    SIDEBAR_MENUS.forEach((menu) => {
      const subs = SIDEBAR_SUBMENUS[menu.id];

      if (subs?.length) {
        subs.forEach((sub) => {
          const path = pathForMenuId(sub.id);
          links.push({
            menuId: menu.id,
            id: sub.id,
            title: sub.title,
            path,
            topic: helpTopicForPath(path),
          });
        });
        return;
      }

      // A menu that is a single link (Reseller, Customer Dashboard, Help).
      const path = MENU_PATHS[menu.id];
      if (!path) return;

      links.push({
        menuId: menu.id,
        id: menu.id,
        title: menu.title,
        path,
        topic: helpTopicForPath(path),
      });
    });

    return links;
  }, []);

  // One row per screen variant, even when several share a route.
  const variantLinks = useMemo<MenuLink[]>(
    () =>
      VARIANT_MENUS.flatMap((menu) =>
        menu.topics.map((entry) => ({
          menuId: menu.id,
          id: `${menu.id}:${entry.id}`,
          title: entry.title,
          path: '',
          topic: entry.id,
        })),
      ),
    [],
  );

  const { ordered: orderedMenus, isHidden } = useSidebarCustomization(
    'sidebar-menu-order',
    SIDEBAR_MENUS,
  );
  const { idsOf } = useSidebarSubCustomization('sidebar-sub-order');

  const menus = useMemo(
    () => orderedMenus.filter((menu) => SIDEBAR_MENUS.some((one) => one.id === menu.id) && !isHidden(menu.id)),
    [orderedMenus, isHidden],
  );

  const visibleLinks = useMemo(() => {
    if (!needle) return menuLinks;

    return menuLinks.filter((link) => {
      const topic = link.topic ? helpDoc?.[link.topic] : null;

      return `${link.title} ${link.path} ${topic ? topicText(topic) : ''}`.toLowerCase().includes(needle);
    });
  }, [menuLinks, needle, helpDoc]);

  const visibleVariantLinks = useMemo(() => {
    if (!needle) return variantLinks;

    return variantLinks.filter((link) => {
      const topic = link.topic ? helpDoc?.[link.topic] : null;

      return `${link.title} ${topic ? topicText(topic) : ''}`.toLowerCase().includes(needle);
    });
  }, [variantLinks, needle, helpDoc]);

  const linksFor = (menuId: string): MenuLink[] => {
    const links = visibleLinks.filter((link) => link.menuId === menuId);

    if (!SIDEBAR_SUBMENUS[menuId]?.length) return links;

    const order = idsOf(menuId, links.map((link) => link.id));

    return [...links].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  };

  // The link the current topic belongs to -- the one menu to open and the one
  // row to mark. A topic shared by several routes marks the first of them.
  const activeLink = useMemo(
    () => menuLinks.find((link) => link.topic && link.topic === topicId) ?? null,
    [menuLinks, topicId],
  );

  const activeVariant = useMemo(
    () =>
      variantMenu
        ? (variantLinks.find((link) => link.menuId === variantMenu && link.topic === topicId) ?? null)
        : null,
    [variantLinks, topicId, variantMenu],
  );

  const sidebarTopics = useMemo(
    () => new Set(menuLinks.map((link) => link.topic).filter(Boolean) as string[]),
    [menuLinks],
  );

  const variantTopicIds = useMemo(
    () => new Set(variantLinks.map((link) => link.topic).filter(Boolean) as string[]),
    [variantLinks],
  );

  const otherTopics = useMemo(
    () => shown.filter(([id]) => !sidebarTopics.has(id) && !variantTopicIds.has(id)),
    [shown, sidebarTopics, variantTopicIds],
  );

  // The menu holding the open topic is open, whichever list it came from.
  useEffect(() => {
    if (activeVariant) {
      setOpenMenu(activeVariant.menuId);
      return;
    }

    if (activeLink) {
      setOpenMenu(activeLink.menuId);
      return;
    }

    if (topicId && otherTopics.some(([id]) => id === topicId)) setOpenMenu(OTHER_MENU_ID);
  }, [activeLink, activeVariant, otherTopics, topicId]);

  const otherActive = otherTopics.some(([id]) => id === topicId);
  const otherOpen = needle ? true : openMenu === OTHER_MENU_ID;

  const topic = state === 'ready' && helpDoc && topicId ? helpDoc[topicId] : null;
  const allowedTopic = topic && isAllowed(topic) ? topic : null;

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: allowedTopic?.title || 'Help',
  });

  const openTopic = (id: string) => {
    setVariantMenu(null);
    const next = new URLSearchParams(params);
    next.set('topic', id);
    setParams(next);
  };

  const clearTopic = () => {
    const next = new URLSearchParams(params);
    next.delete('topic');
    setParams(next);
  };

  const topicButton = (id: string, title: string, active: boolean) => (
    <button
      type="button"
      key={id}
      onClick={() => openTopic(id)}
      aria-current={active ? 'page' : undefined}
      className={`${SUB_MENU_BASE} w-full text-left text-sm ${
        active ? SUB_MENU_ACTIVE : 'text-[rgb(var(--c-text))]'
      }`}
    >
      {title}
    </button>
  );

  return (
    <div className="pb-6">
      <HelmetTitle title="Help" />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold text-[rgb(var(--c-text))]">সহায়তা</h1>
        <div className="w-full sm:w-80">
          <InputElement
            id="helpSearch"
            name="helpSearch"
            label="সার্চ"
            placeholder="বিষয় বা লেখার ভেতরে খুঁজুন"
            value={query}
            onChange={(event: any) => setQuery(event.target.value)}
            className="w-full"
          />
        </div>
      </div>

      {state === 'error' ? (
        <div className="rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 text-sm text-[rgb(var(--c-text))]">
          {HELP_UNAVAILABLE_MESSAGE}
        </div>
      ) : state === 'loading' ? (
        <p className="text-sm text-[rgb(var(--c-text-muted))]">লোড হচ্ছে…</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="max-h-[70vh] min-w-0 overflow-y-auto rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-2 text-[rgb(var(--c-text))] lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]">
            {menus.every((menu) => linksFor(menu.id).length === 0) &&
            visibleVariantLinks.length === 0 &&
            otherTopics.length === 0 ? (
              <p className="px-2 py-2 text-sm text-[rgb(var(--c-text-muted))]">
                {needle ? 'কিছু পাওয়া যায়নি।' : 'এখনো কোনো বিষয় যোগ হয়নি।'}
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {menus.map((menu) => {
                  const links = linksFor(menu.id);

                  if (needle && links.length === 0) return null;

                  const active = activeLink?.menuId === menu.id && !activeVariant;
                  const open = needle ? true : openMenu === menu.id;

                  return (
                    <SidebarLinkGroup
                      key={menu.id}
                      activeCondition={active}
                      menuId={menu.id}
                      open={open}
                      handleClick={() => setOpenMenu(open ? null : menu.id)}
                    >
                      {(handleClick) => (
                        <>
                          <button
                            type="button"
                            onClick={handleClick}
                            aria-expanded={open}
                            className={`group relative flex w-full items-center gap-2.5 rounded-sm px-4 py-2 text-left font-medium duration-300 ease-in-out hover:bg-gray-300 dark:text-bodydark1 dark:hover:bg-meta-4 ${
                              active
                                ? 'border-l-4 border-blue-500 bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-[rgb(var(--c-text))]'
                                : ''
                            }`}
                          >
                            {SIDEBAR_MENU_ICONS[menu.id] ?? <FiHelpCircle />}
                            <span className="min-w-0 flex-1 truncate">{menu.title}</span>
                            <FiChevronRight
                              className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                            />
                          </button>

                          <div className={open ? 'block' : 'hidden'}>
                            <ul className="mt-2 mb-3 flex flex-col gap-1 pl-6">
                              {links.map((link) => (
                                <li key={link.id}>
                                  {link.topic ? (
                                    topicButton(link.topic, link.title, link.topic === topicId && activeLink?.id === link.id)
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={clearTopic}
                                      className={`${SUB_MENU_BASE} w-full text-left text-sm text-[rgb(var(--c-text-muted))]`}
                                    >
                                      {link.title}
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </SidebarLinkGroup>
                  );
                })}

                {VARIANT_MENUS.map((menu) => {
                  const links = visibleVariantLinks.filter((link) => link.menuId === menu.id);

                  if (needle && links.length === 0) return null;

                  const active = activeVariant?.menuId === menu.id;
                  const open = needle ? true : openMenu === menu.id;

                  return (
                    <SidebarLinkGroup
                      key={menu.id}
                      activeCondition={active}
                      menuId={menu.id}
                      open={open}
                      handleClick={() => setOpenMenu(open ? null : menu.id)}
                    >
                      {(handleClick) => (
                        <>
                          <button
                            type="button"
                            onClick={handleClick}
                            aria-expanded={open}
                            className={`group relative flex w-full items-center gap-2.5 rounded-sm px-4 py-2 text-left font-medium duration-300 ease-in-out hover:bg-gray-300 dark:text-bodydark1 dark:hover:bg-meta-4 ${
                              active
                                ? 'border-l-4 border-blue-500 bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-[rgb(var(--c-text))]'
                                : ''
                            }`}
                          >
                            {menu.id === '__sales__' ? <FiShoppingCart /> : <FiTruck />}
                            <span className="min-w-0 flex-1 truncate">{menu.title}</span>
                            <FiChevronRight
                              className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
                            />
                          </button>

                          <div className={open ? 'block' : 'hidden'}>
                            <ul className="mt-2 mb-3 flex flex-col gap-1 pl-6">
                              {links.map((link) => (
                                <li key={link.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!link.topic) return;
                                      // openTopic clears the variant mark first;
                                      // setting it afterwards keeps this menu open.
                                      openTopic(link.topic);
                                      setVariantMenu(menu.id);
                                    }}
                                    aria-current={link.topic === topicId && active ? 'page' : undefined}
                                    className={`${SUB_MENU_BASE} w-full text-left text-sm ${
                                      link.topic === topicId && active
                                        ? SUB_MENU_ACTIVE
                                        : 'text-[rgb(var(--c-text))]'
                                    }`}
                                  >
                                    {link.title}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </>
                      )}
                    </SidebarLinkGroup>
                  );
                })}

                {otherTopics.length > 0 ? (
                  <SidebarLinkGroup
                    activeCondition={otherActive}
                    menuId={OTHER_MENU_ID}
                    open={otherOpen}
                    handleClick={() => setOpenMenu(otherOpen ? null : OTHER_MENU_ID)}
                  >
                    {(handleClick) => (
                      <>
                        <button
                          type="button"
                          onClick={handleClick}
                          aria-expanded={otherOpen}
                          className={`group relative flex w-full items-center gap-2.5 rounded-sm px-4 py-2 text-left font-medium duration-300 ease-in-out hover:bg-gray-300 dark:text-bodydark1 dark:hover:bg-meta-4 ${
                            otherActive
                              ? 'border-l-4 border-blue-500 bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-[rgb(var(--c-text))]'
                              : ''
                          }`}
                        >
                          <FiHelpCircle />
                          <span className="min-w-0 flex-1 truncate">অন্যান্য বিষয়</span>
                          <FiChevronRight
                            className={`shrink-0 transition-transform duration-200 ${otherOpen ? 'rotate-90' : ''}`}
                          />
                        </button>

                        <div className={otherOpen ? 'block' : 'hidden'}>
                          <ul className="mt-2 mb-3 flex flex-col gap-1 pl-6">
                            {otherTopics.map(([id, one]) => (
                              <li key={id}>{topicButton(id, one.title, id === topicId)}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </SidebarLinkGroup>
                ) : null}
              </ul>
            )}
          </aside>

          <section className="min-w-0 rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4">
            {allowedTopic ? (
              <>
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-[rgb(var(--c-text))]">
                      {allowedTopic.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-[rgb(var(--c-text-muted))]">
                      {allowedTopic.module || ''}
                      {allowedTopic.updated ? (
                        <span className={allowedTopic.module ? 'ml-2' : ''}>
                          হালনাগাদ: {allowedTopic.updated}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <ButtonLoading
                    onClick={() => handlePrint()}
                    buttonLoading={false}
                    label="Print"
                    className="whitespace-nowrap text-center mr-0 py-2"
                    icon={<FiPrinter className="text-lg ml-2 mr-2" />}
                  />
                </div>

                <HelpTopicView topic={allowedTopic} />
              </>
            ) : topicId && state === 'ready' ? (
              <p className="text-sm text-[rgb(var(--c-text))]">এই বিষয়টি পাওয়া যায়নি।</p>
            ) : (
              <p className="text-sm text-[rgb(var(--c-text-muted))]">
                বাম দিকের মেনু থেকে একটি বিষয় বেছে নিন, অথবা সার্চ করুন।{' '}
                <Link to={routes.help} className="text-[rgb(var(--c-primary))] underline">
                  সব বিষয়
                </Link>
              </p>
            )}
          </section>
        </div>
      )}

      {/* Print paper: only the chosen topic, everything on it solid black. */}
      {allowedTopic ? (
        <div style={{ display: 'none' }}>
          <div ref={printRef} className="help-print" style={{ color: '#000', background: '#fff' }}>
            <style>{`
              .help-print, .help-print * { color: #000 !important; background: transparent !important; border-color: #000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .help-print h1 { font-size: 16px; margin: 0 0 8px; }
              .help-print h3 { font-size: 13px; margin: 10px 0 4px; }
              .help-print p, .help-print li, .help-print td, .help-print th { font-size: 11px; line-height: 1.5; }
              .help-print table { width: 100%; border-collapse: collapse; }
              .help-print th, .help-print td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
            `}</style>
            <HelpTopicView topic={allowedTopic} print />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default HelpPage;
