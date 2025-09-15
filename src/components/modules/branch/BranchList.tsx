import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getBranch } from './branchSlice';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import SelectOption from '../../utils/utils-functions/SelectOption';
import Pagination from '../../utils/utils-functions/Pagination';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import { useNavigate } from 'react-router-dom';
import ActionButtons from '../../utils/fields/ActionButton';

const BranchList = () => {
  const branchList = useSelector((state) => state.branchList);
  const dispatch = useDispatch();
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showConfirmId, setShowConfirmId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(getBranch({ page, perPage, searchValue }));
    if (branchList?.data?.total) {
      setTotalPages(Math.ceil(branchList?.data?.total / perPage));
    }
  }, [page, perPage, branchList?.data?.total]);

  const handleSearchChange = (e: any) => {
    setSearchValue(e.target.value);
  };
  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(branchList.data.total / perPage));
  };

  const handleLastPage = (page: any) => {
    setPerPage(perPage);
    setPage(branchList.data.last_page);
    setCurrentPage(branchList.data.last_page);
    setTotalPages(Math.ceil(branchList.data.last_page));
  };
  const handleSearch = (e: any) => {
    setPage(1);
    dispatch(getBranch(page, perPage, searchValue));
  };
  const handlePerRowsChange = (newPerPage) => {
    setPerPage(newPerPage);
  };
  const handleSearchButton = (e: any) => {
    setButtonLoading(false);
    navigate('/branch/add-branch'); // Replace with your desired URL
  };
  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(branchList.data.total / page.target.value));
  };


  const handleToggle = (id: number, enabled: boolean) => {
    console.log(`Toggled row with ID ${id} to ${enabled ? 'enabled' : 'disabled'}`);
    // Implement your toggle logic here, e.g., make an API call to update the status
  }

 
  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Branch Name',
    },
    {
      key: 'contact_person',
      header: 'Contact Person',
    },
    {
      key: 'business_type',
      header: 'Business Type',
    },
    {
      key: 'phone',
      header: 'Contact Number',
    },
    {
      key: 'status_label',
      header: 'status',
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div>
          <ActionButtons
          row={row}
          showEdit={true}
          handleEdit={handleBranchEdit}

          showDelete={true}
          handleDelete={handleBranchDelete} 
          showToggle={true}
          handleToggle={handleToggle}
          showConfirmId={showConfirmId}
          setShowConfirmId={setShowConfirmId} 
        />
        </div>
      ),
    },
  ];
  const handleBranchView = (row: any) => {
    console.log('View =>' + row);
  };
  const handleBranchEdit = (row: any) => {
    navigate(`/branch/edit/${row.branch_id}`);
  };
  const handleBranchDelete = (row: any) => {
    console.log('Delete =>' + row);
    navigate('/branch/branch-list');
  };

  

  return (
    <div>
      <HelmetTitle title={'Branch List'} />
      <div className="flex justify-between mb-1">
        <SelectOption onChange={handleSelectChange} />
        <ButtonLoading
          onClick={handleSearchButton}
          buttonLoading={buttonLoading}
          label="Add Branch"
        />
      </div>
      <div className="relative overflow-x-auto">
        <div className="relative h-full">
          {branchList.isLoading == true ? <Loader /> : ''}
          <Table columns={columns} data={branchList?.data?.data} className="" />
        </div>
        {/* Pagination Controls */}
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

export default BranchList;
