import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import SelectOption from "../../../utils/utils-functions/SelectOption";
import BranchDropdown from "../../../utils/utils-functions/BranchDropdown";
import Loader from "../../../../common/Loader";
import Table from "../../../utils/others/Table";
import Pagination from "../../../utils/utils-functions/Pagination";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { useNavigate } from "react-router-dom";
import { getDdlProtectedBranch } from "../../branch/ddlBranchSlider"; 
import routes from "../../../services/appRoutes";
import { unitChargeTypeList } from "../units/unitSlice";
import SearchInput from "../../../utils/fields/SearchInput";
import ActionButtons from "../../../utils/fields/ActionButton";

const ChargeTypeList = ({ user }: any) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const buildingUnits = useSelector((state: any) => state.buildingUnits);
  const settings = useSelector((state: any) => state.settings);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [dropdownData, setDropdownData] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);

  /* ---- Initial Load ---- */
  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
    setBranchId(user?.branch_id);
  }, []);

  /* ---- Branch Dropdown ---- */
  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;

      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([{ id: "", name: "All Branches" }, ...baseData]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data, settings?.data?.branch?.branch_types_id]);

  /* ---- Fetch List ---- */
  useEffect(() => {
    dispatch(
      unitChargeTypeList({
        page,
        per_page: perPage,
        q: q || undefined,
        branch_id: branchId ? Number(branchId) : undefined,
      }) as any
    );
  }, [dispatch, page, perPage, branchId, q]);

  // unitChargeTypes can be either:
  // 1) paginator object: { data: [], total: number, current_page: number ... }
  // 2) array: []
  const rawChargeTypes = buildingUnits?.unitChargeTypes?.data;



  const isPaginator =
    rawChargeTypes &&
    !Array.isArray(rawChargeTypes) &&
    Array.isArray(rawChargeTypes?.data);

  const listData = useMemo(() => {
    const rows = isPaginator
      ? rawChargeTypes?.data || []
      : Array.isArray(rawChargeTypes)
        ? rawChargeTypes
        : [];

    // ensure serial_no exists (backend adds it, but safety fallback)
    const start = (page - 1) * perPage;
    return rows.map((r: any, idx: number) => ({
      ...r,
      serial_no: r?.serial_no ?? start + idx + 1,
    }));
  }, [rawChargeTypes, isPaginator, page, perPage]);

  /* ---- Pagination Count ---- */
  useEffect(() => {
    if (isPaginator) {
      const total = rawChargeTypes?.total;
      setTotalPages(total ? Math.ceil(total / perPage) : 0);
    } else if (Array.isArray(rawChargeTypes)) {
      const total = rawChargeTypes.length;
      setTotalPages(total ? Math.ceil(total / perPage) : 0);
    } else {
      setTotalPages(0);
    }
  }, [rawChargeTypes, perPage, isPaginator]);

  /* ---- Handlers ---- */
  const handlePageChange = (p: number) => {
    setPage(p);
    setCurrentPage(p);
  };

  const handleSelectChange = (e: any) => {
    const value = Number(e.target.value);
    setPerPage(value);
    setPage(1);
    setCurrentPage(1);
  };

  const handleCreate = () => {
    navigate((routes as any).real_estate_unit_types_create);
  };

  const handleEdit = (id: number) => { 
    navigate(((routes as any).real_estate_edit_unit_charge_type ?? "") + id);
  };

  const handleSearchButton = () => {
    setQ(search);
    setCurrentPage(1);
    setPage(1);
    // dispatch(getUser({ page: 1, perPage,  search })); // Use 'search' instead
};


  /* ---- Table Columns ---- */
  const columns = [
    {
      key: "serial_no",
      header: "Sl. No.",
      headerClass: "text-center w-20",
      cellClass: "text-center",
    },
    {
      key: "name",
      header: "Name",
      render: (row: any) => <div className="font-medium">{row.name}</div>,
    },
    {
      key: "effect",
      header: "Effect",
      headerClass: "text-center w-28",
      cellClass: "text-center",
      render: (row: any) => (
        <span className={`font-semibold text-md ${row.effect === "+" ? "text-green-600" : "text-red-600"}`}>{row.effect}</span>
      ),
    },
    
    {
      key: "notes",
      header: "Notes",
      render: (row: any) => <div>{row.notes}</div>,
    },
    {
      key: "is_active",
      header: "Status",
      headerClass: "text-center w-28",
      cellClass: "text-center",
      render: (row: any) => (
        <span className="font-medium">{row.is_active === true ? "Active" : "Inactive"}</span>
      ),
    },
    {
      key: "sort_order",
      header: "Sort",
      headerClass: "text-center w-24",
      cellClass: "text-center",
      render: (row: any) => <div>{row.sort_order}</div>,
    },
    
    {
      key: "action",
      header: "Action",
      headerClass: "text-center w-28",
      cellClass: "text-center",
      render: (row: any) => (
        <div>
            <ActionButtons
              row={row}
              showEdit={true}
              handleEdit={handleChargeTypeEdit}
              showDelete={false}
              // handleDelete={handleBranchDelete}
              showToggle={true}
              // handleToggle={() => handleToggle(row)}

              // showConfirmId={showConfirmId}
              // setShowConfirmId={setShowConfirmId}
            />
          </div>
      ),
    },
  ];

  const handleChargeTypeEdit = (row: any) => {
    navigate(`/real-estate/charge-types/edit/${row.id}`);
  };
  // (optional) client-side slice if raw array returned (only)
  const tableData = useMemo(() => {
    if (!isPaginator && Array.isArray(rawChargeTypes)) {
      const start = (page - 1) * perPage;
      return listData.slice(start, start + perPage);
    }
    return listData;
  }, [listData, rawChargeTypes, isPaginator, page, perPage]);

  return (
    <div>
      <HelmetTitle title="Unit Charge Types" />

      <div className="flex mb-1 justify-between">
        <div className="flex">
          <SelectOption onChange={handleSelectChange} className="mr-2" />

          <BranchDropdown
            defaultValue={branchId?.toString()}
            onChange={(e: any) => {
              const value = e.target.value;
              setBranchId(value === "" ? "" : Number(value));
              setPage(1);
              setCurrentPage(1);
            }}
            className="!w-64 font-medium text-sm p-2 mr-2"
            branchDdl={dropdownData}
          />

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
            />
          </div>
        </div>

        <ButtonLoading className="h-9" onClick={handleCreate} label="New Charge Type" />
      </div>

      <div className="relative no-scrollbar">
        <div className="relative h-full">
          {buildingUnits?.loading && <Loader />}
          <Table columns={columns} data={tableData || []} />
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

export default ChargeTypeList;
