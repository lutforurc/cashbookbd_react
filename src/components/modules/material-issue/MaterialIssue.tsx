import React, { useEffect, useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiSave, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import RequisitionItemsDropdown from '../../utils/utils-functions/RequisitionItemsDropdown';
import WarehouseDropdown from '../../utils/utils-functions/WarehouseDropdown';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import httpService from '../../services/httpService';
import { API_PROJECT_DDL_LIST_URL } from '../../services/apiRoutes';
import { getDdlWarehouse } from '../warehouse/ddlWarehouseSlider';
import { storeMaterialIssue } from './materialIssueSlice';
import MaterialIssueList from './MaterialIssueList';

type ProductOption = {
  value: string;
  label: string;
  label_3?: string;
};

type ProjectOption = {
  value: string;
  label: string;
};

type IssueItem = {
  id: number;
  productId: string;
  productName: string;
  unit: string;
  quantity: string;
  building: string;
  workItem: string;
  note: string;
};

const emptyLine = {
  productId: '',
  productName: '',
  unit: '',
  quantity: '',
  building: '',
  workItem: '',
  note: '',
};

const MaterialIssue = () => {
  const dispatch = useDispatch<any>();
  const warehouseState = useSelector((s: any) => s.activeWarehouse);
  const warehouseOptions = Array.isArray(warehouseState?.data) ? warehouseState.data : [];

  const [saveButtonLoading, setSaveButtonLoading] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [issueDate, setIssueDate] = useState<Date | null>(dayjs().toDate());
  const [isUpdatingLine, setIsUpdatingLine] = useState(false);
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [lineItem, setLineItem] = useState({ ...emptyLine });
  const [formData, setFormData] = useState({
    issueDate: dayjs().format('YYYY-MM-DD'),
    warehouseId: '',
    projectId: '',
    receivedBy: '',
    note: '',
    items: [] as IssueItem[],
  });

  useEffect(() => {
    dispatch(getDdlWarehouse());

    // Preload the company's projects so the dropdown shows the full list on open
    // (a construction firm has few projects — no need to type-to-search). With
    // no `q`, the endpoint returns all projects for the current company.
    httpService
      .get(API_PROJECT_DDL_LIST_URL)
      .then((res: any) => {
        const root = res?.data?.data?.data ?? res?.data?.data ?? [];
        const list = Array.isArray(root) ? root : Array.isArray(root?.data) ? root.data : [];
        setProjectOptions(
          list.map((p: any) => ({ value: String(p.value ?? p.id), label: p.label ?? p.name })),
        );
      })
      .catch(() => setProjectOptions([]));
  }, [dispatch]);

  const handleFormInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWarehouseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, warehouseId: e.target.value }));
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, projectId: e.target.value }));
  };

  const handleLineItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLineItem((prev) => ({ ...prev, [name]: value }));
  };

  const handleIssueDateChange = (date: Date | null) => {
    setIssueDate(date);
    setFormData((prev) => ({
      ...prev,
      issueDate: date ? dayjs(date).format('YYYY-MM-DD') : '',
    }));
  };

  const handleProductSelect = (option: ProductOption | null) => {
    if (!option) {
      setLineItem((prev) => ({ ...prev, productId: '', productName: '', unit: '' }));
      return;
    }
    setLineItem((prev) => ({
      ...prev,
      productId: option.value || '',
      productName: option.label || '',
      unit: option.label_3 || '',
    }));
  };

  const clearLineForm = () => {
    setLineItem({ ...emptyLine });
    setIsUpdatingLine(false);
    setEditingLineId(null);
  };

  const resetForm = () => {
    const today = dayjs();
    setFormData({
      issueDate: today.format('YYYY-MM-DD'),
      warehouseId: '',
      projectId: '',
      receivedBy: '',
      note: '',
      items: [],
    });
    setIssueDate(today.toDate());
    clearLineForm();
  };

  const validateLineItem = () => {
    if (!lineItem.productId) {
      toast.error('Please select product');
      return false;
    }
    if (!lineItem.quantity || Number(lineItem.quantity) <= 0) {
      toast.error('Please enter valid quantity');
      return false;
    }
    return true;
  };

  const handleAddProduct = () => {
    if (!validateLineItem()) return;
    const newItem: IssueItem = {
      id: Date.now(),
      productId: lineItem.productId,
      productName: lineItem.productName,
      unit: lineItem.unit,
      quantity: lineItem.quantity,
      building: lineItem.building,
      workItem: lineItem.workItem,
      note: lineItem.note,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    clearLineForm();
  };

  const handleEditProduct = (lineId: number) => {
    const found = formData.items.find((item) => item.id === lineId);
    if (!found) return;
    setLineItem({
      productId: found.productId,
      productName: found.productName,
      unit: found.unit,
      quantity: found.quantity,
      building: found.building,
      workItem: found.workItem,
      note: found.note,
    });
    setIsUpdatingLine(true);
    setEditingLineId(lineId);
  };

  const handleUpdateProduct = () => {
    if (!validateLineItem() || editingLineId === null) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === editingLineId
          ? {
              ...item,
              productId: lineItem.productId,
              productName: lineItem.productName,
              unit: lineItem.unit,
              quantity: lineItem.quantity,
              building: lineItem.building,
              workItem: lineItem.workItem,
              note: lineItem.note,
            }
          : item,
      ),
    }));
    clearLineForm();
  };

  const handleDeleteProduct = (lineId: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== lineId),
    }));
    if (editingLineId === lineId) {
      clearLineForm();
    }
  };

  const handleSave = () => {
    if (!formData.projectId) {
      toast.error('Please select a project');
      return;
    }
    if (!formData.items.length) {
      toast.error('Please add at least one product');
      return;
    }

    const payload = {
      issue_date: formData.issueDate || null,
      from_warehouse_id: formData.warehouseId ? Number(formData.warehouseId) : null,
      project_id: Number(formData.projectId),
      received_by: formData.receivedBy || null,
      note: formData.note || null,
      items: formData.items.map((item) => ({
        product_id: Number(item.productId),
        quantity: Number(item.quantity),
        building: item.building || null,
        work_item: item.workItem || null,
        note: item.note || null,
      })),
    };

    setSaveButtonLoading(true);
    dispatch(
      storeMaterialIssue(payload, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Material issue saved');
          resetForm();
          setListRefreshKey((prev) => prev + 1);
        } else {
          toast.error(response?.message || 'Failed to save material issue');
        }
        setSaveButtonLoading(false);
      }),
    );
  };

  return (
    <div>
      <HelmetTitle title="Material Issue" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-2 mb-4">
        <InputDatePicker
          id="issueDate"
          name="issueDate"
          label="Issue Date"
          selectedDate={issueDate}
          setSelectedDate={setIssueDate}
          setCurrentDate={handleIssueDateChange}
          className="w-full h-9.5"
        />
        <div>
          <label className="text-black dark:text-white">From Warehouse</label>
          <WarehouseDropdown
            id="warehouseId"
            name="warehouseId"
            className="p-2"
            warehouseDdl={warehouseOptions}
            onChange={handleWarehouseChange}
            defaultValue={formData.warehouseId}
          />
        </div>
        <div>
          <label className="text-black dark:text-white">Project / Site</label>
          <select
            id="projectId"
            name="projectId"
            value={formData.projectId}
            onChange={handleProjectChange}
            className={`${FIELD_SELECT} block w-full p-2 text-sm`}
          >
            <option value="">Select a project</option>
            {projectOptions.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <InputElement
          id="receivedBy"
          name="receivedBy"
          label="Received By"
          placeholder="Site engineer / receiver"
          value={formData.receivedBy}
          onChange={handleFormInput}
          className="w-full h-9.5"
        />
        <InputElement
          id="note"
          name="note"
          label="Note"
          placeholder="Issue note"
          value={formData.note}
          onChange={handleFormInput}
          className="w-full h-9.5"
        />

        <div className="md:col-span-2 mt-2 border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <label className="text-black dark:text-white">Select Product</label>
              <RequisitionItemsDropdown
                id="issueProduct"
                name="issueProduct"
                onSelect={handleProductSelect}
                defaultValue={
                  lineItem.productId
                    ? { value: lineItem.productId, label: lineItem.productName }
                    : null
                }
                value={
                  lineItem.productId
                    ? { value: lineItem.productId, label: lineItem.productName }
                    : null
                }
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="quantity"
                name="quantity"
                className="h-9.5"
                type="number"
                label={`Quantity ${lineItem.unit ? `(${lineItem.unit})` : ''}`}
                value={lineItem.quantity}
                placeholder="0"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="building"
                name="building"
                className="h-9.5"
                label="Building / Floor"
                value={lineItem.building}
                placeholder="e.g. Building A, 3rd floor"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="workItem"
                name="workItem"
                className="h-9.5"
                label="Work Item"
                value={lineItem.workItem}
                placeholder="e.g. Plaster, Casting"
                onChange={handleLineItemChange}
              />
            </div>
            <div className="md:col-span-2">
              <InputElement
                id="lineNote"
                name="note"
                className="h-9.5"
                label="Line Note"
                value={lineItem.note}
                placeholder="Optional"
                onChange={handleLineItemChange}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
        {isUpdatingLine ? (
          <ButtonLoading
            onClick={handleUpdateProduct}
            buttonLoading={false}
            label="Update Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiEdit2 className="text-white text-lg ml-2 mr-2" />}
          />
        ) : (
          <ButtonLoading
            onClick={handleAddProduct}
            buttonLoading={false}
            label="Add Item"
            className="whitespace-nowrap text-center mr-0 py-2"
            icon={<FiPlus className="text-white text-lg ml-2 mr-2" />}
          />
        )}
        <ButtonLoading
          onClick={clearLineForm}
          buttonLoading={false}
          label="Clear Item"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={saveButtonLoading}
          label={saveButtonLoading ? 'Saving...' : 'Save'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiSave className="text-white text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={resetForm}
          buttonLoading={false}
          label="Reset All"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-white text-lg ml-2 mr-2" />}
        />
      </div>

      <div className="mt-3 col-span-2 overflow-x-auto mb-5">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-200">
            <tr>
              <th className="px-2 py-2 text-center">Sl</th>
              <th className="px-2 py-2">Product</th>
              <th className="px-2 py-2 text-right">Qty</th>
              <th className="px-2 py-2">Building / Floor</th>
              <th className="px-2 py-2">Work Item</th>
              <th className="px-2 py-2">Note</th>
              <th className="px-2 py-2 text-center w-20">Action</th>
            </tr>
          </thead>
          <tbody>
            {formData.items.map((row, index) => (
              <tr key={row.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-2 py-2 text-center text-gray-900 dark:text-white">{index + 1}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-white">{row.productName}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.quantity))} {row.unit}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-white">{row.building || '-'}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-white">{row.workItem || '-'}</td>
                <td className="px-2 py-2 text-gray-900 dark:text-white">{row.note || '-'}</td>
                <td className="px-2 py-2 text-center text-gray-900 dark:text-white">
                  <button
                    onClick={() => handleDeleteProduct(row.id)}
                    className="text-red-500 ml-2 text-center"
                  >
                    <FiTrash2 className="cursor-pointer text-center" />
                  </button>
                  <button
                    onClick={() => handleEditProduct(row.id)}
                    className="text-green-500 ml-2 text-center"
                  >
                    <FiEdit2 className="cursor-pointer text-center" />
                  </button>
                </td>
              </tr>
            ))}
            {formData.items.length === 0 && (
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td colSpan={7} className="px-2 py-3 text-center text-gray-500 dark:text-gray-300">
                  No product added
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MaterialIssueList refreshKey={listRefreshKey} />
    </div>
  );
};

export default MaterialIssue;
