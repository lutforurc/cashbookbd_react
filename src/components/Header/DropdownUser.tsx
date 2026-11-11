import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ClickOutside from '../ClickOutside';
import UserOne from '../../images/user/user-demo.png';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../features/authReducer';
import DarkModeSwitcher from './DarkModeSwitcher';
import useColorMode from '../../hooks/useColorMode';
import routes from '../services/appRoutes';
import { API_ALL_DDL_BRANCH_URL } from '../services/apiRoutes';
import httpService from '../services/httpService';
import { hasPermission } from '../utils/permissionChecker';
import { FiGrid, FiGitBranch } from 'react-icons/fi';
import {
  MdLock,
  MdHistory,
  MdDelete,
  MdWorkspacePremium,
  MdExitToApp,
  MdContacts,
} from 'react-icons/md';
import { Button } from '../../pages/UiElements/CustomButtons';


const DropdownUser = () => {
  const dispatch = useDispatch();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isLoggedIn, isLoading, me } = useSelector((s: any) => s.auth);
  const settings = useSelector((s: any) => s.settings);
  const [trxDate, setTrxDate] = useState<string>('');
  const dayclose = useSelector((s: any) => s.dayclose);
  const [colorMode] = useColorMode();
  const permissions = settings?.data?.permissions ?? [];
  const { pathname } = useLocation();
  /**
   * Tasks somebody else put on this user's board that they have not opened yet.
   *
   * Followed My Tasks here out of the sidebar. Re-asked on every navigation
   * rather than on a timer -- moving around the app is when the count could have
   * changed, and it costs one small query.
   */
  const [newAssignedCount, setNewAssignedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    httpService
      .get('/user-todos/summary')
      .then((res) => {
        if (cancelled) return;
        const payload = res.data?.data?.data ?? res.data?.data;
        setNewAssignedCount(Number(payload?.assigned_new ?? 0));
      })
      // A badge is not worth a toast, and the endpoint is missing on any
      // deployment where the API has not been updated yet.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [pathname]);


  /**
   * How many branches this login may work in. `null` until it is known, so the
   * menu row does not appear for a user whose reach is one branch -- a page
   * whose only answer would be "this is already your branch".
   *
   * Asked for when the menu opens, not on mount: this header is on every screen
   * and the row is only wanted on the one screen the menu is open on.
   */
  const [branchCount, setBranchCount] = useState<number | null>(null);

  useEffect(() => {
    if (!dropdownOpen || branchCount !== null) return;

    let cancelled = false;

    httpService
      .get(`${API_ALL_DDL_BRANCH_URL}?own_company=1`)
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.success ? res.data?.data?.data : null;
        setBranchCount(Array.isArray(list) ? list.length : 0);
      })
      .catch(() => {
        if (!cancelled) setBranchCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [dropdownOpen, branchCount]);

  useEffect(() => {
    const handleStorageChange = (event: any) => {
      // Check if the 'settings_updated' key was updated
      if (event.key === 'settings_updated') {
        //dispatch(getSettings()); // Fetch updated settings in the current tab
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);



  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative">
      <Link
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-4"
        to="#"
      >
        <span className="hidden text-right lg:block">
          <span className="block text-sm font-medium text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
            {me.name}
          </span>
          <span className="block text-xs text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Trx. Dt. {settings?.data?.trx_dt}</span>
        </span>
        {/* The count rides on the avatar, not only on the menu row inside.
            My Tasks now lives behind a closed dropdown, and a badge nobody can
            see until they open the thing it is telling them to open says
            nothing at all. */}
        <span className="relative h-9 w-9 shrink-0">
          <span className="block h-9 w-9 overflow-hidden rounded-full">
            <img
              src={me.profile_photo || UserOne}
              alt="User"
              className="h-full w-full object-cover"
            />
          </span>

          {newAssignedCount > 0 ? (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-danger px-1 text-[10px] font-bold leading-none text-white dark:border-boxdark"
              title={`${newAssignedCount} new task${newAssignedCount > 1 ? 's' : ''} assigned to you`}
            >
              {newAssignedCount}
            </span>
          ) : null}
        </span>

        <svg
          className="hidden fill-current sm:block"
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.410765 0.910734C0.736202 0.585297 1.26384 0.585297 1.58928 0.910734L6.00002 5.32148L10.4108 0.910734C10.7362 0.585297 11.2638 0.585297 11.5893 0.910734C11.9147 1.23617 11.9147 1.76381 11.5893 2.08924L6.58928 7.08924C6.26384 7.41468 5.7362 7.41468 5.41077 7.08924L0.410765 2.08924C0.0853277 1.76381 0.0853277 1.23617 0.410765 0.910734Z"
            fill=""
          />
        </svg>
      </Link>

      {/* <!-- Dropdown Start --> */}
      {dropdownOpen && (
        <div
          className={`absolute right-0 mt-4 flex w-62.5 flex-col rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default`}
        >
          <ul className="flex flex-col gap-5 border-b border-[rgb(var(--c-border))] px-6 py-7.5">
            <li>
              <Link
                to={routes.dashboard}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                <FiGrid size={22} />
                Dashboard
              </Link>
            </li>
            {/* Above My Profile: it is the one row here somebody opens several
                times a day, and everything under it is settings. */}
            <li>
              <Link
                to={routes.my_tasks}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                {/* The same checklist-card glyph the mobile app draws for this
                    row (a page with two ticked items), in its 24px viewBox and
                    taking the row's colour. */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M6.5 3H17.5Q20.5 3 20.5 6.5V17.5Q20.5 20.5 17.5 20.5H6.5Q3.5 20.5 3.5 17.5V6.5Q3.5 3 6.5 3ZM7 9.2L8.7 10.9L11.5 7.8M14 9.6H17.4M7 15.2L8.7 16.9L11.5 13.8M14 15.6H17.4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                My Tasks
                {newAssignedCount > 0 ? (
                  <span
                    className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white"
                    title={`${newAssignedCount} new task${newAssignedCount > 1 ? 's' : ''} assigned to you`}
                  >
                    {newAssignedCount}
                  </span>
                ) : null}
              </Link>
            </li>
            <li>
              <Link
                to="/profile"
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                <svg
                  className="fill-current"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 9.62499C8.42188 9.62499 6.35938 7.59687 6.35938 5.12187C6.35938 2.64687 8.42188 0.618744 11 0.618744C13.5781 0.618744 15.6406 2.64687 15.6406 5.12187C15.6406 7.59687 13.5781 9.62499 11 9.62499ZM11 2.16562C9.28125 2.16562 7.90625 3.50624 7.90625 5.12187C7.90625 6.73749 9.28125 8.07812 11 8.07812C12.7188 8.07812 14.0938 6.73749 14.0938 5.12187C14.0938 3.50624 12.7188 2.16562 11 2.16562Z"
                    fill=""
                  />
                  <path
                    d="M17.7719 21.4156H4.2281C3.5406 21.4156 2.9906 20.8656 2.9906 20.1781V17.0844C2.9906 13.7156 5.7406 10.9656 9.10935 10.9656H12.925C16.2937 10.9656 19.0437 13.7156 19.0437 17.0844V20.1781C19.0094 20.8312 18.4594 21.4156 17.7719 21.4156ZM4.53748 19.8687H17.4969V17.0844C17.4969 14.575 15.4344 12.5125 12.925 12.5125H9.07498C6.5656 12.5125 4.5031 14.575 4.5031 17.0844V19.8687H4.53748Z"
                    fill=""
                  />
                </svg>
                My Profile
              </Link>
            </li>
            {branchCount !== null && branchCount > 1 && (
              <li>
                <Link
                  to={routes.switch_branch}
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                >
                  <FiGitBranch size={22} />
                  Switch Branch
                </Link>
              </li>
            )}
            <li>
              <div className="flex items-center justify-end gap-3 rounded-sm bg-gray-50 px-3 py-2.5 text-sm font-medium dark:bg-meta-4 lg:text-base">
                <div className="flex items-center gap-2.5">
                  <span className="min-w-10 text-right text-xs font-medium text-[rgb(var(--c-text-muted))] dark:text-bodydark2">
                    {colorMode === 'dark' ? 'Dark' : 'Light'}
                  </span>
                  <DarkModeSwitcher />
                </div>
              </div>
            </li>
            <li>
              <Link
                to="#"
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                <MdContacts size={24} />
                My Contacts
              </Link>
            </li>
            {/* Was "Account Settings" pointing at /settings, which no route
                served -- the page it opened was blank. The one account setting
                a user has to reach on their own is their password. */}
            <li>
              <Link
                to={routes.change_password}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                <MdLock size={24} />
                Change Password
              </Link>
            </li>
            <li>
              <Link
                to={routes.my_devices}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                {/* The same monitor-and-phone glyph the mobile app draws for
                    this row, in its 24px viewBox and taking the row's colour. */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M3.4 4.5H12.6Q14 4.5 14 5.9V11.6Q14 13 12.6 13H3.4Q2 13 2 11.6V5.9Q2 4.5 3.4 4.5ZM8 13V16.6M5.4 16.6H10.6M17.4 8.8H20.2Q22 8.8 22 10.6V18.7Q22 20.5 20.2 20.5H17.4Q15.6 20.5 15.6 18.7V10.6Q15.6 8.8 17.4 8.8ZM17.6 18.2H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                My Devices
              </Link>
            </li>
            
            {me && (
              <li>
                <Link
                  to={routes.my_subscription}
                  className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                >
                  {/* The same Subscription glyph the mobile app draws, in its
                      own 24px viewBox and taking the row's colour, so the two
                      clients show one icon rather than two ideas of one. */}
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.1 4H18.9Q21.5 4 21.5 6.6V7.6Q21.5 10.2 18.9 10.2H5.1Q2.5 10.2 2.5 7.6V6.6Q2.5 4 5.1 4Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10.2 10.5V14.3Q7.8 14.7 7.8 16.7Q7.8 18.4 9.3 19.2Q9.5 20.6 11.1 20.6H15Q17.4 20.6 17.4 18.3V16.4Q17.4 14.4 15.3 14.4H12.6V10.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Subscription
                </Link>
              </li>
            )}
            {hasPermission(permissions, 'subscription.history') && (
              <li>
                <Link
                  to={routes.subscription_admin}
                  className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                >
                  <MdHistory size={24} />
                  Subscription History
                </Link>
              </li>
            )}
            {/* Settings → Account → Request Account Deletion. The page itself is
                public; opening it from here is the signed-in entry point, and it
                prefills from the session and offers company-wide deletion only
                to the owner the backend recognises. */}
            <li>
              <Link
                to={routes.account_deletion_request}
                className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
              >
                {/* The trash glyph the mobile app shows on this row, taking the
                    row's colour. */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                Request Account Deletion
              </Link>
            </li>
            {hasPermission(permissions, 'account.deletion.manage') && (
              <li>
                <Link
                  to={routes.account_deletion_admin}
                  className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                >
                  <MdDelete size={24} />
                  Deletion Requests
                </Link>
              </li>
            )}
            {hasPermission(permissions, 'subscription.plans') && (
              <li>
                <Link
                  to={routes.subscription_plan_list}
                  className="flex items-center gap-3.5 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
                >
                  <MdWorkspacePremium size={24} />
                  Subscription Plans
                </Link>
              </li>
            )}
          </ul>
          <Button
            onClick={() => dispatch(logout())}
            className="flex items-center gap-3.5 px-6 py-4 text-sm font-medium duration-300 ease-in-out hover:text-primary lg:text-base"
          >
            <MdExitToApp size={24} />
            Log Out
          </Button>
        </div>
      )}
      {/* <!-- Dropdown End --> */}
    </ClickOutside>
  );
};

export default DropdownUser;
