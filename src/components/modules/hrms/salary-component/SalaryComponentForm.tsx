import React, { useEffect, useState } from 'react';
import { FiHome, FiSave } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import ROUTES from '../../../services/appRoutes';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import {
  clearSalaryComponentEditData,
  editSalaryComponent,
  saveSalaryComponent,
  updateSalaryComponent,
  SalaryComponentItem,
} from './salaryComponentSlice';
import BilingualInput from '../../../utils/fields/BilingualInput';
import { useLanguage } from '../../../../i18n/useLanguage';

interface SalaryComponentForm {
  id: string | number;
  name: string;
  short_name: string;
  code: string;
  component_type: string;
  category: string;
  calculation_type: string;
  percent_base: string;
  default_amount: string;
  default_percent: string;
  prorate: string;
  rounding: string;
  include_in_gross: string;
  include_in_deduction_base: string;
  salary_sheet_types: string;
  sort_order: string;
}

const initialFormData: SalaryComponentForm = {
  id: '',
  name: '',
  name_local: '',
  short_name: '',
  code: '',
  component_type: 'earning',
  category: 'allowance',
  calculation_type: 'fixed',
  percent_base: 'basic',
  default_amount: '',
  default_percent: '',
  prorate: '1',
  rounding: 'none',
  include_in_gross: '1',
  include_in_deduction_base: '0',
  salary_sheet_types: 'monthly',
  sort_order: '0',
};

const typeOptions = [
  { id: 'earning', name: 'Earning' },
  { id: 'deduction', name: 'Deduction' },
];

const categoryOptions = [
  { id: 'basic', name: 'Basic' },
  { id: 'allowance', name: 'Allowance' },
  { id: 'bonus', name: 'Bonus' },
  { id: 'benefit', name: 'Benefit' },
  { id: 'overtime', name: 'Overtime' },
  { id: 'statutory', name: 'Statutory' },
  { id: 'loan', name: 'Loan' },
  { id: 'other', name: 'Other' },
];

const calculationOptions = [
  { id: 'fixed', name: 'Fixed amount' },
  { id: 'percent', name: 'Percent of Basic / Gross' },
  { id: 'per_day', name: 'Per day (not yet paid)' },
];

const percentBaseOptions = [
  { id: 'basic', name: 'Basic' },
  { id: 'gross', name: 'Gross' },
];

const roundingOptions = [
  { id: 'none', name: 'No rounding' },
  { id: 'nearest_1', name: 'Nearest 1' },
  { id: 'nearest_10', name: 'Nearest 10' },
  { id: 'up_10', name: 'Up to 10' },
];

const sheetTypeOptions = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'monthly,overtime', name: 'Monthly + Overtime' },
  { id: 'overtime', name: 'Overtime' },
];

const yesNo = [
  { id: '1', name: 'Yes' },
  { id: '0', name: 'No' },
];

