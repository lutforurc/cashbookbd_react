import React, { useEffect, useMemo, useState } from 'react';
import { FiArrowDown, FiArrowUp, FiHome, FiPlus, FiSave, FiX } from 'react-icons/fi';
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
  clearSalaryStructureEditData,
  editSalaryStructure,
  saveSalaryStructure,
  updateSalaryStructure,
  SalaryStructureLine,
} from './salaryStructureSlice';
import { fetchSalaryComponentDdl as fetchComponents } from '../salary-component/salaryComponentSlice';

interface StructureForm {
  id: string | number;
  name: string;
  code: string;
  description: string;
  is_default: string;
  status: string;
}

const initialFormData: StructureForm = {
  id: '',
  name: '',
  code: '',
  description: '',
  is_default: '0',
  status: '1',
};

const yesNo = [
  { id: '1', name: 'Yes' },
  { id: '0', name: 'No' },
];

/** One pay head on the structure, as the builder holds it. */
interface LineDraft {
  component_id: number | string;
  code: string;
  name: string;
  short_name?: string | null;
  component_type?: string;
  master_calculation_type?: string;
  calculation_type?: string | null;
  amount: string;
  percent: string;
  prorate: string;
  sort_order: number;
  is_required: string;
}

const toNumberOrEmpty = (value: any) =>
  value === null || value === undefined || value === '' ? '' : String(value);

