import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiHome, FiPlus, FiSave, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputOnly from '../../../utils/fields/InputOnly';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_PROJECT_EXPENSE_BUILDINGS_DDL_URL,
  API_PROJECT_EXPENSE_EDIT_URL,
  API_PROJECT_EXPENSE_PROJECTS_DDL_URL,
  API_PROJECT_EXPENSE_STORE_URL,
  API_PROJECT_EXPENSE_UPDATE_URL,
} from '../../../services/apiRoutes';

interface Option {
  value: number | string;
  label: string;
}

interface ExpenseRow {
  key: string;
  account: number | '';
  accountName: string;
  remarks: string;
  amount: string;
  projectId: number | '';
  projectName: string;
  buildingId: number | '';
  buildingName: string;
}

const emptyRow = (): Omit<ExpenseRow, 'key'> => ({
  account: '',
  accountName: '',
  remarks: '',
  amount: '',
  projectId: '',
  projectName: '',
  buildingId: '',
  buildingName: '',
});

/**
 * The API answers with HTTP 201 and `success: false` when it refuses something,
 * so a refusal never reaches axios as an error. Every call has to look at the
 * body itself.
 */
const payloadOf = (response: any) => response?.data?.data?.data;
const refusedWith = (response: any) =>
  response?.data?.success ? null : response?.data?.message || 'The server refused that.';

/** Cash is an account like any other in this chart; 17 is the one. */
const CASH_COA4_ID = 17;

const SELECT_CLASS =
  'w-full form-input px-3 py-1 text-gray-700 outline-none border rounded-xs bg-white ' +
  'dark:bg-boxdark dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 ' +
  'dark:focus:border-blue-400 h-9.5';

/** The same 38px, for the text boxes that sit between the dropdowns. */
const FIELD_HEIGHT = 'h-9.5';

/**
 * Cash paid out against a project, and against a building within it.
 *
 * The ordinary Cash Payment screen cannot say where the money went, and it may
 * not be changed, so this is a screen of its own writing through its own
 * endpoints. What it saves is an ordinary cash voucher -- same series, same
 * cash book -- carrying the project and building alongside each line.
 *
 * Building is deliberately optional. A cost the whole project carries -- land,
 * the boundary wall, approval fees -- belongs to no single building, and the
 * reports spread those across the buildings rather than pretending they were
 * one building's.
 */
