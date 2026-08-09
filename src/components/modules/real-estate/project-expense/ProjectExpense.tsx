import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiHome, FiPlus, FiSave, FiSearch, FiTrash2 } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputOnly from '../../../utils/fields/InputOnly';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_PROJECT_EXPENSE_ACCOUNTS_DDL_URL,
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

const SELECT_CLASS =
  'w-full form-input px-3 py-1 text-gray-700 outline-none border rounded-xs bg-white ' +
  'dark:bg-boxdark dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 ' +
  'dark:focus:border-blue-400 h-8.5';

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

  const [projects, setProjects] = useState<Option[]>([]);
  const [buildings, setBuildings] = useState<Option[]>([]);
  const [accounts, setAccounts] = useState<Option[]>([]);

  const [form, setForm] = useState(emptyRow());
  const [rows, setRows] = useState<ExpenseRow[]>([]);

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Set once a voucher has been pulled up for editing; cleared on save.
  const [editing, setEditing] = useState<{ mtmId: string; vrNo: string } | null>(null);
  const [note, setNote] = useState('');

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [projectRes, accountRes] = await Promise.all([
        httpService.get(API_PROJECT_EXPENSE_PROJECTS_DDL_URL),
        httpService.get(API_PROJECT_EXPENSE_ACCOUNTS_DDL_URL),
      ]);

      if (cancelled) return;

      setProjects(payloadOf(projectRes) || []);
      setAccounts(payloadOf(accountRes) || []);
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

  const handleAccountChange = (value: string) => {
    const account = accounts.find((a) => Number(a.value) === Number(value));

    setForm((prev) => ({
      ...prev,
      account: value ? Number(value) : '',
      accountName: account?.label || '',
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

    setRows((prev) => [
      ...prev,
      { ...form, key: `${Date.now()}-${prev.length}`, projectId: form.projectId },
    ]);

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

  const handleRemove = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const resetVoucher = () => {
    setRows([]);
    setEditing(null);
    setNote('');
    setForm(emptyRow());
  };

  const payload = () => ({
    note,
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

  const handleSearch = async () => {
    const vrNo = search.trim();

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

      setRows(
        (data?.rows || []).map((row: any, index: number) => ({
          key: `${row.id}-${index}`,
          account: row.account,
          accountName: row.account_name,
          remarks: row.remarks || '',
          amount: String(row.amount),
          projectId: row.project_id ?? '',
          projectName: projects.find((p) => Number(p.value) === Number(row.project_id))?.label || '',
          buildingId: row.building_id ?? '',
          buildingName: '',
        })),
      );

      setNote(data?.note || '');
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

      <h2 className="mb-3 text-center text-lg font-semibold text-black dark:text-white">
        Project Expense {editing ? `— editing ${editing.vrNo}` : ''}
      </h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-2">
        <div className="col-span-1">
          <div className="grid grid-cols-1 gap-y-2">
            <div className="w-full">
              <div className="flex w-full items-end gap-2">
                <div className="min-w-0 flex-1">
                  <label htmlFor="search">Search Voucher</label>
                  <InputOnly
                    id="search"
                    name="search"
                    value={search}
                    placeholder="Voucher number"
                    label=""
                    className="py-1 w-full"
                    onChange={(e: any) => setSearch(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor=" "> </label>
                  <ButtonLoading
                    onClick={handleSearch}
                    buttonLoading={searching}
                    label=" "
                    className="h-8.5 w-12 shrink-0 whitespace-nowrap border-[1px] border-gray-600 text-center hover:border-blue-500 sm:w-20"
                    icon={<FiSearch className="ml-2 text-lg text-white" />}
                  />
                </div>
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
              <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Leave it on "whole project" for land, boundary wall, approvals — costs no
                single building carries.
              </p>
            </div>

            <div>
              <label htmlFor="account">Select Account</label>
              <select
                id="account"
                name="account"
                className={SELECT_CLASS}
                value={form.account}
                onChange={(e) => handleAccountChange(e.target.value)}
              >
                <option value="">Select an expense account</option>
                {accounts.map((account) => (
                  <option key={account.value} value={account.value}>
                    {account.label}
                  </option>
                ))}
              </select>
            </div>

            <InputElement
              id="remarks"
              name="remarks"
              label="Enter Remarks"
              placeholder="Enter Remarks"
              className=""
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
              className=""
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
              className=""
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
              <ButtonLoading
                id="add_new_button"
                name="add_new_button"
                onClick={handleAdd}
                label="Add New"
                className="mr-0 whitespace-nowrap text-center"
                icon={<FiPlus className="ml-2 mr-2 h-5 text-lg text-white" />}
              />
              <ButtonLoading
                disabled={saving}
                onClick={handleSave}
                buttonLoading={saving}
                label={saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                className="mr-0 whitespace-nowrap text-center"
                icon={<FiSave className="ml-2 mr-2 text-lg text-white" />}
              />
              <ButtonLoading
                onClick={() => navigate('/dashboard')}
                label="Home"
                className="mr-0 whitespace-nowrap p-2 text-center"
                icon={<FiHome className="ml-2 mr-2 text-lg text-white" />}
              />
            </div>
          </div>
        </div>

        <div className="col-span-2 overflow-x-auto lg:mt-6">
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
                  className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
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
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() => handleRemove(row.key)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 />
                    </button>
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
