import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiPlus, FiSave } from 'react-icons/fi';

import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { fetchSalaryComponentDdl } from '../salary-component/salaryComponentSlice';
import { fetchSalaryStructureDdl, editSalaryStructure } from '../salary-structure/salaryStructureSlice';
import {
  fetchSalaryRevisions,
  saveSalaryRevision,
} from './salaryRevisionSlice';

/**
 * The employee's own pay, effective dated.
 *
 * ⚠️ THIS PANEL APPENDS A REVISION; IT NEVER EDITS ONE. A saved salary is what
 * a payslip already generated was priced against, so changing it would rewrite
 * last month's pay. A change is a new revision, open from the first of a month.
 *
 * ⚠️ IT ALSO KEEPS THE LEGACY COLUMNS IN STEP (server side). The old engine
 * still pays `hrm_employees.basic_salary` and `others_allowance`, so saving here
 * writes both -- otherwise the sheet and this tab would disagree on the day the
 * new engine is switched on.
 */
interface SalaryTabProps {
  employeeId?: number | string | null;
  /** Called after a save so the parent can mark the form dirty/updated. */
  onSaved?: () => void;
}

interface ComponentDraft {
  component_id: number | string;
  code: string;
  name: string;
  short_name?: string | null;
  component_type?: string;
  amount: string;
  prorate: string;
  sort_order: number;
}

