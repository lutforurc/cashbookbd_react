import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiSave, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import Select from "react-select";
import InputElement from "../../utils/fields/InputElement";
import HelmetTitle from "../../utils/others/HelmetTitle";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import { formatRoleNameForCashBook } from "../../utils/utils-functions/formatRoleName";
import {
  getPermissionGroups,
  getPermissions,
  storePermission,
  updatePermission,
} from "./userManagementSlice";
import { Button } from '../../../pages/UiElements/CustomButtons';
import { Input } from '../../utils/fields/FormControls';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../theme/fieldStyles';

interface PermissionItem {
  name: string;
  group_name: string;
}

const initialPermissionItem: PermissionItem = {
  name: "",
  group_name: "",
};

// Sentinel value for the "add new group" option in the dropdown.
const NEW_GROUP = "__new_group__";

const AddPermission: React.FC = () => {
  const dispatch = useDispatch();
  const userManagement = useSelector((state: any) => state.userManagement);
  const [formData, setFormData] = useState<PermissionItem>(initialPermissionItem);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    dispatch(getPermissionGroups() as any);
    dispatch(getPermissions() as any);
  }, [dispatch]);

  const groupOptions: string[] = useMemo(() => {
    const raw = userManagement?.permissionGroups?.data?.data;
    return Array.isArray(raw)
      ? raw.filter((g: any) => typeof g === "string" && g.trim() !== "")
      : [];
  }, [userManagement?.permissionGroups?.data?.data]);

  const allPermissions = useMemo(() => {
    const raw = userManagement?.permissions?.data?.data;
    return Array.isArray(raw) ? raw : [];
  }, [userManagement?.permissions?.data?.data]);

  const permissionsInGroup = useMemo(() => {
    if (!formData.group_name) return [];
    return allPermissions
      .filter((p: any) => p?.group_name === formData.group_name)
      .sort((a: any, b: any) => (a?.name || "").localeCompare(b?.name || ""));
  }, [allPermissions, formData.group_name]);

  const groupSelectOptions = useMemo(
    () => [
      ...groupOptions.map((group) => ({ value: group, label: group })),
      { value: NEW_GROUP, label: "＋ Add new group" },
    ],
    [groupOptions]
  );

  const selectedGroupOption = useMemo(
    () => groupSelectOptions.find((opt) => opt.value === formData.group_name) || null,
    [groupSelectOptions, formData.group_name]
  );

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGroupSelect = (option: any) => {
    const value = option?.value ?? "";
    setEditingId(null);
    if (value === NEW_GROUP) {
      setIsNewGroup(true);
      setFormData((prev) => ({ ...prev, group_name: "" }));
      return;
    }
    setIsNewGroup(false);
    setFormData((prev) => ({ ...prev, group_name: value }));
  };

  const handleBackToList = () => {
    setIsNewGroup(false);
    setFormData((prev) => ({ ...prev, group_name: "" }));
  };

  const startEdit = (perm: any) => {
    setEditingId(perm.id);
    setEditingName(perm.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = () => {
    if (editingId == null) return;
    if (!editingName.trim()) {
      toast.info("Permission name is required.");
      return;
    }

    setSavingEdit(true);
    dispatch(
      updatePermission({
        id: editingId,
        name: editingName.trim(),
        group_name: formData.group_name.trim(),
      }) as any
    )
      .unwrap()
      .then((data: any) => {
        if (data?.success === false) {
          toast.error(data?.message || "Failed to update permission");
          return;
        }
        toast.success(data?.message || "Permission updated successfully");
        cancelEdit();
        dispatch(getPermissions() as any);
        dispatch(getPermissionGroups() as any);
      })
      .catch((error: any) => {
        toast.error(error?.message || "Failed to update permission");
      })
      .finally(() => {
        setSavingEdit(false);
      });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.info("Permission name is required.");
      return;
    }

    setLoading(true);
    dispatch(
      storePermission({
        name: formData.name.trim(),
        group_name: formData.group_name.trim(),
      }) as any
    )
      .unwrap()
      .then((data: any) => {
        // The API helpers return HTTP 200 even for handled failures
        // (duplicate name / not allowed), flagged via `success: false`.
        if (data?.success === false) {
          toast.error(data?.message || "Failed to create permission");
          return;
        }
        toast.success(data?.message || "Permission created successfully");
        setFormData(initialPermissionItem);
        setIsNewGroup(false);
        dispatch(getPermissionGroups() as any);
        dispatch(getPermissions() as any);
      })
      .catch((error: any) => {
        toast.error(error?.message || "Failed to create permission");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <HelmetTitle title="Add New Permission" />
      <div className="flex justify-center mt-6">
        <div className="flex flex-col w-full max-w-sm px-4">
          <div className="mb-4 text-left">
            <InputElement
              id="name"
              name="name"
              value={formData.name}
              label="Permission Name"
              placeholder="e.g. voucher.approval"
              className=""
              onChange={handleOnChange}
            />
            <p className="mt-1 text-xs text-bodydark2">
              Use a dotted key like <code>module.action</code> (e.g. <code>voucher.approval</code>).
            </p>
          </div>

          <div className="mb-4 text-left">
            {isNewGroup ? (
              <>
                <div className="flex items-center justify-between">
                  <label htmlFor="group_name" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                    Group Name
                  </label>
                  <Button
                    type="button"
                    onClick={handleBackToList}
                    className="text-xs text-primary hover:underline"
                  >
                    Choose from list
                  </Button>
                </div>
                <InputElement
                  id="group_name"
                  name="group_name"
                  value={formData.group_name}
                  placeholder="e.g. Admin"
                  className=""
                  onChange={handleOnChange}
                />
              </>
            ) : (
              <>
                <label
                  htmlFor="group_name"
                  className="text-left text-sm text-gray-900 dark:text-[rgb(var(--c-text))]"
                >
                  Group Name
                </label>
                <Select
                  inputId="group_name"
                  value={selectedGroupOption}
                  onChange={handleGroupSelect}
                  options={groupSelectOptions}
                  placeholder="Search or select group..."
                  isSearchable
                  isClearable
                  className="text-left text-sm"
                  styles={withFieldHeight({
                    // The one height, in the units react-select understands.
                    control: (base) => ({ ...base, minHeight: FIELD_HEIGHT_REM }),
                  })}
                  classNames={{
                    control: (state) =>
                      `bg-white! border-gray-300! rounded-xs! dark:bg-boxdark! dark:border-gray-600! ${
                        state.isFocused ? "border-blue-500! dark:border-blue-400!" : ""
                      }`,
                    placeholder: () => `text-gray-400 dark:text-gray-500 text-sm`,
                    input: () => `text-gray-900 dark:text-[rgb(var(--c-text))] text-sm`,
                    menu: () =>
                      `rounded-xs! border border-gray-300 bg-white dark:bg-boxdark dark:border-gray-600 z-20`,
                    option: (state) =>
                      `cursor-pointer text-sm ${
                        state.isFocused
                          ? "bg-gray-100 dark:bg-gray-700"
                          : "bg-white dark:bg-boxdark"
                      } ${state.data.value === NEW_GROUP ? "font-medium text-primary" : ""}`,
                    singleValue: () => `text-gray-900 dark:text-[rgb(var(--c-text))] text-sm`,
                  }}
                />
              </>
            )}
            <p className="mt-1 text-xs text-bodydark2">
              Pick an existing group to avoid duplicates, or choose “Add new group” to create one.
            </p>
          </div>

          <div className="mb-6 text-left">
            <ButtonLoading
              onClick={handleSave}
              buttonLoading={loading}
              className="p-2"
              label="Save"
              icon={<FiSave size={16} className="mr-2" />}
            />
          </div>

          {!isNewGroup && formData.group_name && (
            <div className="rounded-lg border border-[rgb(var(--c-border))] bg-gray-50 p-3 dark:bg-meta-4/40">
              <p className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-200">
                Permissions in “{formData.group_name}” ({permissionsInGroup.length})
              </p>
              {permissionsInGroup.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {permissionsInGroup.map((perm: any) =>
                    editingId === perm.id ? (
                      <li
                        key={perm.id}
                        className="flex items-center gap-1 rounded border border-blue-400 bg-[rgb(var(--c-surface))] px-1 py-0.5"
                      >
                        <Input
                          value={editingName}
                          autoFocus
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit();
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="w-28 bg-transparent font-mono text-[11px] text-gray-800 outline-none dark:text-gray-100"
                        />
                        <Button
                          type="button"
                          onClick={saveEdit}
                          disabled={savingEdit}
                          title="Save"
                          className="text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          <FiCheck size={13} />
                        </Button>
                        <Button
                          type="button"
                          onClick={cancelEdit}
                          title="Cancel"
                          className="text-red-500 hover:text-red-600"
                        >
                          <FiX size={13} />
                        </Button>
                      </li>
                    ) : (
                      <li
                        key={perm.id}
                        className="group flex items-center gap-1 rounded border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] px-2 py-0.5"
                      >
                        <span
                          title={formatRoleNameForCashBook(perm.name)}
                          className="font-mono text-[11px] text-gray-700 dark:text-gray-200"
                        >
                          {perm.name}
                        </span>
                        <Button
                          type="button"
                          onClick={() => startEdit(perm)}
                          title="Edit permission"
                          className="text-gray-400 hover:text-primary"
                        >
                          <FiEdit2 size={11} />
                        </Button>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p className="text-xs text-bodydark2">No permissions in this group yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AddPermission;
