import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { fetchAreas } from './areaSlice';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import SelectOption from '../../../utils/utils-functions/SelectOption';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { useNavigate } from 'react-router-dom';


const AreaList = () => {
  const dispatch = useDispatch();
  const realEstateArea = useSelector((state) => state.realEstateArea);
  const [tableData, setTableData] = useState<any[]>([]);
  const navigate = useNavigate();
   const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAreas());
  }, []);

  useEffect(() => {
    setTableData(realEstateArea?.areas);
  }, [realEstateArea]);

  const columns = [
    {
      key: 'id',
      header: 'Sl. No',
      width: '80px',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => <div>{row?.id ? row.id : '-'}</div>,
    },
    {
      key: 'name',
      header: 'Name of areas',
      width: '80px',
    },
    {
      key: 'branch',
      header: 'Branch',
      width: '80px',
      render: (row: any) => <div>
        {row?.branch?.name ? row?.branch?.name : ''}
        {row?.branch?.description ? row?.branch?.description : ''}
      </div>,
    },
    {
      key: 'company',
      header: 'Company',
      width: '80px',
      render: (row: any) => <div>
        {row?.company?.name ? row?.company?.name : ''}
        {row?.company?.description ? row?.company?.description : ''}
      </div>,
    },

  ];

  const handleSelectChange = (page: any) => {
    // setPerPage(page.target.value);
    // setPage(1);
    // setCurrentPage(1);
    // setTotalPages(Math.ceil(branchList.data.total / page.target.value));
  };
  const handleSearchButton = (e: any) => {
    // setButtonLoading(false);
    navigate('/real-estate/add-area'); // Replace with your desired URL
  };
  return (
    <div>
      <HelmetTitle title={'List of Project Areas'} />
      <div className="flex justify-between mb-1">
        <SelectOption
          onChange={handleSelectChange}
        />
        <ButtonLoading
          onClick={handleSearchButton}
          buttonLoading={buttonLoading}
          label="Add Area"
        />
      </div>
      {realEstateArea.isLoading ? <Loader /> : ''}
      <Table columns={columns} data={tableData || []} noDataMessage="No areas found" />
    </div>
  )
}

export default AreaList
