import React, { useEffect, useState } from 'react';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import { generateUserTemporaryPassword, getUser } from './userSlice';
import Loader from '../../../common/Loader';
import { FiCheckSquare, FiEdit2, FiKey, FiMinus, FiPlus } from 'react-icons/fi';
import Pagination from '../../utils/utils-functions/Pagination';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SearchInput from '../../utils/fields/SearchInput';
import routes from '../../services/appRoutes';
import { hasPermission } from '../../utils/permissionChecker';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import httpService from '../../services/httpService';
import { API_USER_LIST_URL } from '../../services/apiRoutes';

const UserList = () => {
  const userList = useSelector((state) => state.users);
  const settings = useSelector((state: any) => state.settings);
  const subscription = useSelector((state: any) => state.subscription);
  const auth = useSelector((state: any) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userPermissions = settings?.data?.permissions || [];
  const currentCompanyId = Number(auth?.me?.company_id || settings?.data?.user?.company_id || 0);
  const currentUserId = Number(auth?.me?.id || settings?.data?.user?.id || 0);
  const isSaasOwnerList = currentCompanyId <= 1 || currentUserId === 1;
  const canCreateUser =
    hasPermission(userPermissions, 'all.user.create') ||
    hasPermission(userPermissions, 'user.create') ||
    hasPermission(userPermissions, 'user.store') ||
    hasPermission(userPermissions, 'all.user.add');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  // Off, the list is one owner per company — who signed each one up. On, it is
  // every user those companies have, which is what "show me the company users"
  // actually asks for.
  const [showAllUsers, setShowAllUsers] = useState(false);
  // One company opened at a time: two open at once and the list stops reading
  // as owners with their people under them.
  const [expandedCompanyId, setExpandedCompanyId] = useState<number | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<any[]>([]);
  const [expandingCompanyId, setExpandingCompanyId] = useState<number | null>(null);
  // Declared up here with the other state: both tables' Action columns read it,
  // and the expanded one is built further down this file.
  const [temporaryPasswordLoadingId, setTemporaryPasswordLoadingId] = useState<string | null>(null);

  /** Opens a company's people under its owner, or closes them again. */
  const toggleCompany = async (companyId: number) => {
    if (!companyId) return;

    if (expandedCompanyId === companyId) {
      setExpandedCompanyId(null);
      setExpandedUsers([]);
      return;
    }

    setExpandingCompanyId(companyId);
    try {
      const response = await httpService.get(
        `${API_USER_LIST_URL}?page=1&per_page=200&search=&company_id=${companyId}`,
      );
      const rows = response?.data?.data?.data?.data ?? [];

      setExpandedCompanyId(companyId);
      // The owner is already the row being expanded; repeating it under itself
      // reads as a duplicate rather than as a child.
      setExpandedUsers(
        rows.filter((user: any) => Number(user?.id) !== Number(ownerIdOf(companyId))),
      );
    } catch {
      toast.error('Could not load that company\'s users.');
      setExpandedCompanyId(null);
      setExpandedUsers([]);
    } finally {
      setExpandingCompanyId(null);
    }
  };

  /** The owner row currently shown for a company, so it is not repeated. */
  const ownerIdOf = (companyId: number) =>
    (userList?.data?.data ?? []).find(
      (row: any) => Number(row?.company_id) === Number(companyId),
    )?.id;

  /** The company whose users are open, for the panel's heading. */
  const expandedCompanyName = (tableData ?? []).find(
    (row: any) => Number(row?.company_id) === expandedCompanyId,
  )?.company;

  /**
   * The expanded company's own table.
   *
   * Company and Working Branch are left out: every row here belongs to the one
   * company named in the heading, so repeating it down a column says nothing.
   * Email and phone get a column each rather than sharing one, since this is
   * the list somebody reaches for when they need to make contact.
   */
  const expandedColumns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center w-20',
      render: (_row: any, index: number) => index + 1,
    },
    {
      key: 'name',
      header: 'User Name',
    },
    {
      key: 'email',
      header: 'Email',
      render: (row: any) => row?.email || '-',
    },
    {
      key: 'phone',
      header: 'Mobile / Phone',
      render: (row: any) => row?.phone || '-',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: any) => {
        const roleName = getPrimaryRoleName(row);
        return roleName ? (
          <span className="rounded border border-stroke px-2 py-0.5 text-xs dark:border-strokedark">
            {roleName}
          </span>
        ) : (
          '-'
        );
      },
    },
    {
      // The same two the owner's row above offers, on the same rows they act on.
      // A company's people were reachable here but not editable, so a forgotten
      // password meant leaving this list, finding the user somewhere else and
      // coming back -- for the row that was already under the cursor.
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center w-28',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleEditUser(row.user_id)}
            className="text-blue-500"
            title="Edit user"
          >
            <FiEdit2 className="cursor-pointer w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleGenerateTemporaryPassword(row.user_id)}
            className="text-blue-500"
            title="Generate temporary password"
            disabled={temporaryPasswordLoadingId === row.user_id}
          >
            <FiKey
              className={`cursor-pointer w-5 h-5 ${
                temporaryPasswordLoadingId === row.user_id ? 'opacity-50' : ''
              }`}
            />
          </button>
        </div>
      ),
    },
  ];
  const maxUsers = subscription?.current?.max_users;
  const currentUsers = Number(userList?.data?.total || 0);
  const userLimitReached = typeof maxUsers === 'number' && maxUsers > 0 && currentUsers >= maxUsers;
  const handleSelectChange = (page: any) => {
    const nextPerPage = Number(page.target.value);
    setPerPage(nextPerPage);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil((userList?.data?.total || 0) / nextPerPage));
    setTableData(userList.data.data);
  };

  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    dispatch(getUser({
      page: 1,
      perPage,
      search,
      ownersOnly: isSaasOwnerList,
      allTenantUsers: isSaasOwnerList && showAllUsers,
    }));
  };

  useEffect(() => {
    dispatch(getUser({
      page,
      perPage,
      search,
      ownersOnly: isSaasOwnerList,
      allTenantUsers: isSaasOwnerList && showAllUsers,
    }));
    if (userList?.data?.total) {
      setTotalPages(Math.ceil(userList?.data?.total / perPage));
      setTableData(userList.data.data);
    }
    // showAllUsers is in here so flipping it refetches; the page is reset with
    // it, since page 4 of the owners is rarely page 4 of everybody.
  }, [page, perPage, userList?.data?.total, isSaasOwnerList, showAllUsers]);

  useEffect(() => {
    setTableData(userList.data.data);
  }, [userList]);

  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(userList.data.total / perPage));
    setTableData(userList.data.data);
  };

  const handleEditUser = (user_id: number | undefined) => {
    if (!user_id) {
      toast.error('Something is wrong');
      return;
    }
    navigate(`/user/user-edit/${user_id}`);
  }

  const handleGenerateTemporaryPassword = async (userId: string | undefined) => {
    if (!userId) {
      toast.error('Something is wrong');
      return;
    }

    setTemporaryPasswordLoadingId(userId);

    const response = await dispatch(generateUserTemporaryPassword(userId) as any);
    setTemporaryPasswordLoadingId(null);

    if (!response?.success) {
      toast.error(response?.error?.message || response?.message || 'Failed to generate temporary password.');
      return;
    }

    const payload = response?.data?.data;
    const temporaryPassword = payload?.temporary_password;
    if (!temporaryPassword) {
      toast.error('Temporary password was not returned by the server.');
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(temporaryPassword);
        toast.success('Temporary password copied.');
        return;
      }

      toast.success('Temporary password generated successfully.');
    } catch (error) {
      toast.success('Temporary password generated, but copy was blocked.');
    }
  };


  const handleAddUser = () => {
    if (!canCreateUser) {
      toast.error('You are not authorized to create user.');
      return;
    }
    if (userLimitReached) {
      toast.error(`User limit reached (${currentUsers}/${maxUsers}).`);
      navigate('/no-access', {
        state: {
          from: routes.user_add,
          reason: 'subscription_quota',
          quota_type: 'users',
          quota_limit: maxUsers,
          current_usage: currentUsers,
        },
      });
      return;
    }
    navigate(routes.user_add);
  };

  const cleanRoleText = (value: any) =>
    String(value ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const extractRoleNames = (value: any): string[] => {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .flatMap((item: any) =>
          extractRoleNames(typeof item === 'string' ? item : item?.name ?? item),
        )
        .filter(Boolean);
    }

    if (typeof value === 'object') {
      return extractRoleNames(value?.name ?? '');
    }

    const text = String(value);
    if (/<span[^>]*>/i.test(text)) {
      const matches = [...text.matchAll(/<span[^>]*>(.*?)<\/span>/gi)];
      return matches
        .map((m) => cleanRoleText(m[1]))
        .filter(Boolean);
    }

    return text
      .split(',')
      .map((item) => cleanRoleText(item))
      .filter(Boolean);
  };

  const getPrimaryRoleName = (row: any): string => {
    const fromRoleName = extractRoleNames(row?.role_name);
    if (fromRoleName.length > 0) return fromRoleName[0];

    const fromRole = extractRoleNames(row?.role);
    if (fromRole.length > 0) return fromRole[0];

    const fromRoles = extractRoleNames(row?.roles);
    if (fromRoles.length > 0) return fromRoles[fromRoles.length - 1];

    return '';
  };

  const columns = [
    // Ahead of the serial and in a column of its own: an expander belongs to the
    // row, not to the company's name, and buried mid-row it read as punctuation.
    ...(isSaasOwnerList && !showAllUsers
      ? [
          {
            key: 'expander',
            header: '',
            headerClass: 'text-center',
            // The width rides on cellClass -- Table puts that on the <colgroup>,
            // and has no width prop of its own.
            //
            // The padding is marked important because Table writes px-3 on every
            // cell and appends cellClass after it: in a class list the later name
            // does not win, the later rule in the stylesheet does, and Tailwind
            // emits px-3 after px-1. Without the !, this column keeps a 24px
            // gutter that pushes the + away from the serial beside it.
            cellClass: 'text-center w-8 !px-1',
            render: (row: any) => {
              if (row?.__isExpandedChild) return null;

              // A company of one has nothing underneath, so it gets no control
              // to open — a + that expands to nothing is worse than no +.
              if (Number(row?.company_user_count || 0) <= 1) return null;

              const companyId = Number(row?.company_id || 0);
              const isOpen = expandedCompanyId === companyId;

              // The Action icons' blue, in a light frame so it reads as a box to
              // press rather than a stray mark beside the serial.
              return (
                <button
                  type="button"
                  title={isOpen ? "Hide this company's users" : "Show this company's users"}
                  onClick={() => toggleCompany(companyId)}
                  className="inline-flex h-6 w-6 items-center justify-center rounded border border-blue-500/40 text-blue-500 transition hover:border-blue-500 hover:bg-blue-500/10"
                >
                  {expandingCompanyId === companyId ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500" />
                  ) : isOpen ? (
                    <FiMinus className="cursor-pointer w-4 h-4" />
                  ) : (
                    <FiPlus className="cursor-pointer w-4 h-4" />
                  )}
                </button>
              );
            },
          },
        ]
      : []),
    {
      key: 'serial',
      header: 'Sl. No.',
      // Held on one line whatever the column is worth: "Sl. No." breaking after
      // "Sl." made a two-line header out of a two-word one. The <th> carries its
      // own px-3, so the left gutter is dropped here as well as on the cells.
      headerClass: isSaasOwnerList && !showAllUsers
        ? 'text-center whitespace-nowrap !pl-0'
        : 'text-center whitespace-nowrap',
      // Its left gutter dropped so the serial sits beside the expander rather
      // than across a gap, but wide enough that the heading still fits.
      cellClass: isSaasOwnerList && !showAllUsers
        ? 'text-center w-24 !pl-0'
        : 'text-center',
    },
    {
      key: 'name',
      header: 'User Name',
    },
    ...(isSaasOwnerList
      ? [
          {
            key: 'company',
            header: 'Company',
          },
        ]
      : []),
    {
      key: 'branch',
      header: 'Working Branch',
    },
    {
      key: 'email',
      header: 'Email/Phone',
      render: (row: any) => row?.email || row?.phone || '-',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: any) => {
        const roleName = getPrimaryRoleName(row);
        if (!roleName) return <span>-</span>;
        return (
          <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            {roleName}
          </span>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      headerClass: "text-center",
      cellClass: "text-center",
      render: (row: any) => {
        return (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleEditUser(row.user_id)}
              className="text-blue-500 ml-2"
              title="Edit user"
            >
              <FiEdit2 className="cursor-pointer w-5 h-5" />
            </button>

            {isSaasOwnerList && (
              <button
                type="button"
                onClick={() => handleGenerateTemporaryPassword(row.user_id)}
                className="text-blue-500"
                title="Generate temporary password"
                disabled={temporaryPasswordLoadingId === row.user_id}
              >
                <FiKey className={`cursor-pointer w-5 h-5 ${temporaryPasswordLoadingId === row.user_id ? 'opacity-50' : ''}`} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <HelmetTitle
        title={
          isSaasOwnerList
            ? showAllUsers
              ? 'Company User List'
              : 'Company Owner List'
            : 'User List'
        }
      />
      <div className="flex justify-between mb-1">
        <div className="flex gap-2">
          <SelectOption onChange={handleSelectChange} />
          <div className='flex'>
            <SearchInput
              search={search}
              setSearchValue={setSearch}
              className="text-nowrap"
            />
            <ButtonLoading
              onClick={handleSearchButton}
              buttonLoading={buttonLoading}
              label="Search"
              className="whitespace-nowrap"
              icon={<FiCheckSquare />}
            />
          </div>

          {/* Only the platform's own list has an owners-versus-everybody
              distinction to make; a tenant is already looking at all of theirs. */}
          {isSaasOwnerList && (
            <div className="flex h-8.5 items-center whitespace-nowrap">
              <FormToggleField
                label="Show all users"
                checked={showAllUsers}
                onChange={(checked) => {
                  setShowAllUsers(checked);
                  setExpandedCompanyId(null);
                  setPage(1);
                  setCurrentPage(1);
                }}
                className=""
              />
            </div>
          )}
        </div>
        {!isSaasOwnerList && canCreateUser && (
          <ButtonLoading
            onClick={handleAddUser}
            buttonLoading={false}
            label={userLimitReached ? `User Limit Full (${currentUsers}/${maxUsers})` : "Add User"}
            className="whitespace-nowrap ml-2"
            icon={<FiPlus />}
          />
        )}
      </div>

      <div className="relative overflow-x-auto overflow-y-hidden">
        {userList.isLoading == true ? <Loader /> : ''}
        <Table
          columns={columns}
          data={tableData}
          className=""
          noDataMessage={
            isSaasOwnerList
              ? showAllUsers
                ? 'No company user found'
                : 'No company owner found'
              : 'No user found'
          }
          // Opens directly beneath the owner it belongs to. At the foot of the
          // table it was a list with nothing to say whose it was.
          renderRowExpansion={(row: any) =>
            expandedCompanyId !== null &&
            Number(row?.company_id) === expandedCompanyId ? (
              <div className="border-y border-blue-500/30 bg-gray-2 px-3 py-3 dark:bg-meta-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-black dark:text-white">
                    Users of {expandedCompanyName || 'this company'}
                    <span className="ml-2 text-xs font-normal text-body dark:text-bodydark">
                      the owner is the row above
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => toggleCompany(expandedCompanyId)}
                    className="text-xs text-blue-500 underline-offset-2 hover:underline"
                  >
                    Close
                  </button>
                </div>

                <div className="overflow-x-auto rounded border border-stroke dark:border-strokedark">
                  <Table
                    columns={expandedColumns}
                    data={expandedUsers}
                    className=""
                    noDataMessage="This company has no other user"
                  />
                </div>
              </div>
            ) : null
          }
        />

        {totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        ) : (
          ''
        )}
      </div>

    </div>
  );
};

export default UserList;