const ProjectExpense = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState<Option[]>([]);
  const [buildings, setBuildings] = useState<Option[]>([]);

  const [form, setForm] = useState(emptyRow());
  const [rows, setRows] = useState<ExpenseRow[]>([]);

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Set once a voucher has been pulled up for editing; cleared on save.
  const [editing, setEditing] = useState<{ mtmId: string; vrNo: string } | null>(null);
  // What the voucher was paid out of. A voucher raised here is always cash,
  // but one opened from the untagged-expense report may have come from a bank,
  // and saving must not quietly turn it into a cash payment.
  const [paidFrom, setPaidFrom] = useState<{ id: number | null; name: string }>({
    id: null,
    name: '',
  });
  // Which line of the table is currently open in the form, if any. Distinct
  // from `editing` above, which is about the whole voucher.
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const projectRes = await httpService.get(API_PROJECT_EXPENSE_PROJECTS_DDL_URL);

      if (cancelled) return;

      setProjects(payloadOf(projectRes) || []);
    };

    load().catch(() => {
      // The interceptor has already said what went wrong.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Buildings are asked for by project rather than listed whole, so the two
  // dropdowns cannot end up pointing at different projects.
  const loadBuildings = useCallback(async (projectId: number | '') => {
    if (!projectId) {
      setBuildings([]);
      return;
    }

    try {
      const response = await httpService.get(API_PROJECT_EXPENSE_BUILDINGS_DDL_URL, {
        params: { project_id: projectId },
      });
      setBuildings(payloadOf(response) || []);
    } catch {
      setBuildings([]);
    }
  }, []);

  useEffect(() => {
    loadBuildings(form.projectId);
  }, [form.projectId, loadBuildings]);

  /**
   * Opened from the untagged-expense report with a voucher to fix.
   *
   * Waits for the project list, because the rows are labelled from it and a
   * voucher loaded before it arrives shows blank project names. Guarded by a
   * ref so re-renders do not fetch the voucher again and throw away whatever
   * has been typed since.
   */
  const autoLoadedRef = useRef(false);

  useEffect(() => {
    const requested = searchParams.get('vr_no');

    if (!requested || autoLoadedRef.current || projects.length === 0) {
      return;
    }

    autoLoadedRef.current = true;
    setSearch(requested);
    handleSearch(requested);
  }, [searchParams, projects.length]);

  /**
   * Building id -> name, for the projects named. Asked once per project rather
   * than once per line, since a voucher's lines nearly always share one.
   */
  const buildingNamesFor = async (projectIds: number[]) => {
    const names: Record<number, string> = {};

    for (const projectId of Array.from(new Set(projectIds.filter(Boolean)))) {
      try {
        const response = await httpService.get(API_PROJECT_EXPENSE_BUILDINGS_DDL_URL, {
          params: { project_id: projectId },
        });

        for (const option of payloadOf(response) || []) {
          names[Number(option.value)] = option.label;
        }
      } catch {
        // A name that cannot be fetched is left blank rather than blocking the
        // voucher from opening; the id is still what gets saved.
      }
    }

    return names;
  };

  const handleProjectChange = (value: string) => {
    const id = value ? Number(value) : '';
    const project = projects.find((p) => Number(p.value) === Number(value));

    setForm((prev) => ({
      ...prev,
      projectId: id,
      projectName: project?.label || '',
      // The building belonged to the project that just went; keeping it would
      // leave the two out of step.
      buildingId: '',
      buildingName: '',
    }));
  };

  const handleBuildingChange = (value: string) => {
    const building = buildings.find((b) => Number(b.value) === Number(value));

    setForm((prev) => ({
      ...prev,
      buildingId: value ? Number(value) : '',
      buildingName: building?.label || '',
    }));
  };

  const handleAccountSelect = (selected: { value: string | number; label: string } | null) => {
    setForm((prev) => ({
      ...prev,
      account: selected ? Number(selected.value) : '',
      accountName: selected?.label || '',
    }));
  };

  const handleAdd = () => {
    if (!form.projectId) {
      toast.error('Choose the project this money belongs to.');
      return;
    }

    if (!form.account) {
      toast.error('Choose an account.');
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }

    if (editingRowKey) {
      // Put it back where it was rather than on the end. A voucher is read in
      // the order it was entered, and a corrected line jumping to the bottom
      // makes the reader hunt for what changed.
      setRows((prev) =>
        prev.map((row) => (row.key === editingRowKey ? { ...form, key: row.key } : row)),
      );
      setEditingRowKey(null);
    } else {
      setRows((prev) => [
        ...prev,
        { ...form, key: `${Date.now()}-${prev.length}`, projectId: form.projectId },
      ]);
    }

    // Project and building stay put. Most lines of one voucher belong to the
    // same place, and re-picking them for every line is the surest way to have
    // somebody stop bothering.
    setForm((prev) => ({
      ...prev,
      account: '',
      accountName: '',
      remarks: '',
      amount: '',
    }));

    document.getElementById('account')?.focus();
  };

  /**
   * Take a line back into the form to be corrected.
   *
   * The row stays in the table while it is being edited, greyed, so the voucher
   * on screen still shows every line and its total. Removing it and adding it
   * back would lose its place and make the total jump about mid-correction.
   */
  const handleEditRow = (key: string) => {
    const row = rows.find((r) => r.key === key);

    if (!row) {
      return;
    }

    const { key: _ignored, ...values } = row;

    setForm(values);
    setEditingRowKey(key);
    document.getElementById('account')?.focus();
  };

  const handleCancelRowEdit = () => {
    setEditingRowKey(null);
    setForm((prev) => ({
      ...prev,
      account: '',
      accountName: '',
      remarks: '',
      amount: '',
    }));
  };

  const handleRemove = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));

    if (editingRowKey === key) {
      handleCancelRowEdit();
    }
  };

  const resetVoucher = () => {
    setRows([]);
    setEditing(null);
    setEditingRowKey(null);
    setNote('');
    setPaidFrom({ id: null, name: '' });
    setForm(emptyRow());
  };

  const payload = () => ({
    note,
    // Sent back exactly as it came, so a bank payment stays a bank payment.
    paid_from: paidFrom.id,
    rows: rows.map((row) => ({
      account: row.account,
      remarks: row.remarks,
      amount: row.amount,
      project_id: row.projectId,
      building_id: row.buildingId || null,
    })),
  });

  const handleSave = async () => {
    if (rows.length === 0) {
      toast.error('Add at least one line before saving.');
      return;
    }

    // What is in the form has not been written back to its row yet. Saving now
    // would quietly discard the correction being made.
    if (editingRowKey) {
      toast.error('Finish the line you are editing first — Save Line, or Cancel.');
      return;
    }

    setSaving(true);

    try {
      const response = editing
        ? await httpService.post(API_PROJECT_EXPENSE_UPDATE_URL, {
            ...payload(),
            mtm_id: editing.mtmId,
          })
        : await httpService.post(API_PROJECT_EXPENSE_STORE_URL, payload());

      const refusal = refusedWith(response);

      if (refusal) {
        toast.error(refusal);
        return;
      }

      toast.success(response?.data?.message || 'Saved');
      resetVoucher();
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || error?.message || 'Could not save');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (voucherNumber?: string) => {
    const vrNo = (voucherNumber ?? search).trim();

    if (!vrNo) {
      toast.error('Enter a voucher number to look up.');
      return;
    }

    setSearching(true);

    try {
      const response = await httpService.post(API_PROJECT_EXPENSE_EDIT_URL, { vr_no: vrNo });
      const refusal = refusedWith(response);

      if (refusal) {
        toast.error(refusal);
        return;
      }

      const data = payloadOf(response);
      const loaded = data?.rows || [];

      // The voucher comes back with building ids, not names. Without looking
      // them up every tagged line would read "Whole project" in the table --
      // which is a different thing entirely, and the wrong thing to hand
      // somebody who is about to correct the line.
      const names = await buildingNamesFor(
        loaded
          .filter((row: any) => row.building_id)
          .map((row: any) => Number(row.project_id)),
      );

      setRows(
        loaded.map((row: any, index: number) => ({
          key: `${row.id}-${index}`,
          account: row.account,
          accountName: row.account_name,
          remarks: row.remarks || '',
          amount: String(row.amount),
          projectId: row.project_id ?? '',
          projectName: projects.find((p) => Number(p.value) === Number(row.project_id))?.label || '',
          buildingId: row.building_id ?? '',
          buildingName: row.building_id ? names[Number(row.building_id)] || '' : '',
        })),
      );

      setEditingRowKey(null);
      setNote(data?.note || '');
      setPaidFrom({ id: data?.paid_from ?? null, name: data?.paid_from_name || '' });
      setEditing({ mtmId: data?.mtm_id, vrNo: data?.vr_no });
      toast.info(`Voucher ${data?.vr_no} loaded`);
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || 'Could not find that voucher');
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Project Expense" />



      {/* Worth saying out loud, because the form has no field for it and the
          voucher would otherwise look like a cash payment on screen. */}
      {editing && paidFrom.id && paidFrom.id !== CASH_COA4_ID ? (
        <p className="mb-3 text-center text-sm text-amber-600 dark:text-amber-400">
          Paid from {paidFrom.name} — not cash. Saving keeps it that way.
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-1">
            <div className="w-full">
              <div className="flex w-full items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="search">Search Voucher</label>
                  <InputOnly
                    id="search"
                    name="search"
                    value={search}
                    placeholder="Voucher number"
                    label=""
                    className={`w-full py-1 ${FIELD_HEIGHT}`}
                    onChange={(e: any) => setSearch(e.target.value)}
                  />
                </div>
                {/* No gap, and -ml-px so the two borders sit on one line --
                    the box and the button it belongs to read as one control. */}
                <ButtonLoading
                  onClick={() => handleSearch()}
                  buttonLoading={searching}
                  label=" "
                  className={`-ml-px w-12 shrink-0 whitespace-nowrap border-[1px] border-gray-600 text-center hover:border-blue-500 sm:w-20 ${FIELD_HEIGHT}`}
                  icon={<FiSearch className="ml-2 text-lg text-white" />}
                />
              </div>
            </div>

            <div>
              <label htmlFor="project_id">Select Project</label>
              <select
                id="project_id"
                name="project_id"
                className={SELECT_CLASS}
                value={form.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="building_id">Select Building</label>
              <select
                id="building_id"
                name="building_id"
                className={SELECT_CLASS}
                value={form.buildingId}
                disabled={!form.projectId}
                onChange={(e) => handleBuildingChange(e.target.value)}
              >
                <option value="">Whole project (no single building)</option>
                {buildings.map((building) => (
                  <option key={building.value} value={building.value}>
                    {building.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="account">Select Account</label>
              {/* The same account search Cash Payment uses -- the whole chart,
                  three characters in. Which of those accounts a project expense
                  may actually be booked to is settled on save, by the API, and
                  not by narrowing what this box will show. */}
              <DdlMultiline
                id="account"
                name="account"
                className={FIELD_HEIGHT}
                placeholder="Select an account"
                acType=""
                value={
                  form.account
                    ? { value: String(form.account), label: form.accountName }
                    : null
                }
                onSelect={handleAccountSelect}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    document.getElementById('remarks')?.focus();
                  }
                }}
              />
            </div>

            <InputElement
              id="remarks"
              name="remarks"
              label="Enter Remarks"
              placeholder="Enter Remarks"
              className={FIELD_HEIGHT}
              autoComplete="off"
              value={form.remarks}
              onChange={(e) => setForm((prev) => ({ ...prev, remarks: e.target.value }))}
            />

            <InputElement
              id="amount"
              name="amount"
              type="number"
              label="Amount (Tk.)"
              placeholder="Enter Amount"
              className={FIELD_HEIGHT}
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />

            <InputElement
              id="note"
              name="note"
              label="Voucher Note"
              placeholder="Optional note for the whole voucher"
              className={FIELD_HEIGHT}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              {/* One button, two jobs — it has to say which it is about to do,
                  or a correction silently becomes a duplicate line. */}
              <ButtonLoading
                id="add_new_button"
                name="add_new_button"
                onClick={handleAdd}
                label={editingRowKey ? 'Save Line' : 'Add New'}
                className="mr-0 whitespace-nowrap text-center"
                icon={
                  editingRowKey ? (
                    <FiEdit2 className="ml-2 mr-2 h-6 text-lg text-white" />
                  ) : (
                    <FiPlus className="ml-2 mr-2 h-6 text-lg text-white" />
                  )
                }
              />
              {editingRowKey ? (
                <ButtonLoading
                  onClick={handleCancelRowEdit}
                  label="Cancel"
                  className="mr-0 whitespace-nowrap text-center"
                  icon={<FiX className="ml-2 mr-2 h-6 text-lg text-white" />}
                />
              ) : (
                <ButtonLoading
                  disabled={saving}
                  onClick={handleSave}
                  buttonLoading={saving}
                  label={saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                  className="mr-0 whitespace-nowrap text-center"
                  icon={<FiSave className="ml-2 mr-2 h-6 text-lg text-white" />}
                />
              )}
              <ButtonLoading
                onClick={() => navigate('/dashboard')}
                label="Home"
                className="mr-0 whitespace-nowrap p-2 text-center"
                icon={<FiHome className="ml-2 mr-2 text-lg text-white h-6" />}
              />
            </div>
          </div>
        </div>

        {/* The two columns only exist from lg up. Spanning two of them below
            that makes the grid invent a second column, and the table comes out
            wider than the form it belongs to. */}
        <div className="overflow-x-auto lg:col-span-2 lg:mt-6">
          <table className="min-w-[680px] w-full text-left text-sm text-gray-500 rtl:text-right dark:text-gray-400">
            <thead className="bg-gray-300 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              <tr>
                <th scope="col" className="px-2 py-2">Description</th>
                <th scope="col" className="px-2 py-2">Remarks</th>
                <th scope="col" className="px-2 py-2">Project / Building</th>
                <th scope="col" className="px-2 py-2 text-right">Amount</th>
                <th scope="col" className="w-16 px-2 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  // The line being corrected stays in place and is marked, so
                  // the voucher on screen is still the whole voucher.
                  className={
                    'border-b dark:border-gray-700 ' +
                    (editingRowKey === row.key
                      ? 'bg-blue-50 dark:bg-blue-950'
                      : 'bg-white dark:bg-gray-800')
                  }
                >
                  <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                    {row.accountName}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                    {row.remarks}
                  </td>
                  <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                    {row.projectName || '—'}
                    <span className="block text-xs text-gray-500 dark:text-gray-400">
                      {row.buildingName || 'Whole project'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                    {thousandSeparator(Number(row.amount))}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        aria-label="Edit line"
                        title="Edit this line"
                        onClick={() => handleEditRow(row.key)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        aria-label="Remove line"
                        title="Remove this line"
                        onClick={() => handleRemove(row.key)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-200 font-semibold text-gray-900 dark:bg-gray-700 dark:text-white">
                <td className="px-2 py-2" colSpan={3}>
                  Payment Total
                </td>
                <td className="px-2 py-2 text-right">{thousandSeparator(total)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
};

export default ProjectExpense;
