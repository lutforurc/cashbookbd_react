import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHome, FiSave } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';
import { fetchProductUnitDdl } from '../product/unit/unitSlice';
import { labourCategoryDdl, labourItemList, labourItemSave } from './labourSetupSlice';

const emptyForm = {
  name: '',
  lab_cat_id: '' as string | number,
  unit_id: '' as string | number,
  purchase_price: '' as string | number,
  description: '',
  status: true,
};

/**
 * The labour item form — one page for both New and Edit.
 *
 * Units come from the product unit list rather than a second list of the same
 * units; a labour item measured in square feet means the same square feet a
 * product does.
 */
const LabourItemAdd = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const { items, categoryDdl, saving } = useSelector((state: any) => state.labourSetup);
  const unitDdl = useSelector((state: any) => state.productUnit?.unitDdl) || [];

  const editingId = id ? Number(id) : null;
  const [form, setForm] = useState(emptyForm);
  const [loadingRow, setLoadingRow] = useState(Boolean(editingId));

  useEffect(() => {
    dispatch(labourCategoryDdl());
    dispatch(fetchProductUnitDdl(''));
  }, [dispatch]);

  const fill = (row: any) =>
    setForm({
      name: row.name ?? '',
      lab_cat_id: row.lab_cat_id ?? '',
      unit_id: row.unit_id ?? '',
      purchase_price: row.purchase_price ?? '',
      description: row.description ?? '',
      status: Number(row.status) === 1,
    });

  useEffect(() => {
    if (!editingId) return;

    const known = (items?.rows || []).find((row: any) => Number(row.id) === editingId);

    if (known) {
      fill(known);
      setLoadingRow(false);
      return;
    }

    // Landed here without the list behind us.
    dispatch(labourItemList({ page: 1, per_page: 500 })).then((action: any) => {
      const rows = action?.payload?.data?.data?.data ?? [];
      const row = rows.find((r: any) => Number(r.id) === editingId);

      if (row) {
        fill(row);
      } else {
        toast.info('That labour item no longer exists');
        navigate(routes.labour_item);
      }

      setLoadingRow(false);
    });
  }, [editingId]);

  const categoryOptions = useMemo(
    () => [{ id: '', name: 'Select Category' }, ...(Array.isArray(categoryDdl) ? categoryDdl : [])],
    [categoryDdl],
  );

  const unitOptions = useMemo(
    () => [
      { id: '', name: 'Select Unit' },
      ...(Array.isArray(unitDdl) ? unitDdl.map((u: any) => ({ id: u.id ?? u.value, name: u.name ?? u.label })) : []),
    ],
    [unitDdl],
  );

  const handleSave = async () => {
    if (!form.name.trim()) return toast.info('Please enter an item name');
    if (!form.lab_cat_id) return toast.info('Please select a category');
    if (!form.unit_id) return toast.info('Please select a unit');

    const result = await dispatch(labourItemSave({ id: editingId, ...form }));

    if (labourItemSave.rejected.match(result)) {
      toast.info(String(result.payload ?? 'Could not save the labour item'));
      return;
    }

    toast.success(editingId ? 'Labour item updated' : 'Labour item saved');
    navigate(routes.labour_item);
  };

  return (
    <div>
      <HelmetTitle title={editingId ? 'Edit Labour Item' : 'New Labour Item'} />

      {loadingRow ? <Loader /> : null}

      {/* The same narrow centred column as the category form beside it. Five
          fields is still a short form, and the two screens are reached from
          the same menu -- they should not be laid out differently. Unit and
          Rate share a row: one is what the other is measured in. */}
      <div className="mx-auto mt-5 grid w-full grid-cols-1 justify-center gap-2 md:w-2/3 lg:w-1/2">
        <DropdownCommon
          id="lab_cat_id"
          name="lab_cat_id"
          label="Select Category"
          value={form.lab_cat_id?.toString()}
          data={categoryOptions}
          onChange={(e: any) => setForm((prev) => ({ ...prev, lab_cat_id: e.target.value }))}
          className="h-9"
        />

        <InputElement
          id="itemName"
          name="name"
          label="Enter Item Name"
          placeholder="Item Name"
          value={form.name}
          className="mb-0 h-9"
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />

        <InputElement
          id="itemDescription"
          name="description"
          label="Item Description"
          placeholder="Enter Item Description"
          value={form.description}
          className="mb-0 h-9"
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <DropdownCommon
            id="unit_id"
            name="unit_id"
            label="Select Unit"
            value={form.unit_id?.toString()}
            data={unitOptions}
            onChange={(e: any) => setForm((prev) => ({ ...prev, unit_id: e.target.value }))}
            className="h-9"
          />
          <InputElement
            id="purchase_price"
            name="purchase_price"
            label="Rate"
            type="number"
            placeholder="Enter Rate"
            value={form.purchase_price}
            className="mb-0 h-9 text-right"
            onChange={(e) => setForm((prev) => ({ ...prev, purchase_price: e.target.value }))}
          />
        </div>

        <div className="mt-1">
          <ToggleSwitch
            label="Active"
            checked={form.status}
            onChange={(checked) => setForm((prev) => ({ ...prev, status: checked }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-x-1 gap-y-1 md:grid-cols-2">
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saving}
            label={editingId ? 'Update' : 'Save'}
            className="mr-0 h-9 whitespace-nowrap text-center"
            icon={<FiSave className="ml-2 mr-2 text-lg" />}
          />
          <ButtonLoading
            onClick={() => navigate(routes.labour_item)}
            label="Back"
            className="mr-0 h-9 whitespace-nowrap text-center"
            icon={<FiHome className="ml-2 mr-2 text-lg" />}
          />
        </div>
      </div>
    </div>
  );
};

export default LabourItemAdd;