const SalaryComponentForm = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();
  const componentState = useSelector((state: any) => state.salaryComponent);

  const [formData, setFormData] = useState<SalaryComponentForm>(initialFormData);
  const { localCode } = useLanguage();
  const [buttonLoading, setButtonLoading] = useState(false);

  const isSystemLocked = Boolean(componentState?.editData?.system_locked);

  useEffect(() => {
    if (id) {
      dispatch(editSalaryComponent(id));
      return;
    }

    dispatch(clearSalaryComponentEditData());
    setFormData(initialFormData);
  }, [dispatch, id]);

  useEffect(() => {
    const loaded = componentState?.editData;

    if (!loaded || (id && String(loaded.id) !== String(id))) return;

    setFormData({
      id: loaded?.id ?? '',
      name: loaded?.name ?? '',
      name_local: loaded?.name_local ?? '',
      short_name: loaded?.short_name ?? '',
      code: loaded?.code ?? '',
      component_type: loaded?.component_type ?? 'earning',
      category: loaded?.category ?? 'allowance',
      calculation_type: loaded?.calculation_type ?? 'fixed',
      percent_base: loaded?.percent_base ?? 'basic',
      default_amount: loaded?.default_amount != null ? String(loaded.default_amount) : '',
      default_percent: loaded?.default_percent != null ? String(loaded.default_percent) : '',
      prorate: String(loaded?.prorate ?? '0'),
      rounding: loaded?.rounding ?? 'none',
      include_in_gross: String(loaded?.include_in_gross ?? '1'),
      include_in_deduction_base: String(loaded?.include_in_deduction_base ?? '0'),
      salary_sheet_types: loaded?.salary_sheet_types || 'monthly',
      sort_order: String(loaded?.sort_order ?? '0'),
    });
  }, [componentState?.editData, id]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter the pay head name.');
      return false;
    }

    if (!formData.id && !formData.code.trim()) {
      toast.error('Please enter a code.');
      return false;
    }

    if (!formData.id && !/^[a-z0-9_]+$/.test(formData.code.trim())) {
      toast.error('The code may hold lowercase letters, digits and underscores only.');
      return false;
    }

    if (formData.calculation_type === 'percent' && !formData.default_percent) {
      toast.error('Please enter the percentage.');
      return false;
    }

    return true;
  };

  const payload = (): Partial<SalaryComponentItem> => ({
    ...formData,
    // The Bangla name goes only where the company has a local language, so an
    // untouched blank never clears one written while Bangla was on.
    name_local: localCode ? (formData as any).name_local : undefined,
    component_type: formData.component_type as SalaryComponentItem['component_type'],
    code: formData.code.trim().toLowerCase(),
    default_amount: formData.default_amount === '' ? null : formData.default_amount,
    default_percent: formData.default_percent === '' ? null : formData.default_percent,
    prorate: Number(formData.prorate) ? 1 : 0,
    include_in_gross: Number(formData.include_in_gross) ? 1 : 0,
    include_in_deduction_base: Number(formData.include_in_deduction_base) ? 1 : 0,
    sort_order: Number(formData.sort_order) || 0,
  });

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(saveSalaryComponent(payload())).unwrap();
      toast.success(response?.message || 'Pay head saved successfully');
      setTimeout(() => navigate(ROUTES.hrms_salary_component_list), 400);
    } catch (err: any) {
      toast.error(err || 'Failed to save pay head');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(updateSalaryComponent(payload() as any)).unwrap();
      toast.success(response?.message || 'Pay head updated successfully');
      setTimeout(() => navigate(ROUTES.hrms_salary_component_list), 400);
    } catch (err: any) {
      toast.error(err || 'Failed to update pay head');
    } finally {
      setButtonLoading(false);
    }
  };

  return (
    <>
      <HelmetTitle title={formData?.id ? 'Edit Salary Component' : 'Add Salary Component'} />

      <div className="mx-auto mt-10 mb-10 w-full items-center md:w-4/5 lg:w-3/5 xl:w-2/5">
        <div className="grid">
          {componentState?.isLoading === true ? <Loader /> : null}

          <div className="grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-2">
            <BilingualInput
              name="name"
              kind="name"
              value={formData.name}
              localValue={(formData as any).name_local || ''}
              label="Pay Head Name"
              placeholder="e.g. Mobile Bill"
              onChange={handleOnChange}
              onLocalChange={(value) => setFormData((prev: any) => ({ ...prev, name_local: value }))}
            />

            <InputElement
              id="short_name"
              name="short_name"
              value={formData.short_name}
              label="Short Name"
              placeholder="Column label on the sheet"
              onChange={handleOnChange}
            />

            <InputElement
              id="code"
              name="code"
              value={formData.code}
              label="Code"
              placeholder="e.g. mobile_bill"
              disabled={isSystemLocked || Boolean(formData.id)}
              description={
                isSystemLocked || formData.id
                  ? 'The code never changes once saved.'
                  : 'Lowercase letters, digits and underscores.'
              }
              onChange={handleOnChange}
            />

            <DropdownCommon
              id="component_type"
              name="component_type"
              label="Type"
              value={formData.component_type}
              data={typeOptions}
              disabled={isSystemLocked}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <DropdownCommon
              id="category"
              name="category"
              label="Category"
              value={formData.category}
              data={categoryOptions}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <DropdownCommon
              id="calculation_type"
              name="calculation_type"
              label="Calculation"
              value={formData.calculation_type}
              data={calculationOptions}
              disabled={isSystemLocked}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            {formData.calculation_type === 'percent' ? (
              <>
                <DropdownCommon
                  id="percent_base"
                  name="percent_base"
                  label="Percent Of"
                  value={formData.percent_base}
                  data={percentBaseOptions}
                  onChange={handleSelectChange}
                  className="bg-transparent"
                />
                <InputElement
                  id="default_percent"
                  name="default_percent"
                  value={formData.default_percent}
                  label="Percentage"
                  placeholder="e.g. 10"
                  inputMode="decimal"
                  onChange={handleOnChange}
                />
              </>
            ) : (
              <InputElement
                id="default_amount"
                name="default_amount"
                value={formData.default_amount}
                label="Default Amount"
                placeholder="Optional"
                inputMode="numeric"
                description="A new employee on this pay head starts with this amount."
                onChange={handleOnChange}
              />
            )}

            <DropdownCommon
              id="rounding"
              name="rounding"
              label="Rounding"
              value={formData.rounding}
              data={roundingOptions}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <DropdownCommon
              id="prorate"
              name="prorate"
              label="Prorate by payable days"
              value={formData.prorate}
              data={yesNo}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <DropdownCommon
              id="include_in_gross"
              name="include_in_gross"
              label="Include in Gross"
              value={formData.include_in_gross}
              data={yesNo}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <DropdownCommon
              id="include_in_deduction_base"
              name="include_in_deduction_base"
              label="In attendance-deduction base"
              value={formData.include_in_deduction_base}
              data={yesNo}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <DropdownCommon
              id="salary_sheet_types"
              name="salary_sheet_types"
              label="Appears On"
              value={formData.salary_sheet_types}
              data={sheetTypeOptions}
              onChange={handleSelectChange}
              className="bg-transparent"
            />

            <InputElement
              id="sort_order"
              name="sort_order"
              value={formData.sort_order}
              label="Order"
              placeholder="10"
              inputMode="numeric"
              onChange={handleOnChange}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-1 gap-y-1">
            {formData?.id ? (
              <ButtonLoading
                onClick={handleUpdate}
                buttonLoading={buttonLoading}
                label={buttonLoading ? 'Updating...' : 'Update'}
                className="mr-0 whitespace-nowrap p-2 text-center"
                icon={<FiSave className="mr-2 text-lg" />}
              />
            ) : (
              <ButtonLoading
                onClick={handleSave}
                buttonLoading={buttonLoading}
                label={buttonLoading ? 'Saving...' : 'Save'}
                className="mr-0 whitespace-nowrap p-2 text-center"
                icon={<FiSave className="mr-2 text-lg" />}
              />
            )}

            <ButtonLoading
              onClick={() => navigate(ROUTES.hrms_salary_component_list)}
              buttonLoading={false}
              label="Back"
              className="whitespace-nowrap text-center mr-0"
              icon={<FiHome className="text-lg mr-2" />}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SalaryComponentForm;
