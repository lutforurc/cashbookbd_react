import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import HelmetTitle from '../../utils/others/HelmetTitle';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import Loader from '../../../common/Loader';

import { useDispatch, useSelector } from 'react-redux';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';

import httpService from '../../services/httpService';
import { API_BUDGET_URL } from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * What was meant to be spent, against what was.
 *
 * ⚠️ THE ACTUALS ARE NEVER STORED — they come from the ledger every time this is
 * opened, so an edited voucher moves the report at once. A stored actual is a
 * figure that was true once, and the first thing anybody does when a budget
 * report looks wrong is edit a voucher.
 *
 * ⚠️ "SHOULD HAVE SPENT BY NOW" IS AN ASSUMPTION, and it is labelled as one. It
 * is the year's budget divided by the months elapsed: right for rent, wrong for
 * an insurance premium paid in July. Shown in its own column rather than folded
 * into the variance, so a reader can disregard it where it does not apply.
 *
 * ⚠️ THE BUDGET IS TYPED IN THE ROW. Anything else means a form, a list, and
 * somebody keeping two screens open to compare a number with the number beside
 * it.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): the year ends on a calendar day.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '';
};

const thisYearEnd = () => {
  const now = new Date();
  const june = new Date(now.getFullYear(), 5, 30);

  return asText(now <= june ? june : new Date(now.getFullYear() + 1, 5, 30));
};

const BudgetScreen = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const branchDdlData = useSelector((state: any) => state.branchDdl);

  const [branchId, setBranchId] = useState<number | null>(user?.branch_id ?? null);
  const [yearEnd, setYearEnd] = useState(thisYearEnd());
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const branches: any[] = branchDdlData?.protectedData?.data ?? [];

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_BUDGET_URL, {
        params: {
          year_end: yearEnd,
          branch_id: branchId || undefined,
          project_id: projectId || undefined,
        },
      });

      setData(res?.data?.data?.data ?? res?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the budget');
    } finally {
      setLoading(false);
    }
  }, [yearEnd, branchId, projectId]);

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (row: any, amount: string) => {
    try {
      const res = await httpService.post(`${API_BUDGET_URL}/store`, {
        year_end: yearEnd,
        coa4_id: row.coa4_id,
        amount: amount === '' ? null : amount,
        project_id: projectId || null,
        branch_id: branchId || null,
      });

      toast.success(res?.data?.message || 'Saved');
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it', { autoClose: 8000 });
    }
  };

  const rows: any[] = data?.rows ?? [];
  const totals = data?.totals ?? {};

  if (loading && !data) return <Loader />;

  return (
    <div>
      <HelmetTitle title="Budget" />

      <h2 className="mb-3 text-center text-xl font-semibold text-black dark:text-white">
        Budget Against Actual
      </h2>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        {branches.length > 1 ? (
          <div className="w-56">
            <label className="text-sm text-black dark:text-white">Branch</label>
            <BranchDropdown
              value={branchId ? String(branchId) : ''}
              defaultValue={branchId ? String(branchId) : ''}
              onChange={(e: any) =>
                setBranchId(e.target.value === '' ? null : Number(e.target.value))
              }
              className="w-full text-sm"
              branchDdl={branches}
            />
          </div>
        ) : null}

        <div className="w-44">
          <InputDatePicker
            id="budget_year_end"
            name="year_end"
            label="Year ending"
            selectedDate={asDate(yearEnd)}
            setSelectedDate={(date: Date | null) => setYearEnd(asText(date))}
            setCurrentDate={() => undefined}
            className="w-full"
          />
        </div>

        {/* Only where this company keeps projects, and only useful where the
            vouchers were tagged with one — the server says as much. */}
        {(data?.projects ?? []).length ? (
          <div className="w-56">
            <DropdownCommon
              id="budget_project"
              name="project_id"
              label="Project"
              data={[
                { id: '', name: 'The branch as a whole' },
                ...(data.projects ?? []).map((one: any) => ({ id: one.id, name: one.name })),
              ]}
              value={projectId}
              onChange={(e: any) => setProjectId(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {data ? (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          The year {onTheDay(data.year_start)} to {onTheDay(data.year_end)} · actuals up to{' '}
          {onTheDay(data.actuals_up_to)} · {data.months_elapsed} month(s) in
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="px-3 py-2 text-sm font-medium text-black dark:text-white">Head</th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Budget for the year
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Should have spent
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Actually spent
              </th>
              <th className="px-3 py-2 text-right text-sm font-medium text-black dark:text-white">
                Left for the year
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row: any) => (
                <tr key={row.coa4_id} className="border-b border-stroke dark:border-strokedark">
                  <td className="px-3 py-2">
                    <div className="text-black dark:text-white">{row.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.group_name}</div>
                  </td>

                  {/* Typed in the row: the number and the number it is compared
                      with belong side by side. */}
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      defaultValue={row.budget ? String(row.budget) : ''}
                      placeholder="none"
                      onBlur={(e) => {
                        const next = e.target.value;
                        const was = row.budget ? String(row.budget) : '';

                        if (next !== was) save(row, next);
                      }}
                      className="w-32 rounded border border-stroke bg-transparent px-2 py-1 text-right text-sm text-black dark:border-strokedark dark:text-white"
                    />
                  </td>

                  <td className="px-3 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
                    {Number(row.budget) ? money(row.expected) : ''}
                  </td>

                  <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                    {money(row.actual)}
                  </td>

                  <td
                    className={`px-3 py-2 text-right text-sm font-medium ${
                      // Overspent is the only thing here anybody has to act on.
                      Number(row.budget) && Number(row.left) < 0
                        ? 'text-danger dark:text-red-400'
                        : 'text-black dark:text-white'
                    }`}
                  >
                    {Number(row.budget) ? money(row.left) : '—'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-sm text-gray-500">
                  No budget set and nothing spent in that year yet.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length ? (
            <tfoot>
              <tr className="border-t-2 border-stroke font-semibold dark:border-strokedark">
                <td className="px-3 py-2 text-sm text-black dark:text-white">Total</td>
                <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                  {money(totals.budget ?? 0)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                  {money(totals.expected ?? 0)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                  {money(totals.actual ?? 0)}
                </td>
                <td className="px-3 py-2 text-right text-sm text-black dark:text-white">
                  {money(totals.left ?? 0)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {data?.note ? (
        <p className="mt-3 text-xs leading-snug text-gray-500 dark:text-gray-400">{data.note}</p>
      ) : null}
    </div>
  );
};

export default BudgetScreen;
