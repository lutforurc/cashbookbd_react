import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { fetchAreas } from './areaSlice';
import Loader from '../../../../common/Loader';
import Table from '../../../utils/others/Table';


const AreaList = () => {
  const dispatch = useDispatch();
  const realEstateArea = useSelector((state) => state.realEstateArea);
    const [tableData, setTableData] = useState<any[]>([]);

  useEffect(() => {
    dispatch(fetchAreas());
  }, []);

  useEffect(() => {
    setTableData(realEstateArea?.areas);
  }, [realEstateArea]);

  console.log(realEstateArea);
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
      header: 'Area Name',
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
    
  ];
  
  return (
    <div>
      {realEstateArea.isLoading ? <Loader /> : ''}
        <Table columns={columns} data={tableData || []} />
    </div>
  )
}

export default AreaList