const SalaryStructureForm = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { id } = useParams();
  const structureState = useSelector((state: any) => state.salaryStructure);
  const componentState = useSelector((state: any) => state.salaryComponent);

  const [formData, setFormData] = useState<StructureForm>(initialFormData);
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchComponents({}));
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(editSalaryStructure(id));
      return;
    }

    dispatch(clearSalaryStructureEditData());
    setFormData(initialFormData);
    setLines([]);
  }, [dispatch, id]);

  useEffect(() => {
    const loaded = structureState?.editData;

    if (!loaded || (id && String(loaded.id) !== String(id))) return;

    setFormData({
      id: loaded.id ?? '',
      name: loaded.name ?? '',
      code: loaded.code ?? '',
      description: loaded.description ?? '',
      is_default: String(loaded.is_default ?? '0'),
      status: String(loaded.status ?? '1'),
    });

    setLines(
      (loaded.components || []).map((line: SalaryStructureLine, index: number) => ({
        component_id: line.component_id,
        code: line.code ?? '',
        name: line.name ?? '',
        short_name: line.short_name ?? '',
        component_type: line.component_type,
        master_calculation_type: line.master_calculation_type,
        calculation_type: line.calculation_type,
        amount: toNumberOrEmpty(line.amount),
        percent: toNumberOrEmpty(line.percent),
        prorate:
          line.prorate === null || line.prorate === undefined
            ? String(line.master_prorate ?? '0')
            : String(line.prorate),
        sort_order: Number(line.sort_order) || (index + 1) * 10,
        is_required: String(line.is_required ?? '0'),
      })),
    );
  }, [structureState?.editData, id]);

  /** Pay heads that are not already on the structure. */
  const availableComponents = useMemo(() => {
    const chosen = new Set(lines.map((line) => String(line.component_id)));

    return (componentState?.ddl || []).filter(
      (component: any) =>
        Number(component.status) !== 0 && !chosen.has(String(component.id)),
    );
  }, [componentState?.ddl, lines]);

  const renumber = (drafts: LineDraft[]) =>
    drafts.map((line, index) => ({ ...line, sort_order: (index + 1) * 10 }));

  const addLine = (component: any) => {
    setLines((prev) =>
      renumber([
        ...prev,
        {
          component_id: component.id,
          code: component.code,
          name: component.name,
          short_name: component.short_name,
          component_type: component.component_type,
          master_calculation_type: component.calculation_type,
          calculation_type: null,
          amount: toNumberOrEmpty(component.default_amount),
          percent: toNumberOrEmpty(component.default_percent),
          prorate: String(component.prorate ?? '0'),
          sort_order: (prev.length + 1) * 10,
          is_required: '0',
        },
      ]),
    );
  };

  const removeLine = (componentId: number | string) => {
    setLines((prev) => renumber(prev.filter((line) => String(line.component_id) !== String(componentId))));
  };

  const moveLine = (index: number, direction: -1 | 1) => {
    const target = index + direction;

    if (target < 0 || target >= lines.length) return;

    setLines((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return renumber(next);
    });
  };

  const updateLine = (componentId: number | string, patch: Partial<LineDraft>) => {
    setLines((prev) =>
      prev.map((line) =>
        String(line.component_id) === String(componentId) ? { ...line, ...patch } : line,
      ),
    );
  };

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
      toast.error('Please enter the structure name.');
      return false;
    }

    if (!formData.id) {
      if (!formData.code.trim()) {
        toast.error('Please enter a code.');
        return false;
      }

      if (!/^[a-z0-9_]+$/.test(formData.code.trim())) {
        toast.error('The code may hold lowercase letters, digits and underscores only.');
        return false;
      }
    }

    if (lines.length === 0) {
      toast.error('Add at least one pay head to the structure.');
      return false;
    }

    return true;
  };

  const payload = () => ({
    ...formData,
    code: formData.code.trim().toLowerCase(),
    is_default: Number(formData.is_default) ? 1 : 0,
    status: Number(formData.status) ? 1 : 0,
    components: lines.map((line) => ({
      component_id: line.component_id,
      amount: line.amount === '' ? null : line.amount,
      percent: line.percent === '' ? null : line.percent,
      prorate: Number(line.prorate) ? 1 : 0,
      sort_order: line.sort_order,
      is_required: Number(line.is_required) ? 1 : 0,
    })),
  });

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(saveSalaryStructure(payload())).unwrap();
      toast.success(response?.message || 'Salary structure saved successfully');
      setTimeout(() => navigate(ROUTES.hrms_salary_structure_list), 400);
    } catch (err: any) {
      toast.error(err || 'Failed to save salary structure');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleUpdate = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!validate()) return;

    setButtonLoading(true);
    try {
      const response = await dispatch(updateSalaryStructure(payload() as any)).unwrap();
      toast.success(response?.message || 'Salary structure updated successfully');
      setTimeout(() => navigate(ROUTES.hrms_salary_structure_list), 400);
    } catch (err: any) {
      toast.error(err || 'Failed to update salary structure');
    } finally {
      setButtonLoading(false);
    }
  };

  const codeLocked = Boolean(formData.id) && formData.code === 'default';

  return (
    <>
      <HelmetTitle title={formData?.id ? 'Edit Salary Structure' : 'Add Salary Structure'} />

      <div className="mx-auto mt-6 mb-10 w-full md:w-11/12 xl:w-10/12">
        {structureState?.isLoading && <Loader />}

        <div className="grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-4">
          <InputElement
            id="name"
            name="name"
            value={formData.name}
            label="Structure Name"
            placeholder="e.g. Staff Structure"
            onChange={handleOnChange}
          />
          <InputElement
            id="code"
            name="code"
            value={formData.code}
            label="Code"
            placeholder="e.g. staff"
            disabled={codeLocked || Boolean(formData.id)}
            description={
              codeLocked || formData.id ? 'The code never changes once saved.' : 'Lowercase letters, digits, underscores.'
            }
            onChange={handleOnChange}
          />
          <InputElement
            id="description"
            name="description"
            value={formData.description}
            label="Description"
            placeholder="Optional"
            onChange={handleOnChange}
          />
          <div className="grid grid-cols-2 gap-x-2">
            <DropdownCommon
              id="is_default"
              name="is_default"
              label="Default"
              value={formData.is_default}
              data={yesNo}
              onChange={handleSelectChange}
              className="bg-transparent"
            />
            <DropdownCommon
              id="status"
              name="status"
              label="Status"
              value={formData.status}
              data={[
                { id: '1', name: 'Active' },
                { id: '0', name: 'Inactive' },
              ]}
              onChange={handleSelectChange}
              className="bg-transparent"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
          {/* Available pay heads */}
          <div className="lg:col-span-4">
            <div className="mb-1 text-sm font-semibold">Available pay heads</div>
            <div className="max-h-120 overflow-y-auto border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
              {availableComponents.length === 0 ? (
                <p className="p-3 text-sm text-[rgb(var(--c-text-muted))]">
                  Every active pay head is already on this structure.
                </p>
              ) : (
                <ul>
                  {availableComponents.map((component: any) => (
                    <li
                      key={component.id}
                      className="flex items-center justify-between gap-2 border-b border-[rgb(var(--c-border))] px-3 py-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{component.name}</div>
                        <div className="truncate text-xs text-[rgb(var(--c-text-muted))]">
                          {component.code} · {component.component_type}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addLine(component)}
                        title={`Add ${component.name}`}
                        className="shrink-0 rounded-sm p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/20"
                      >
                        <FiPlus />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Selected pay heads */}
          <div className="lg:col-span-8">
            <div className="mb-1 text-sm font-semibold">On this structure</div>
            <div className="overflow-x-auto border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
              {lines.length === 0 ? (
                <p className="p-3 text-sm text-[rgb(var(--c-text-muted))]">
                  Pick pay heads from the left. A structure needs at least one.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[rgb(var(--c-border))] text-left">
                      <th className="px-2 py-2">Pay Head</th>
                      <th className="px-2 py-2 text-right">Amount / %</th>
                      <th className="px-2 py-2 text-center">Prorate</th>
                      <th className="px-2 py-2 text-center">Required</th>
                      <th className="px-2 py-2 text-center">Order</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={String(line.component_id)} className="border-b border-[rgb(var(--c-border))] last:border-b-0">
                        <td className="px-2 py-2">
                          <div className="font-medium">{line.name}</div>
                          <div className="text-xs text-[rgb(var(--c-text-muted))]">
                            {line.code}
                            {line.component_type === 'deduction' ? ' · deduction' : ''}
                          </div>
                        </td>
                        <td className="w-32 px-2 py-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={line.amount}
                            placeholder="0"
                            onChange={(e) =>
                              updateLine(line.component_id, {
                                amount: e.target.value.replace(/[^\d.]/g, ''),
                              })
                            }
                            className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-right"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Number(line.prorate) === 1}
                            onChange={(e) =>
                              updateLine(line.component_id, { prorate: e.target.checked ? '1' : '0' })
                            }
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={Number(line.is_required) === 1}
                            onChange={(e) =>
                              updateLine(line.component_id, { is_required: e.target.checked ? '1' : '0' })
                            }
                          />
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveLine(index, -1)}
                              disabled={index === 0}
                              title="Move up"
                              className="rounded-sm p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
                            >
                              <FiArrowUp />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveLine(index, 1)}
                              disabled={index === lines.length - 1}
                              title="Move down"
                              className="rounded-sm p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-700"
                            >
                              <FiArrowDown />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(line.component_id)}
                            title={`Remove ${line.name}`}
                            className="rounded-sm p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20"
                          >
                            <FiX />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="mt-1 text-xs text-[rgb(var(--c-text-muted))]">
              Amount is what a new employee on this structure starts with. Changing a structure does not
              change anybody&apos;s existing salary.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-1 gap-y-1 md:w-2/5">
          {formData?.id ? (
            <ButtonLoading
              onClick={handleUpdate}
              buttonLoading={buttonLoading}
              label={buttonLoading ? 'Updating...' : 'Update'}
              className="mr-0 whitespace-nowrap p-2 text-center"
              icon={<FiSave className="ml-2 mr-2 text-lg" />}
            />
          ) : (
            <ButtonLoading
              onClick={handleSave}
              buttonLoading={buttonLoading}
              label={buttonLoading ? 'Saving...' : 'Save'}
              className="mr-0 whitespace-nowrap p-2 text-center"
              icon={<FiSave className="ml-2 mr-2 text-lg" />}
            />
          )}

          <ButtonLoading
            onClick={() => navigate(ROUTES.hrms_salary_structure_list)}
            buttonLoading={false}
            label="Back"
            className="whitespace-nowrap text-center mr-0"
            icon={<FiHome className="text-lg ml-2 mr-2" />}
          />
        </div>
      </div>
    </>
  );
};

export default SalaryStructureForm;
