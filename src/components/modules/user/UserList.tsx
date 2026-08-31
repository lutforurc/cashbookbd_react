import React, { useEffect, useState } from 'react';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import { formatMobile, useMobileFormat } from '../../utils/utils-functions/mobileFormat';
import { generateUserTemporaryPassword, getUser, toggleUserStatus } from './userSlice';
import Loader from '../../../common/Loader';
import { FiCheckSquare, FiEdit2, FiKey, FiPlus } from 'react-icons/fi';
import Pagination from '../../utils/utils-functions/Pagination';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import SearchInput from '../../utils/fields/SearchInput';
import routes from '../../services/appRoutes';
import { hasPermission } from '../../utils/permissionChecker';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import FormToggleField from '../../utils/utils-functions/FormToggleField';

const UserList = () => {
  const userList = useSelector((state) => state.users);
  const mobileFormat = useMobileFormat();
  const settings = useSelector((state: any) => state.settings);  const subscription = useSelector((state: any) => state.subscription);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userPermissions = settings?.data?.permissions || [];
  const canCreateUser =
    hasPermission(userPermissions, 'all.user.create') ||
    hasPermission(userPermissions, 'user.create') ||
    hasPermission(userPermissions, 'user.store') ||
    hasPermission(userPermissions, 'all.user.add');

  /**
   * ⚠️ WHO GETS THE WHOLE LIST. Without `all.user.view` this screen is one
   * company's people, which is what it has always been. With it, the toggle
   * below appears and the list can be widened to every company on the
   * platform. The server asks the same question again — and asks it of the
   * platform company first — so a tenant who somehow holds the permission
   * still sees only their own; this only decides whether the switch is worth
   * showing.
   */
  const canViewAllCompanies = hasPermission(userPermissions, 'all.user.view');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [temporaryPasswordLoadingId, setTemporaryPasswordLoadingId] = useState<string | null>(null);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, number>>({});
  // Off, and the list is this company's people. On, it is everybody's, and the
  // Company column appears with them — a list of names from four companies with
  // no company against them is a list nobody can read.
  const [allCompanies, setAllCompanies] = useState(false);
  const maxUsers = subscription?.current?.max_users;
  const currentUsers = Number(userList?.data?.total || 0);
  const userLimitReached = typeof maxUsers === 'number' && maxUsers > 0 && currentUsers >= maxUsers;

  // Every list request asks the same question, so it is asked in one place.
  const showEveryCompany = canViewAllCompanies && allCompanies;

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(userList.data.total / page.target.value));
    setTableData(userList.data.data);
  };

  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    dispatch(getUser({ page: 1, perPage, search, allTenantUsers: showEveryCompany })); // Use 'search' instead
  };

  useEffect(() => {
    dispatch(getUser({ page, perPage, search, allTenantUsers: showEveryCompany }));
    if (userList?.data?.total) {
      setTotalPages(Math.ceil(userList?.data?.total / perPage));
      setTableData(userList.data.data);
    }
  }, [page, perPage, showEveryCompany, userList?.data?.total]);

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


  /**
   * A row the user just switched reads from the local override; every other row
   * reads from the server. Anything other than an explicit 0 counts as enabled,
   * so a row from an older API build that omits `status` stays usable.
   */
  const isUserEnabled = (row: any) => {
    const override = statusOverrides[row?.user_id];
    if (override !== undefined) return override === 1;
    return Number(row?.status ?? 1) !== 0;
  };

  /**
   * The switch waits for the server before it moves. An optimistic flip would
   * have to be undone on the refusals that actually happen here — disabling
   * your own account, or a user outside your company — and a switch that
   * snaps back is worse than one that takes a moment.
   */
  const handleToggleStatus = async (row: any) => {
    const userId = row?.user_id;
    if (!userId) {
      toast.error('Something is wrong');
      return;
    }

    const nextEnabled = !isUserEnabled(row);

    setStatusBusyId(userId);
    const response = await dispatch(toggleUserStatus(userId, nextEnabled) as any);
    setStatusBusyId(null);

    if (!response?.success) {
      toast.error(
        response?.error?.message || response?.message || 'Failed to change the user status.',
      );
      return;
    }

    setStatusOverrides((current) => ({ ...current, [userId]: nextEnabled ? 1 : 0 }));
    toast.success(nextEnabled ? 'User enabled. They can sign in.' : 'User disabled. They cannot sign in.');
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
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'User Name',
    },
    // Only carried while the list spans more than one company. A column that
    // says the same word on every row is a column in the way.
    ...(showEveryCompany
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
      header: 'Email',
    },
    {
      key: 'phone',
      header: 'Mobile',
      // Its own column beside the email rather than tucked under it: this is
      // the list somebody opens when they need to reach one of these people.
      render: (row: any) => formatMobile(row?.phone, mobileFormat) || '-',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: any) => {
        const roleName = getPrimaryRoleName(row);
        if (!roleName) return <span>-</span>;
        return (
          <span className="inline-flex items-center rounded-md border border-[rgb(var(--c-border))] bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-100">
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
        const enabled = isUserEnabled(row);
        const isSelf = Number(row?.id) === Number(settings?.data?.user?.id);
        const busy = statusBusyId === row.user_id;

        return (
          <div className="flex items-center justify-center gap-3">
            {/* The app's own switch, so it matches every other toggle in the
                product. Disabled on your own row: the server refuses it anyway,
                and an account that can lock itself out is a trap — but the
                colour is kept so an enabled account still reads as enabled. */}
            <span
              title={
                isSelf
                  ? 'You cannot disable your own account'
                  : enabled
                    ? 'Enabled — click to block sign-in'
                    : 'Disabled — click to allow sign-in'
              }
            >
              <ToggleSwitch
                checked={enabled}
                onChange={() => handleToggleStatus(row)}
                disabled={busy || isSelf}
                preserveCheckedColorWhenDisabled
                ariaLabel={enabled ? 'Disable sign-in' : 'Enable sign-in'}
              />
            </span>

            <Button
              type="button"
              onClick={() => handleEditUser(row.user_id)}
              className="text-blue-500"
              title="Edit user"
            >
              <FiEdit2 className="cursor-pointer w-5 h-5" />
            </Button>

            {settings?.data?.user?.id === 1 && (
              <Button
                type="button"
                onClick={() => handleGenerateTemporaryPassword(row.user_id)}
                className="text-blue-500"
                title="Generate temporary password"
                disabled={temporaryPasswordLoadingId === row.user_id}
              >
                <FiKey className={`cursor-pointer w-5 h-5 ${temporaryPasswordLoadingId === row.user_id ? 'opacity-50' : ''}`} />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title={'User List'} screen="user-list" />
      </div>
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

          {/* Shown only to whoever holds `all.user.view`. For everybody else
              there is no switch, because there is nothing behind it: the
              server would hand them their own company either way. */}
          {canViewAllCompanies && (
            <div className="flex h-8.5 items-center whitespace-nowrap">
              <FormToggleField
                label="All companies"
                checked={allCompanies}
                onChange={(checked) => {
                  setAllCompanies(checked);
                  setPage(1);
                  setCurrentPage(1);
                }}
                className=""
              />
            </div>
          )}
        </div>
        {canCreateUser && (
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
        <Table columns={columns} data={userList?.data?.data} className="" />

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
