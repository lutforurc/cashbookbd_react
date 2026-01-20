import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import { buildingList } from './buildingsSlice'; 


const BuildingList = ({ user }: any) => {
  const branchDdlData = useSelector((state) => state.branchDdl);
  const historyState = useSelector((state) => state.history);
  const realEstateProjects = useSelector((state) => state.realEstateProjects);
  const buildings = useSelector((state) => state.buildings);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [dropdownData, setDropdownData] = useState<any[]>([]);
const [expandedBuildingIds, setExpandedBuildingIds] = useState<Record<number, boolean>>({});



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);

const toggleBuilding = (id: number) => {
  setExpandedBuildingIds((prev) => ({ ...prev, [id]: !prev[id] }));
};

  useEffect(() => {
    if (branchDdlData?.protectedData?.data) if (branchDdlData?.protectedData?.data) {
      const baseData = branchDdlData.protectedData.data;
      if (settings?.data?.branch?.branch_types_id === 1) {
        setDropdownData([
          { id: "", name: 'All Projects' },
          ...baseData,
        ]);
      } else {
        setDropdownData(baseData);
      }
    }
  }, [branchDdlData?.protectedData?.data]);


  useEffect(() => {
    const total = buildings?.buildings?.total;
    if (total) {
      setTotalPages(Math.ceil(total / perPage));
    } else {
      setTotalPages(0);
    }
  }, [buildings?.buildings?.total, perPage]);

  useEffect(() => {
    dispatch(
      buildingList({
        page,
        per_page: perPage,
        branchId: branchId ? Number(branchId) : undefined,
      })
    );
  }, [dispatch, page, perPage, branchId]);


  const handlePageChange = (page: any) => {
    setPerPage(perPage);
    setPage(page);
    setCurrentPage(page);
    setTotalPages(Math.ceil(buildings?.buildings.total / perPage));
  };

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(buildings?.buildings.total / page.target.value));
  };


  console.log('====================================');
  console.log("buildings", buildings?.buildings);
  console.log('====================================');


  const columns = useMemo(
  () => [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center w-20',
      cellClass: 'text-center',
    },
    {
      key: "name",
      header: "Name of Building",
      render: (row: any) => {
        const flats = row?.flats ?? [];
        const buildingId = row?.id;
        const isExpanded = !!expandedBuildingIds[buildingId];

        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* (+) / (-) */}
              {flats.length > 0 ? (
                <></>
              ) : (
                // flats না থাকলে placeholder space
                <span style={{ width: 22, display: "inline-block" }} />
              )}

              <div>{row?.name || ""}</div>
            </div>

            {/* Details (hidden by default) */}
            {isExpanded && (
              <div style={{ marginTop: 8, marginLeft: 30, fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Flats:</div>

                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {flats.map((f: any) => (
                    <li key={f.id}>
                      {f.flat_name || "N/A"}
                      {f.floor_no !== undefined && f.floor_no !== null
                        ? ` (Floor ${f.floor_no})`
                        : ""}
                      {f.total_units !== undefined && f.total_units !== null
                        ? ` • Units: ${f.total_units}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* flats আছে কিন্তু collapsed থাকলে optional hint */}
            {!isExpanded && flats.length > 0 && (
              <div >
                {flats.length} flat(s)
              </div>
            )}

            {flats.length === 0 && (
              <div >
                No flats
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'projects',
      header: 'Project Name',
      render: (row: any) => (
        <div>
          {row.project.name || ''}
        </div>
      ),
    },

    {
      key: 'location',
      header: 'Location',
      render: (row: any) => (
        <div>
          {row.project.area.name || ''}
        </div>
      ),
    },
  ],
  [expandedBuildingIds]
);


 

  return (
    <div className=''>
      <HelmetTitle title={'Real Estate Building List'} />
      <div className="flex mb-1">
        <SelectOption onChange={handleSelectChange} className='mr-2' />
        <BranchDropdown
          defaultValue={branchId?.toString()}
          onChange={(e: any) => {
            const value = e.target.value;
            setBranchId(value === "" ? "" : Number(value));
          }}
          className="!w-64 font-medium text-sm p-2 mr-2 "
          branchDdl={dropdownData}
        />
      </div>
      <div className="relative no-scrollbar">
        <div className="relative h-full">
          {historyState.loading == true ? <Loader /> : ''}
          <Table columns={columns} data={buildings?.buildings?.data || []} className="" />
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

export default BuildingList;
