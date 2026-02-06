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
      key: "unit_type",
      header: "Unit Type",
      render: (row: any) => {
        const type = (row.unit_type ?? "").trim().toLowerCase();
        const label =
          (row.unit_type ?? "")
            .trim()
            .replace(/^./, (c: string) => c.toUpperCase());

        const cls =
          type === "parking"
            ? "inline-flex rounded px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
            : "inline-flex rounded px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";

        return <span className={cls}>{label}</span>;
      },
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
      headerClass: 'text-center',
      cellClass: 'text-right',
      render: (row: any) => <div>{thousandSeparator(row.size_sqft, 0)} Sft</div>,
    },
    {
      key: 'sale_price',
      header: 'Unit Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => <div>{thousandSeparator(row.sale_price, 0) ?? '-'}</div>,
    },
    {
      key: 'total_price',
      header: 'Total Price',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: any) => {
        const total = Number(row?.size_sqft) * Number(row?.sale_price);
        return <div>{isNaN(total) ? "-" : thousandSeparator(total, 0)}</div>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => {
        const map: Record<number, { text: string; cls: string }> = {
          1: { text: "Available", cls: "bg-green-100 text-green-800" },
          2: { text: "Under Development", cls: "bg-yellow-100 text-yellow-800" },
          3: { text: "Completed", cls: "bg-blue-100 text-blue-800" },
          4: { text: "Sold", cls: "bg-red-100 text-red-800" },
          0: { text: "Inactive", cls: "bg-gray-100 text-gray-700" },
        };

        const s = map[row.status] ?? { text: "Unknown", cls: "bg-gray-100 text-gray-700" };

        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
            {s.text}
          </span>
        );
      },
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
