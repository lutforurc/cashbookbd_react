import React, { useEffect, useState } from 'react';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { useDispatch, useSelector } from 'react-redux';
import { getUser } from './userSlice';
import Loader from '../../../common/Loader';
import { FiBook, FiEdit, FiEdit2, FiTrash2 } from 'react-icons/fi';
import Pagination from '../../utils/utils-functions/Pagination';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SearchInput from '../../utils/fields/SearchInput';
import routes from '../../services/appRoutes';
import { hasPermission } from '../../utils/permissionChecker';

const UserList = () => {
  const userList = useSelector((state) => state.users);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userPermissions = settings?.data?.permissions || [];
  const canCreateUser =
    hasPermission(userPermissions, 'all.user.create') ||
    hasPermission(userPermissions, 'user.create') ||
    hasPermission(userPermissions, 'user.store') ||
    hasPermission(userPermissions, 'all.user.add');

  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearch] = useState('');

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
    dispatch(getUser({ page: 1, perPage, search })); // Use 'search' instead
  };

  useEffect(() => {
    dispatch(getUser({ page, perPage, search }));
    if (userList?.data?.total) {
      setTotalPages(Math.ceil(userList?.data?.total / perPage));
      setTableData(userList.data.data);
    }
  }, [page, perPage, userList?.data?.total]);

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

  
  const handleAddUser = () => {
    if (!canCreateUser) {
      toast.error('You are not authorized to create user.');
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

  const getRoleDisplayNames = (row: any): string[] => {
    const fromRoles = extractRoleNames(row?.roles);
    if (fromRoles.length > 0) return fromRoles;

    const fromRole = extractRoleNames(row?.role);
    if (fromRole.length > 0) return fromRole;

    const fromRoleName = extractRoleNames(row?.role_name);
    if (fromRoleName.length > 0) return fromRoleName;

    return [];
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
    {
      key: 'branch',
      header: 'Working Branch',
    },
    {
      key: 'email',
      header: 'Email',
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: any) => {
        const roleNames = getRoleDisplayNames(row);
        if (roleNames.length === 0) return <span>-</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {roleNames.map((name, index) => (
              <span
                key={`${row?.user_id || row?.id || 'role'}-${index}`}
                className="inline-flex items-center rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              >
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "id",
      header: "Action",
      render: (row: any) => {
        return (
          <div className="flex justify-center items-center">
            <button
              onClick={() => handleEditUser(row.user_id)}
              className="text-blue-500 ml-2"
            >
              <FiEdit2 className="cursor-pointer" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <HelmetTitle title={'User List'} />
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
              icon=""
            />
          </div>
        </div>
        {canCreateUser && (
          <ButtonLoading
            onClick={handleAddUser}
            buttonLoading={false}
            label="Add User"
            className="whitespace-nowrap ml-2"
            icon=""
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
