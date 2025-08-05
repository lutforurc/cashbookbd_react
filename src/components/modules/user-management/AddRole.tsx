import React, { useState } from "react";
import { useDispatch } from "react-redux";
// import { storeRole } from "../../../redux/slices/userManagementSlice";
import InputElement from "../../utils/fields/InputElement";
import HelmetTitle from "../../utils/others/HelmetTitle";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons"; 
import { storeRole } from "./userManagementSlice";
import { toast } from 'react-toastify';

interface RoleItem {
  id: string | number;
  name: string;
}

const initialRoleItem: RoleItem = {
  id: "",
  name: "",
};

const AddRole = () => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState<RoleItem>(initialRoleItem);
  const [loading, setLoading] = useState(false); // Manage button loading state

  const handleRoleSave = () => {
    setLoading(true);
    dispatch(storeRole(formData))
      .unwrap()
      .then((data:any) => {
        toast.success((data?.data?.data || "Role create success!")); 
        console.log(data?.data?.data);
        setFormData(initialRoleItem); // Reset form
      })
      .catch((error:any) => { 
        toast.success((error?.message || "The name already taken!")); // Error message
      })
      .finally(() => {
        setLoading(false); // Stop loading after response
      });
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <>
      <HelmetTitle title="Add New Role" />
      <div className="flex justify-center mt-6">
        <div className="flex flex-col w-full max-w-sm px-4">
          <div className="mb-6 text-left">
            <InputElement
              id="name"
              value={formData.name}
              name="name"
              placeholder={"Role Name"}
              label={"Role Name"}
              className=""
              onChange={handleOnChange}
            />
          </div>
          <div className="text-left">
            <ButtonLoading
              onClick={handleRoleSave}
              buttonLoading={loading} // Disable button while loading
              label="Save"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AddRole;