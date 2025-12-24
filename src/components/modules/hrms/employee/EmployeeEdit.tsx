import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
// import { fetchEmployeeById, updateEmployee } from './employeeSlice';

const EmployeeEdit = ({ user }: any) => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { employee, loading } = useSelector((state: any) => state.employees);
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    designation_id: '',
    branch_id: '',
    status: 1,
  });

  const [dropdownData, setDropdownData] = useState<any[]>([]);

  /* =====================
      Initial Load
  ====================== */
  useEffect(() => {
    // dispatch(getDdlProtectedBranch());
    // dispatch(fetchEmployeeById(id));
  }, [id]);

  /* =====================
      Set form data
  ====================== */
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name,
        mobile: employee.mobile,
        designation_id: employee.designation_id,
        branch_id: employee.branch_id,
        status: employee.status,
      });
    }
  }, [employee]);

  /* =====================
      Dropdown data
  ====================== */
  useEffect(() => {
    if (branchDdlData?.protectedData?.data) {
      setDropdownData(branchDdlData.protectedData.data);
    }
  }, [branchDdlData]);

  /* =====================
      Handlers
  ====================== */
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    dispatch(updateEmployee({ id, data: formData }))
      .then(() => navigate('/hrms/employee/list'));
  };

  if (loading) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Edit Employee" />

      <form onSubmit={handleSubmit} className="max-w-xl">
        <div className="mb-3">
          <label>Employee Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        <div className="mb-3">
          <label>Mobile</label>
          <input
            type="text"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        <div className="mb-3">
          <label>Project</label>
          <BranchDropdown
            value={formData.branch_id}
            branchDdl={dropdownData}
            onChange={(e: any) =>
              setFormData(prev => ({ ...prev, branch_id: e.target.value }))
            }
          />
        </div>

        <div className="mb-3">
          <label>Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="input"
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </div>

        <button type="submit" className="btn-primary">
          Update Employee
        </button>
      </form>
    </div>
  );
};

export default EmployeeEdit;
