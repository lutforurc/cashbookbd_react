import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { useNavigate } from 'react-router-dom';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { buildingUnitList } from './unitSlice';
import routes from '../../../services/appRoutes';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';

const BuildingUnitsList = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const buildingUnits = useSelector((state: any) => state.buildingUnits);
  const settings = useSelector((state: any) => state.settings);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? '');
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
    const total = buildingUnits?.units?.total;
    setTotalPages(total ? Math.ceil(total / perPage) : 0);
  }, [buildingUnits?.units?.total, perPage]);

  /* ---- Fetch List ---- */
  useEffect(() => {
    dispatch(
      buildingUnitList({
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

  const handleCreateUnit = () => {
    navigate(routes.real_estate_add_floor_unit);
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
      key: 'unit_no',
      header: 'Unit No',
      render: (row: any) => <div>{row.unit_no}</div>,
    },
    {
      key: 'flat_name',
      header: 'Flat Name',
      render: (row: any) => <div>{row.flat.flat_name}</div>,
    },
    {
      key: 'building_name',
      header: 'Building Name',
      render: (row: any) => <div>{row.flat.building.name}</div>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: any) => <div>{row.flat.building.project.area.name}</div>,
    },
    {
      key: 'size_sqft',
      header: 'Size',
      render: (row: any) => <div>{ thousandSeparator(row.size_sqft, 0)} Sft</div>,
    },
    {
      key: 'sale_price',
      header: 'Unit Price',
      render: (row: any) => <div>{ thousandSeparator(row.sale_price, 0) ?? '-'}</div>,
    },
    {
      key: 'total_price',
      header: 'Total Price',
      render: (row: any) => {
        const total = Number(row?.size_sqft) * Number(row?.sale_price);
        return <div>{isNaN(total) ? "-" : thousandSeparator(total, 0)}</div>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <span className="font-medium">
          {row.status === 1 && 'Active'}
          {row.status === 2 && 'Under Development'}
          {row.status === 3 && 'Completed'}
          {row.status === 4 && 'Sold'}
          {row.status === 0 && 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="List of Units" />

      <div className="flex mb-1 justify-between">
        <div className='flex'>
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
          onClick={handleCreateUnit}
          label="New Unit"
        />
      </div>

      <div className="relative no-scrollbar">
        <div className="relative h-full">
          {/* {buildingUnits.loading && <Loader />} */}
          <Table
            columns={columns}
            data={buildingUnits?.units?.data || []}
          />
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

export default BuildingUnitsList;
