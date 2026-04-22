import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import ROUTES from '../../../services/appRoutes';
import SearchInput from '../../../utils/fields/SearchInput';
import Link from '../../../utils/others/Link';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import ActionButtons from '../../../utils/fields/ActionButton';
import Pagination from '../../../utils/utils-functions/Pagination';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import { deleteHrmDesignation, fetchHrmDesignations } from './hrmDesignationSlice';
import { FiSearch } from 'react-icons/fi';

const HrmDesignations = () => {
  const dispatch = useDispatch<any>();
  const hrmDesignationState = useSelector((state: any) => state.hrmDesignation);

  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [tableData, setTableData] = useState<any[]>([]);
  const [search, setSearchValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showConfirmId, setShowConfirmId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchHrmDesignations({ search, page, per_page: perPage }));
  }, [dispatch, page, perPage]);


  useEffect(() => {
    const paginated = hrmDesignationState?.designations;

    if (Array.isArray(paginated)) {
      setTableData(paginated);
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    setTableData(paginated?.data || []);
    setTotalPages(paginated?.last_page || 1);

    if (paginated?.current_page) {
      setCurrentPage(paginated.current_page);
      setPage(paginated.current_page);
    }
  }, [hrmDesignationState?.designations]);

  const handleSearchButton = async () => {
    setButtonLoading(true);
    try {
      setCurrentPage(1);
      setPage(1);
      await dispatch(fetchHrmDesignations({ search, page: 1, per_page: perPage })).unwrap();
    } finally {
      setButtonLoading(false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPerPage = Number(e.target.value);
    setPerPage(nextPerPage);
    setPage(1);
    setCurrentPage(1);
  };

  const refreshList = async (nextPage = page, nextPerPage = perPage) => {
    await dispatch(fetchHrmDesignations({ search, page: nextPage, per_page: nextPerPage })).unwrap();
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await dispatch(deleteHrmDesignation(id)).unwrap();
      toast.success(response?.message || 'Designation deleted successfully');
      await refreshList(currentPage, perPage);
    } catch (err: any) {
      toast.error(err || 'Failed to delete designation');
    }
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Designation',
    },
    {
      key: 'level_name',
      header: 'Level',
      render: (row: any) => <span>{row.level_name || '-'}</span>,
    },
    {
      key: 'post_sequence',
      header: 'Sequence',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <span>{row.post_sequence ?? '-'}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row: any) => <span>{row.description || '-'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <Link to={`${ROUTES.hrms_designation_edit_base}/${row.id}`} className="px-2 py-1 text-xs">
            Edit
          </Link>
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
      <HelmetTitle title="Designation List" />

      <div className="mb-1 flex justify-between gap-2 overflow-x-auto">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-1 md:mr-2" />
          <SearchInput search={search} setSearchValue={setSearchValue} className="text-nowrap" />
          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
             icon={<FiSearch size={15} />}
          />
        </div>

        <Link to={ROUTES.hrms_designation_create} className="text-nowrap">
          New Designation
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {hrmDesignationState?.isLoading && <Loader />}
        <Table columns={columns} data={tableData} />
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default HrmDesignations;