const monthStart = (offsetMonths = 0) => {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonth = (value?: string | null) => {
  if (!value) return '—';

  const [year, month] = String(value).slice(0, 10).split('-');
  if (!year || !month) return String(value);

  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

const SalaryTab: React.FC<SalaryTabProps> = ({ employeeId, onSaved }) => {
  const dispatch = useDispatch<any>();
  const componentState = useSelector((state: any) => state.salaryComponent);
  const structureState = useSelector((state: any) => state.salaryStructure);
  const revisionState = useSelector((state: any) => state.salaryRevision);

  const [structureId, setStructureId] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(monthStart(1));
  const [note, setNote] = useState('');
  const [drafts, setDrafts] = useState<ComponentDraft[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchSalaryComponentDdl({}));
    dispatch(fetchSalaryStructureDdl());
  }, [dispatch]);

  useEffect(() => {
    if (!employeeId) return;

    dispatch(fetchSalaryRevisions(employeeId));
  }, [dispatch, employeeId]);

  const revisions = revisionState?.revisions || [];

  /** The revision currently in force, which the next one builds on. */
  const currentRevision = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return revisions.find(
      (revision: any) =>
        String(revision.effective_from).slice(0, 10) <= today
        && (!revision.effective_to || String(revision.effective_to).slice(0, 10) >= today),
    ) || revisions[0];
  }, [revisions]);

  /** A fresh form always starts from what the employee earns today. */
  useEffect(() => {
    if (drafts.length > 0) return;

    const source = currentRevision?.components || [];

    if (source.length === 0) return;

    setDrafts(
      source.map((line: any, index: number) => ({
        component_id: line.component_id,
        code: line.code ?? '',
        name: line.name ?? '',
        short_name: line.short_name ?? '',
        component_type: line.component_type,
        amount: line.amount == null ? '' : String(line.amount),
        prorate: String(line.prorate ?? '0'),
        sort_order: Number(line.sort_order) || (index + 1) * 10,
      })),
    );

    if (currentRevision?.structure_id) {
      setStructureId(String(currentRevision.structure_id));
    }
  }, [currentRevision, drafts.length]);

  const available = useMemo(() => {
    const chosen = new Set(drafts.map((draft) => String(draft.component_id)));

    return (componentState?.ddl || []).filter(
      (component: any) =>
        Number(component.status) !== 0 && !chosen.has(String(component.id)),
    );
  }, [componentState?.ddl, drafts]);

  const addComponent = (component: any) => {
    setDrafts((prev) => [
      ...prev,
      {
        component_id: component.id,
        code: component.code,
        name: component.name,
        short_name: component.short_name,
        component_type: component.component_type,
        amount: component.default_amount == null ? '' : String(component.default_amount),
        prorate: String(component.prorate ?? '0'),
        sort_order: (prev.length + 1) * 10,
      },
    ]);
  };

  const removeComponent = (componentId: number | string) => {
    setDrafts((prev) =>
      prev
        .filter((draft) => String(draft.component_id) !== String(componentId))
        .map((draft, index) => ({ ...draft, sort_order: (index + 1) * 10 })),
    );
  };

  const updateAmount = (componentId: number | string, amount: string) => {
    setDrafts((prev) =>
      prev.map((draft) =>
        String(draft.component_id) === String(componentId)
          ? { ...draft, amount: amount.replace(/[^\d.]/g, '') }
          : draft,
      ),
    );
  };

  const gross = useMemo(
    () =>
      drafts
        .filter((draft) => draft.component_type !== 'deduction')
        .reduce((total, draft) => total + (Number(draft.amount) || 0), 0),
    [drafts],
  );

  const loadStructure = async (id: string) => {
    setStructureId(id);

    if (!id) return;

    try {
      const loaded = await dispatch(editSalaryStructure(id)).unwrap();
      const lines = loaded?.components || [];

      if (lines.length === 0) return;

      setDrafts(
        lines.map((line: any, index: number) => ({
          component_id: line.component_id,
          code: line.code ?? '',
          name: line.name ?? '',
          short_name: line.short_name ?? '',
          component_type: line.component_type,
          amount: line.amount == null ? '' : String(line.amount),
          prorate: String(line.prorate ?? line.master_prorate ?? '0'),
          sort_order: Number(line.sort_order) || (index + 1) * 10,
        })),
      );
    } catch (err: any) {
      toast.error(err || 'Failed to load the structure');
    }
  };

  const handleSave = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!employeeId) {
      toast.error('Save the employee first, then set the salary.');
      return;
    }

    if (drafts.length === 0) {
      toast.error('Add at least one pay head.');
      return;
    }

    if (!/^\d{4}-\d{2}-01$/.test(effectiveFrom)) {
      toast.error('The effective date must be the first day of a month.');
      return;
    }

    setLoading(true);

    try {
      const response = await dispatch(
        saveSalaryRevision({
          employeeId,
          payload: {
            structure_id: structureId || null,
            effective_from: effectiveFrom,
            note,
            components: drafts.map((draft) => ({
              component_id: draft.component_id,
              amount: draft.amount === '' ? 0 : draft.amount,
              prorate: Number(draft.prorate) ? 1 : 0,
              sort_order: draft.sort_order,
            })),
          },
        }),
      ).unwrap();

      toast.success(response?.message || 'Salary revision saved');
      setNote('');
      setDrafts([]);
      await dispatch(fetchSalaryRevisions(employeeId)).unwrap();
      onSaved?.();
    } catch (err: any) {
      toast.error(err || 'Failed to save the salary revision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="md:col-span-2 lg:col-span-3">
      {!employeeId ? (
        <p className="text-sm text-[rgb(var(--c-text-muted))]">
          Save the employee first. The salary revision is dated against an existing employee.
        </p>
      ) : null}

      <div className="mt-2 grid grid-cols-1 gap-x-2 gap-y-2 md:grid-cols-4">
        <DropdownCommon
          id="salary_structure_id"
          name="salary_structure_id"
          label="Structure"
          value={structureId}
          data={[{ id: '', name: 'Select Structure' }, ...(structureState?.ddl || []).map((s: any) => ({ id: s.id, name: s.name }))]}
          onChange={(event) => void loadStructure(event.target.value)}
          className="bg-transparent"
        />

        <InputElement
          id="salary_effective_from"
          name="salary_effective_from"
          label="Effective From"
          type="month"
          value={effectiveFrom.slice(0, 7)}
          description="Always starts on the 1st of the month."
          onChange={(event) => setEffectiveFrom(`${event.target.value}-01`)}
        />

        <InputElement
          id="salary_revision_note"
          name="salary_revision_note"
          label="Note"
          value={note}
          placeholder="e.g. annual increment"
          onChange={(event) => setNote(event.target.value)}
        />

        <div className="flex flex-col justify-end">
          <span className="text-xs uppercase tracking-wide text-[rgb(var(--c-text-muted))]">
            Monthly Gross
          </span>
          <span className="text-lg font-semibold">{thousandSeparator(gross)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="mb-1 text-sm font-semibold">Available pay heads</div>
          <div className="max-h-80 overflow-y-auto border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
            {available.length === 0 ? (
              <p className="p-3 text-sm text-[rgb(var(--c-text-muted))]">
                Every active pay head is already here.
              </p>
            ) : (
              <ul>
                {available.map((component: any) => (
                  <li
                    key={component.id}
                    className="flex items-center justify-between gap-2 border-b border-[rgb(var(--c-border))] px-3 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{component.name}</div>
                      <div className="truncate text-xs text-[rgb(var(--c-text-muted))]">
                        {component.code}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addComponent(component)}
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

        <div className="lg:col-span-8">
          <div className="mb-1 text-sm font-semibold">This salary</div>
          <div className="overflow-x-auto border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
            {drafts.length === 0 ? (
              <p className="p-3 text-sm text-[rgb(var(--c-text-muted))]">
                Pick a structure, or add pay heads from the left.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[rgb(var(--c-border))] text-left">
                    <th className="px-2 py-2">Pay Head</th>
                    <th className="px-2 py-2 text-right">Monthly Amount</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => (
                    <tr
                      key={String(draft.component_id)}
                      className="border-b border-[rgb(var(--c-border))] last:border-b-0"
                    >
                      <td className="px-2 py-2">
                        <div className="font-medium">{draft.name}</div>
                        <div className="text-xs text-[rgb(var(--c-text-muted))]">
                          {draft.code}
                          {draft.component_type === 'deduction' ? ' · deduction' : ''}
                        </div>
                      </td>
                      <td className="w-36 px-2 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={draft.amount}
                          placeholder="0"
                          onChange={(event) => updateAmount(draft.component_id, event.target.value)}
                          className="w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-right"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeComponent(draft.component_id)}
                          title={`Remove ${draft.name}`}
                          className="rounded-sm px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-2 flex justify-end">
            <ButtonLoading
              type="button"
              onClick={handleSave}
              buttonLoading={loading}
              label={loading ? 'Saving...' : 'Save Revision'}
              icon={<FiSave className="mr-2" />}
              disabled={!employeeId}
            />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-sm font-semibold">Salary history</div>
        <div className="overflow-x-auto border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))]">
          {revisions.length === 0 ? (
            <p className="p-3 text-sm text-[rgb(var(--c-text-muted))]">
              No revision yet. Saving one above starts the history.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--c-border))] text-left">
                  <th className="px-2 py-2">From</th>
                  <th className="px-2 py-2">To</th>
                  <th className="px-2 py-2">Structure</th>
                  <th className="px-2 py-2 text-right">Gross</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision: any) => (
                  <tr
                    key={revision.id}
                    className="border-b border-[rgb(var(--c-border))] last:border-b-0"
                  >
                    <td className="px-2 py-2">{formatMonth(revision.effective_from)}</td>
                    <td className="px-2 py-2">
                      {revision.effective_to ? formatMonth(revision.effective_to) : 'Open'}
                    </td>
                    <td className="px-2 py-2">{revision.structure_name || '—'}</td>
                    <td className="px-2 py-2 text-right">
                      {thousandSeparator(Number(revision.gross_salary) || 0)}
                    </td>
                    <td className="px-2 py-2 capitalize">{revision.status}</td>
                    <td className="px-2 py-2">{revision.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalaryTab;
