import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiPlus, FiSearch } from 'react-icons/fi';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import httpService from '../../../services/httpService';
import { API_HRMS_DEPARTMENT_DELETE_URL, API_HRMS_DEPARTMENT_LIST_URL } from '../../../services/apiRoutes';
import ROUTES from '../../../services/appRoutes';
import SearchInput from '../../../utils/fields/SearchInput';
import ActionButtons from '../../../utils/fields/ActionButton';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';

/** The company's departments. One list for every branch; an employee may sit in one or none. */
const Departments = () => {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmId, setShowConfirmId] = useState<number | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const res = await httpService.get(API_HRMS_DEPARTMENT_LIST_URL, {
        params: { search, page: nextPage, per_page: perPage },
      });
      const paginated = res.data?.data?.data ?? res.data?.data;
      setRows(Array.isArray(paginated?.data) ? paginated.data : []);
      setTotalPages(paginated?.last_page || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page);
  }, [page, perPage]);

  const handleDelete = async (id: number) => {
    const res = await httpService.post(`${API_HRMS_DEPARTMENT_DELETE_URL}/${id}`);
    if (res.data?.success === false) {
      toast.error(res.data?.message || t('department.deleteFailed'));
      return;
    }
    toast.success(t('department.deleted'));
    load(page);
  };

  const columns = [
    { key: 'serial_no', header: t('department.sl'), headerClass: 'text-center', cellClass: 'text-center' },
    {
      key: 'name',
      header: t('department.name'),
      render: (row: any) => <span>{(i18n.language !== 'en' && row.name_local) || row.name}</span>,
    },
    { key: 'description', header: t('department.description'), render: (row: any) => <span>{row.description || '-'}</span> },
    { key: 'employee_count', header: t('department.employees'), headerClass: 'text-center', cellClass: 'text-center' },
    {
      key: 'status',
      header: t('department.status'),
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <span className={Number(row.status) === 1 ? 'text-green-700' : 'text-red-700'}>
          {Number(row.status) === 1 ? t('department.active') : t('department.inactive')}
        </span>
      ),
    },
    {
      key: 'action',
      header: t('department.action'),
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <ButtonLoading
            onClick={() => navigate(`${ROUTES.hrms_department_edit_base}/${row.id}`)}
            buttonLoading={false}
            label={t('department.edit')}
            size="sm"
            className="h-7! whitespace-nowrap text-center mr-0"
            icon={<FiEdit2 className="text-lg ml-2 mr-2" />}
          />
          <ActionButtons
            row={row}
            showDelete={true}
            handleDelete={handleDelete}
            showConfirmId={showConfirmId}
            setShowConfirmId={setShowConfirmId}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title={t('department.listTitle')} />

      <div className="mb-1 flex justify-between gap-2 overflow-x-auto">
        <div className="flex">
          <SelectOption
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
            className="mr-1 md:mr-2"
          />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={() => (page === 1 ? load(1) : setPage(1))}
            buttonLoading={loading}
            label={t('department.search')}
            className="whitespace-nowrap"
            icon={<FiSearch size={15} />}
          />
        </div>

        <ButtonLoading
          onClick={() => navigate(ROUTES.hrms_department_create)}
          buttonLoading={false}
          label={t('department.new')}
          className="whitespace-nowrap text-center mr-0"
          icon={<FiPlus className="text-lg ml-2 mr-2" />}
        />
      </div>

      <div className="relative overflow-x-auto">
        {loading && <Loader />}
        <Table columns={columns} data={rows} />
        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} handlePageChange={setPage} />
        )}
      </div>
    </div>
  );
};

export default Departments;
