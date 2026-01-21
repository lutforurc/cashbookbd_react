import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { useNavigate } from 'react-router-dom';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';

import routes from '../../../services/appRoutes';
import { floorList } from './flatSlice';

const FloorList = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const floors = useSelector((state: any) => state.flats);
  const flats = useSelector((state: any) => state.flats);
  const settings = useSelector((state: any) => state.settings);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [branchId, setBranchId] = useState<string | number>(
    user?.branch_id ?? ''
  );
  const [dropdownData, setDropdownData] = useState<any[]>([]);

  /* ---- Initial Load ---- */
  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);

  /* ---- Branch Dropdown ---- */
  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;

      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([{ id: '', name: 'All Branches' }, ...baseData]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data]);

  /* ---- Pagination Count ---- */
  useEffect(() => {
    const total = flats?.flats?.data?.total;
    setTotalPages(total ? Math.ceil(total / perPage) : 0);
  }, [flats?.flats?.data?.total, perPage]);

  /* ---- Fetch List ---- */
  useEffect(() => {
    dispatch(
      floorList({
        page,
        per_page: perPage,
        branch_id: branchId ? Number(branchId) : undefined,
      })
    );
  }, [dispatch, page, perPage, branchId]);

  /* ---- Handlers ---- */
  const handlePageChange = (page: number) => {
    setPage(page);
    setCurrentPage(page);
  };

  const handleSelectChange = (e: any) => {
    const value = Number(e.target.value);
    setPerPage(value);
    setPage(1);
    setCurrentPage(1);
  };

  const handleCreateFloor = () => {
    navigate(routes.real_estate_add_building_floor);
  };

  /* ---- Table Columns ---- */
  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center w-20',
      cellClass: 'text-center',
    },
    {
      key: 'floor_no',
      header: 'Floor No',
      headerClass: 'text-center w-30',
      cellClass: 'text-center',
      render: (row: any) => <div>{row.floor_no}</div>,
    },
     {
      key: 'flat_name',
      header: 'Flat Name', 
      render: (row: any) => <div>{row.flat_name}</div>,
    },
    {
      key: 'building',
      header: 'Building Name', 
      render: (row: any) => <div>{row.building.name}</div>,
    },
   
    {
      key: 'location',
      header: 'Location', 
      render: (row: any) => <div>{row.building.project.area.name}</div>,
    },
    {
      key: 'total_units',
      header: 'Units',
      headerClass: 'text-center w-30',
      cellClass: 'text-center',
      render: (row: any) => <div>{row.total_units ?? '-'}</div>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span className="font-medium">
          {row.status === 1 && 'Active'}
          {row.status === 0 && 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Floor List" />

      <div className="flex mb-1 justify-between">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-2" />
          <BranchDropdown
            defaultValue={branchId?.toString()}
            onChange={(e: any) => {
              const value = e.target.value;
              setBranchId(value === '' ? '' : Number(value));
            }}
            className="!w-64 font-medium text-sm p-2 mr-2"
            branchDdl={dropdownData}
          />
        </div>

        <ButtonLoading
          className="h-9"
          onClick={handleCreateFloor}
          label="New Floor"
        />
      </div>

      <div className="relative no-scrollbar">
        <div className="relative h-full">
          <Table columns={columns} data={flats?.flats?.data || []} />
        </div>

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

export default FloorList;
