import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHome, FiSave } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputElement from '../../utils/fields/InputElement';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import routes from '../../services/appRoutes';
import { labourCategoryList, labourCategorySave } from './labourSetupSlice';

/**
 * The labour category form — one page for both New and Edit.
 *
 * Editing reads the row out of the list already in the store; arriving on this
 * URL cold (a refresh, a shared link) fetches the one row it needs rather than
 * leaving the fields blank with an id in the address bar.
 */
const LabourCategoryAdd = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();

  const { categories, saving } = useSelector((state: any) => state.labourSetup);

  const editingId = id ? Number(id) : null;
  const [form, setForm] = useState({ name: '', description: '', status: true });
  const [loadingRow, setLoadingRow] = useState(Boolean(editingId));

  useEffect(() => {
    if (!editingId) return;

    const known = (categories?.rows || []).find((row: any) => Number(row.id) === editingId);

    if (known) {
      setForm({
        name: known.name ?? '',
        description: known.description ?? '',
        status: Number(known.status) === 1,
      });
      setLoadingRow(false);
      return;
    }

    // Landed here without the list behind us.
    dispatch(labourCategoryList({ page: 1, per_page: 500 })).then((action: any) => {
      const rows = action?.payload?.data?.data?.data ?? [];
      const row = rows.find((r: any) => Number(r.id) === editingId);

      if (row) {
        setForm({
          name: row.name ?? '',
          description: row.description ?? '',
          status: Number(row.status) === 1,
        });
      } else {
        toast.info('That labour category no longer exists');
        navigate(routes.labour_category);
      }

      setLoadingRow(false);
    });
  }, [editingId]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.info('Please enter a category name');
      return;
    }

    const result = await dispatch(labourCategorySave({ id: editingId, ...form }));

    if (labourCategorySave.rejected.match(result)) {
      toast.info(String(result.payload ?? 'Could not save the labour category'));
      return;
    }

    toast.success(editingId ? 'Labour category updated' : 'Labour category saved');
    navigate(routes.labour_category);
  };

  return (
    <div>
      <HelmetTitle title={editingId ? 'Edit Labour Category' : 'New Labour Category'} />

      {loadingRow ? <Loader /> : null}

      {/* Two fields do not want the full width of a monitor. The same narrow
          centred column the product Add Category form uses: no card, fields
          stacked, and the two buttons sharing the width beneath them. */}
      <div className="mx-auto mt-5 grid w-full grid-cols-1 justify-center gap-2 md:w-2/3 lg:w-1/2">
        <InputElement
          id="name"
          name="name"
          label="Enter Category Name"
          placeholder="Category Name"
          value={form.name}
          className="mb-0 h-9"
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        />

        <InputElement
          id="description"
          name="description"
          label="Category Description"
          placeholder="Enter Category Description"
          value={form.description}
          className="mb-0 h-9"
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />

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
            onClick={() => navigate(routes.labour_category)}
            label="Back"
            className="mr-0 h-9 whitespace-nowrap text-center"
            icon={<FiHome className="ml-2 mr-2 text-lg" />}
          />
        </div>
      </div>
    </div>
  );
};

export default LabourCategoryAdd;
