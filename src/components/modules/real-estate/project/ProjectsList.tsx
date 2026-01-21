import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { projectList } from './projectSlice';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import Pagination from '../../../utils/utils-functions/Pagination';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';


const ProjectsList = ({ user }: any) => {
  const branchDdlData = useSelector((state) => state.branchDdl);
  const realEstateProjects = useSelector((state) => state.realEstateProjects);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [branchId, setBranchId] = useState<string | number>(user?.branch_id ?? "");
  const [dropdownData, setDropdownData] = useState<any[]>([]);



  useEffect(() => {
    dispatch(getDdlProtectedBranch());
    setBranchId(user?.branch_id);
  }, []);



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
    const total = realEstateProjects?.projects?.total;
    if (total) {
      setTotalPages(Math.ceil(total / perPage));
    } else {
      setTotalPages(0);
    }
  }, [realEstateProjects?.projects?.total, perPage]);

  useEffect(() => {
    dispatch(
      projectList({
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
    setTotalPages(Math.ceil(realEstateProjects?.projects.total / perPage));
  };

  const handleSelectChange = (page: any) => {
    setPerPage(page.target.value);
    setPage(1);
    setCurrentPage(1);
    setTotalPages(Math.ceil(realEstateProjects?.projects.total / page.target.value));
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Name of Project',
      render: (row: any) => (
        <div>
          {row.name || ''}
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      render: (row: any) => (
        <div>
          {row.area_sqft || ''} Sft
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (row: any) => (
        <div>
          {row.area.name || ''}
        </div>
      ),
    },

    {
      key: 'branch',
      header: 'Branch',
      render: (row: any) => (
        <div>
          {row.area.branch.name || ''}
        </div>
      ),
    },
  ];

  return (
    <div className=''>
      <HelmetTitle title={'Real Estate Project List'} />
      <div className="flex mb-1 justify-between">
        <div>
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
        <ButtonLoading
        className='h-9'
          // onClick={handleSearchButton}
          // buttonLoading={buttonLoading}
          label="New Project"
        />
        {/* <link rel="stylesheet" to="/real-estate/project-activities" /> */}
      </div>
      <div className="relative no-scrollbar">
        <div className="relative h-full">
          {realEstateProjects.loading == true ? <Loader /> : ''}
          <Table columns={columns} data={realEstateProjects?.projects?.data || []} className="" />
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

export default ProjectsList;
