import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHome, FiSave } from 'react-icons/fi';

import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import httpService from '../../../services/httpService';
import {
  API_HRMS_DEPARTMENT_EDIT_URL,
  API_HRMS_DEPARTMENT_STORE_URL,
  API_HRMS_DEPARTMENT_UPDATE_URL,
} from '../../../services/apiRoutes';
import ROUTES from '../../../services/appRoutes';
import BilingualInput from '../../../utils/fields/BilingualInput';
import HelmetTitle from '../../../utils/others/HelmetTitle';

const EMPTY = { id: '', name: '', name_local: '', description: '', description_local: '', status: 1 };

/** New or edit a department. A department people are in is closed by setting it Inactive. */
const AddDepartment = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) {
      setForm(EMPTY);
      return;
    }
    httpService.get(`${API_HRMS_DEPARTMENT_EDIT_URL}/${id}`).then((res) => {
      const row = res.data?.data?.data ?? res.data?.data;
      if (row?.id) {
        setForm({
          id: row.id,
          name: row.name || '',
          name_local: row.name_local || '',
          description: row.description || '',
          description_local: row.description_local || '',
          status: Number(row.status ?? 1),
        });
      }
    });
  }, [id]);

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('department.nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await httpService.post(form.id ? API_HRMS_DEPARTMENT_UPDATE_URL : API_HRMS_DEPARTMENT_STORE_URL, form);
      if (res.data?.success === false) {
        toast.error(res.data?.message || t('department.saveFailed'));
        return;
      }
      toast.success(t('department.saved'));
      navigate(ROUTES.hrms_department_list);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('department.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <HelmetTitle title={form.id ? t('department.editTitle') : t('department.addTitle')} />

      <div className="mx-auto mt-10 mb-10 w-full md:w-4/5 lg:w-3/5 xl:w-2/5">
        <div className="mb-2">
          <BilingualInput
            name="name"
            kind="name"
            label={t('department.name', { lng: 'en' })}
            placeholder={t('department.namePlaceholder', { lng: 'en' })}
            value={form.name}
            localValue={form.name_local}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onLocalChange={(value) => setForm((f) => ({ ...f, name_local: value }))}
          />
        </div>

        <div className="mb-2">
          <BilingualInput
            name="description"
            kind="description"
            label={t('department.description', { lng: 'en' })}
            placeholder={t('department.descriptionPlaceholder', { lng: 'en' })}
            value={form.description}
            localValue={form.description_local}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            onLocalChange={(value) => setForm((f) => ({ ...f, description_local: value }))}
          />
        </div>

        {form.id ? (
          <label className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.status === 1}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? 1 : 0 }))}
            />
            {t('department.active')}
          </label>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-1">
          <ButtonLoading
            onClick={handleSave}
            buttonLoading={saving}
            label={form.id ? t('department.update', { lng: 'en' }) : t('common.save', { lng: 'en' })}
            className="mr-0 whitespace-nowrap p-2 text-center"
            icon={<FiSave className="mr-2 text-lg" />}
          />
          <ButtonLoading
            onClick={() => navigate(ROUTES.hrms_department_list)}
            buttonLoading={false}
            label={t('department.back', { lng: 'en' })}
            className="whitespace-nowrap text-center mr-0"
            icon={<FiHome className="text-lg mr-2" />}
          />
        </div>
      </div>
    </>
  );
};

export default AddDepartment;
