import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FiChevronDown,
  FiChevronUp,
  FiEye,
  FiEyeOff,
  FiMenu,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
} from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { SIDEBAR_MENUS, SIDEBAR_SUBMENUS } from '../../Sidebar';
import {
  DIVIDER_LABEL_MAX,
  dividerLabel,
  isDivider,
  useSidebarCustomization,
  useSidebarSubCustomization,
} from '../../Sidebar/sidebarCustomization';
import { Input } from '../../utils/fields/FormControls';

/**
 * Where a user arranges their own sidebar.
 *
 * This began as a panel inside the sidebar itself, which was the wrong place:
 * arranging 16 menus and the 138 entries under them needs more room than a
 * column 250px wide, and the panel pushed the very menus being arranged out of
 * view. On a page there is room to show a menu and its entries side by side.
 *
 * Changes save as they are made and reach the sidebar immediately -- the
 * customisation hooks announce every write, so the sidebar on the left of this
 * page rearranges itself as you drag. There is no Save button because there is
 * nothing to save: the arrangement is already stored, against the user, so it
 * is the same on any machine they log in from.
 */

type DragState = { id: string; over: string | null } | null;

const MenuArrangement = () => {
  const settings = useSelector((state: any) => state.settings);
  const {
    ordered: orderedMenus,
    move: moveMenu,
    reorder: reorderMenu,
    toggleHidden: toggleMenuHidden,
    isHidden: isMenuHidden,
    reset: resetMenus,
    addDivider,
    renameDivider,
    removeDivider,
  } = useSidebarCustomization('sidebar-menu-order', SIDEBAR_MENUS);

  const [newDivider, setNewDivider] = useState('');

  // What is being typed into a divider's name field, before it is committed on
  // blur. Held apart from the saved name so every keystroke is not a save.
  const [dividerDraft, setDividerDraft] = useState<Record<string, string>>({});

  const {
    slot: subSlot,
    idsOf: subIdsOf,
    moveSub,
    reorderSub,
    toggleSubHidden,
    resetSub,
    addSubDivider,
    renameSubDivider,
    removeSubDivider,
  } = useSidebarSubCustomization('sidebar-sub-order');

  const [newSubDivider, setNewSubDivider] = useState('');
  const [subDraft, setSubDraft] = useState<Record<string, string>>({});

  // The menu whose entries are on the right. Defaults to the first one that has
  // any, so the page never opens with an empty half.
  const [selectedMenu, setSelectedMenu] = useState<string>(
    () => orderedMenus.find((menu) => (SIDEBAR_SUBMENUS[menu.id]?.length ?? 0) > 1)?.id ?? '',
  );

  const [menuDrag, setMenuDrag] = useState<DragState>(null);
  const [subDrag, setSubDrag] = useState<DragState>(null);

  const subItems = SIDEBAR_SUBMENUS[selectedMenu] ?? [];
  const declared = subItems.map((item) => item.id);
  const subOrder = subIdsOf(selectedMenu, declared);

  const rowClass = (dragging: boolean, isTarget: boolean) =>
    'flex cursor-grab items-center gap-2 rounded-sm border px-2 py-1.5 text-sm active:cursor-grabbing ' +
    (dragging
      ? 'border-primary bg-gray-100 opacity-60 dark:bg-meta-4'
      : isTarget
        ? 'border-primary bg-gray-100 dark:bg-meta-4'
        : 'border-stroke dark:border-strokedark');

  return (
    <div className="p-2">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Arrange Menu" screen="menu-arrangement" />
      </div>

      {/* The controls sit in the panel they act on, not in a banner above both.
          A header that only explains and holds buttons costs a whole band of
          screen and pushes the lists -- the thing being arranged -- down out of
          reach on a laptop. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---------------- main menus ---------------- */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Main menu
            </h3>

            <div className="flex flex-wrap items-center gap-2">
              {/* Named if you type a name, a plain rule if you do not. The button
                  says which it will be rather than refusing the click, so an
                  unnamed line is a choice and not a thing that failed. */}
              <Input
                value={newDivider}
                maxLength={DIVIDER_LABEL_MAX}
                placeholder="Divider name"
                onChange={(e) => setNewDivider(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  addDivider(newDivider);
                  setNewDivider('');
                }}
                className="w-40 rounded-sm border border-stroke px-2 text-xs outline-none dark:border-strokedark dark:bg-boxdark dark:text-white"
              />
              <ButtonLoading
                onClick={() => {
                  addDivider(newDivider);
                  setNewDivider('');
                }}
                buttonLoading={false}
                label={newDivider.trim() ? 'Divider' : 'Line'}
                size="sm"
                className="whitespace-nowrap"
                icon={<FiPlus />}
              />
              <ButtonLoading
                onClick={() => {
                  resetMenus();
                  resetSub();
                }}
                buttonLoading={false}
                label="Reset"
                size="sm"
                className="whitespace-nowrap"
                icon={<FiRotateCcw />}
              />
            </div>
          </div>

          <ul className="flex flex-col gap-1.5">
            {orderedMenus.map((menu, index) => {
              const hasEntries = (SIDEBAR_SUBMENUS[menu.id]?.length ?? 0) > 1;

              return (
                <li
                  key={menu.id}
                  draggable
                  onDragStart={(e) => {
                    // The payload goes first: Firefox starts no drag without
                    // one. The state that dims the row is deferred a tick,
                    // because re-rendering the element the browser is still
                    // taking its drag image from cancels the drag outright --
                    // which is why dragging did nothing at all here.
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', menu.id);
                    setTimeout(() => setMenuDrag({ id: menu.id, over: null }), 0);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    // No `current &&` guard: the drag state is set a tick late,
                    // so the first dragover can arrive before it exists and the
                    // row under the cursor would never light up.
                    setMenuDrag((current) =>
                      current?.over === menu.id ? current : { id: current?.id ?? '', over: menu.id },
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragged = menuDrag?.id || e.dataTransfer.getData('text/plain');
                    if (dragged) reorderMenu(dragged, menu.id);
                    setMenuDrag(null);
                  }}
                  onDragEnd={() => setMenuDrag(null)}
                  // A drag that ends on this row also fires a click, which would
                  // swap the panel on the right just as the user finished moving
                  // something on the left. Only a click with no drag behind it
                  // counts as choosing a menu.
                  onClick={() => {
                    if (menuDrag) return;
                    if (hasEntries) setSelectedMenu(menu.id);
                  }}
                  className={
                    rowClass(menuDrag?.id === menu.id, menuDrag?.over === menu.id && !!menuDrag?.id) +
                    (selectedMenu === menu.id ? ' ring-1 ring-primary' : '') +
                    (isMenuHidden(menu.id) ? ' opacity-50' : '')
                  }
                >
                  <FiMenu className="shrink-0 text-slate-400" />

                  {/* A divider is edited in place. It has no screen behind it to
                      visit, so its name is the only thing there is to change,
                      and a field costs less than a rename dialogue. */}
                  {isDivider(menu.id) ? (
                    <>
                      <Input
                        value={dividerDraft[menu.id] ?? menu.title}
                        maxLength={DIVIDER_LABEL_MAX}
                        placeholder="(plain line)"
                        draggable={false}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setDividerDraft((current) => ({ ...current, [menu.id]: e.target.value }))
                        }
                        onBlur={(e) => renameDivider(menu.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className="min-w-0 flex-1 rounded-sm border border-stroke bg-transparent px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-black outline-none dark:border-strokedark dark:text-white"
                      />
                      <Button
                        type="button"
                        draggable={false}
                        title="Remove divider"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeDivider(menu.id);
                        }}
                        className="rounded p-1 text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
                      >
                        <FiTrash2 />
                      </Button>
                    </>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-black dark:text-white">
                      {menu.title}
                    </span>
                  )}

                  {hasEntries ? (
                    <span className="shrink-0 rounded-sm bg-gray-100 px-1.5 text-xs text-slate-500 dark:bg-meta-4 dark:text-slate-300">
                      {SIDEBAR_SUBMENUS[menu.id].length}
                    </span>
                  ) : null}

                  <Button
                    type="button"
                    draggable={false}
                    title="Move up"
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveMenu(menu.id, 'up');
                    }}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-meta-4"
                  >
                    <FiChevronUp />
                  </Button>
                  <Button
                    type="button"
                    draggable={false}
                    title="Move down"
                    disabled={index === orderedMenus.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveMenu(menu.id, 'down');
                    }}
                    className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-meta-4"
                  >
                    <FiChevronDown />
                  </Button>
                  {/* Hiding is for menus. A divider that is in the way is
                      deleted, not hidden -- there is nothing behind it to keep. */}
                  {!isDivider(menu.id) ? (
                    <Button
                      type="button"
                      draggable={false}
                      title={isMenuHidden(menu.id) ? 'Show' : 'Hide'}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenuHidden(menu.id);
                      }}
                      className="rounded p-1 hover:bg-gray-100 dark:hover:bg-meta-4"
                    >
                      {isMenuHidden(menu.id) ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {/* Kept, but under the list rather than over it. It answers the two
              questions the page actually raises -- how do I move something, and
              does this affect anyone else -- and is worth a line for a screen
              most people meet once. */}
          <p className="mt-3 border-t border-stroke pt-3 text-xs leading-snug text-slate-500 dark:border-strokedark dark:text-slate-400">
            Drag a menu where you want it, or use the arrows. Hide anything you
            never open. This is yours alone and follows you to any computer you
            log in from -- nobody else's menu changes.
          </p>
        </div>

        {/* ---------------- the chosen menu's entries ---------------- */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {selectedMenu
                ? `Inside ${SIDEBAR_MENUS.find((menu) => menu.id === selectedMenu)?.title ?? ''}`
                : 'Inside'}
            </h3>

            {/* Dividers work inside a menu too, so a long one like Reports can
                be broken into named groups the same way the sidebar itself is. */}
            {selectedMenu ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newSubDivider}
                  maxLength={DIVIDER_LABEL_MAX}
                  placeholder="Divider name"
                  onChange={(e) => setNewSubDivider(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    addSubDivider(selectedMenu, declared, newSubDivider);
                    setNewSubDivider('');
                  }}
                  className="w-40 rounded-sm border border-stroke px-2 text-xs outline-none dark:border-strokedark dark:bg-boxdark dark:text-white"
                />
                <ButtonLoading
                  onClick={() => {
                    addSubDivider(selectedMenu, declared, newSubDivider);
                    setNewSubDivider('');
                  }}
                  buttonLoading={false}
                  label={newSubDivider.trim() ? 'Divider' : 'Line'}
                  size="sm"
                  className="whitespace-nowrap"
                  icon={<FiPlus />}
                />
              </div>
            ) : null}
          </div>

          {!subOrder.length ? (
            <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
              Pick a menu on the left to arrange what is inside it.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {subOrder.map((itemId, index) => {
                // A divider is not in SIDEBAR_SUBMENUS -- nothing declares one --
                // so its label comes out of its own id.
                const item = isDivider(itemId)
                  ? { id: itemId, title: dividerLabel(itemId) }
                  : subItems.find((entry) => entry.id === itemId);
                if (!item) return null;

                const hidden = subSlot(selectedMenu, itemId).display === 'none';

                return (
                  <li
                    key={itemId}
                    draggable
                    onDragStart={(e) => {
                      // Deferred for the same reason as the menu list above.
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', itemId);
                      setTimeout(() => setSubDrag({ id: itemId, over: null }), 0);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setSubDrag((current) =>
                        current?.over === itemId ? current : { id: current?.id ?? '', over: itemId },
                      );
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dragged = subDrag?.id || e.dataTransfer.getData('text/plain');
                      if (dragged) reorderSub(selectedMenu, declared, dragged, itemId);
                      setSubDrag(null);
                    }}
                    onDragEnd={() => setSubDrag(null)}
                    className={
                      rowClass(subDrag?.id === itemId, subDrag?.over === itemId && !!subDrag?.id) +
                      (hidden ? ' opacity-50' : '')
                    }
                  >
                    <FiMenu className="shrink-0 text-slate-400" />

                    {isDivider(itemId) ? (
                      <>
                        <Input
                          value={subDraft[itemId] ?? item.title}
                          maxLength={DIVIDER_LABEL_MAX}
                          placeholder="(plain line)"
                          draggable={false}
                          onChange={(e) =>
                            setSubDraft((current) => ({ ...current, [itemId]: e.target.value }))
                          }
                          onBlur={(e) =>
                            renameSubDivider(selectedMenu, declared, itemId, e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                          className="min-w-0 flex-1 rounded-sm border border-stroke bg-transparent px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wide text-black outline-none dark:border-strokedark dark:text-white"
                        />
                        <Button
                          type="button"
                          draggable={false}
                          title="Remove divider"
                          onClick={() => removeSubDivider(selectedMenu, declared, itemId)}
                          className="rounded p-1 text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
                        >
                          <FiTrash2 />
                        </Button>
                      </>
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-black dark:text-white">
                        {item.title}
                      </span>
                    )}

                    <Button
                      type="button"
                      draggable={false}
                      title="Move up"
                      disabled={index === 0}
                      onClick={() => moveSub(selectedMenu, declared, itemId, 'up')}
                      className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-meta-4"
                    >
                      <FiChevronUp />
                    </Button>
                    <Button
                      type="button"
                      draggable={false}
                      title="Move down"
                      disabled={index === subOrder.length - 1}
                      onClick={() => moveSub(selectedMenu, declared, itemId, 'down')}
                      className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-meta-4"
                    >
                      <FiChevronDown />
                    </Button>
                    <Button
                      type="button"
                      draggable={false}
                      title={hidden ? 'Show' : 'Hide'}
                      onClick={() => toggleSubHidden(selectedMenu, itemId)}
                      className="rounded p-1 hover:bg-gray-100 dark:hover:bg-meta-4"
                    >
                      {hidden ? <FiEyeOff /> : <FiEye />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuArrangement;
