import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiHome, FiPlus, FiRefreshCw, FiSave, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputOnly from '../../../utils/fields/InputOnly';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import LabourDropdown from '../../../utils/utils-functions/LabourDropdown';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_PROJECT_EXPENSE_BUILDINGS_DDL_URL,
  API_PROJECT_EXPENSE_PROJECTS_DDL_URL,
  API_PROJECT_LABOUR_EDIT_URL,
  API_PROJECT_LABOUR_STORE_URL,
  API_PROJECT_LABOUR_UPDATE_URL,
} from '../../../services/apiRoutes';

interface Option {
  value: number | string;
  label: string;
}

interface LabourRow {
  key: string;
  product: number | '';
  productName: string;
  unit: string;
  qty: string;
  price: string;
  projectId: number | '';
  projectName: string;
  buildingId: number | '';
  buildingName: string;
}

/** Cash is an account like any other in this chart; 17 is the one. */
const CASH_COA4_ID = 17;

const payloadOf = (response: any) => response?.data?.data?.data;
const refusedWith = (response: any) =>
  response?.data?.success ? null : response?.data?.message || 'The server refused that.';

const SELECT_CLASS =
  'w-full form-input px-3 py-1 text-gray-700 outline-none border rounded-xs bg-white ' +
  'dark:bg-boxdark dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500 ' +
  'dark:focus:border-blue-400 h-9.5';

/**
 * Labour worked for a project, and for the buildings within it.
 *
 * The Project Purchase screen with material swapped for labour, and laid out
 * the same on purpose: a clerk who books both should not have to learn two
 * forms. What is said there holds here.
 *
 * Building is chosen PER LINE, not once for the invoice, because a gang's bill
 * covers more than one. The header choice is a default each new line inherits,
 * so a bill for a single building still takes one pick. The ledger then carries
 * one Labour Expense debit per building, which is what lets a building be asked
 * what it has cost.
 */
const ProjectLabour = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Option[]>([]);
  const [buildings, setBuildings] = useState<Option[]>([]);

  // The invoice itself.
  const [supplier, setSupplier] = useState<{ id: number | ''; name: string }>({ id: '', name: '' });
  const [invoiceNo, setInvoiceNo] = useState('');
  // The date twice over: as the calendar's own Date, and as the yyyy-mm-dd the
  // server is sent. Keeping both saves parsing the one back out of the other on
  // every keystroke, and the two are only ever set together.
  const [invoiceDate, setInvoiceDate] = useState('');
  const [invoiceDateOn, setInvoiceDateOn] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paid, setPaid] = useState('0');

  // The line being typed, and the lines already added.
  const [draft, setDraft] = useState<Omit<LabourRow, 'key'>>({
    product: '',
    productName: '',
    unit: '',
    qty: '',
    price: '',
    projectId: '',
    projectName: '',
    buildingId: '',
    buildingName: '',
  });
  const [rows, setRows] = useState<LabourRow[]>([]);

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ mtmId: string; vrNo: string } | null>(null);
  // Which labour line is open in the form, if any. Distinct from `editing`
  // above, which is about the whole invoice.
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.qty || 0) * Number(row.price || 0), 0),
    [rows],
  );

  const isCashSupplier = Number(supplier.id) === CASH_COA4_ID;
  const due = Math.max(0, Number((total - Number(discount || 0)).toFixed(2)));

  // A cash supplier is paid in full by definition, so the box says so and stops
  // taking input rather than letting the two disagree.
  useEffect(() => {
    if (isCashSupplier) {
      setPaid(due.toString());
    }
  }, [isCashSupplier, due]);

  useEffect(() => {
    httpService
      .get(API_PROJECT_EXPENSE_PROJECTS_DDL_URL)
      .then((response) => setProjects(payloadOf(response) || []))
      .catch(() => {
        /* the interceptor has already said what went wrong */
      });
  }, []);

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
    loadBuildings(draft.projectId);
  }, [draft.projectId, loadBuildings]);

  /**
   * Building id -> name, for the projects named. Asked once per project rather
   * than once per line, since an invoice's lines nearly always share one.
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
        // invoice from opening; the id is still what gets saved.
      }
    }

    return names;
  };

  /**
   * Formatted by hand rather than through toISOString(), which converts to UTC
   * first -- east of Greenwich that hands back the day before for any date
   * picked before six in the morning.
   */
  const handleInvoiceDate = (date: Date | null) => {
    if (!date || Number.isNaN(date.getTime())) {
      setInvoiceDate('');
      return;
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    setInvoiceDate(`${date.getFullYear()}-${month}-${day}`);
  };

  const handleProjectChange = (value: string) => {
    const project = projects.find((p) => Number(p.value) === Number(value));

    setDraft((prev) => ({
      ...prev,
      projectId: value ? Number(value) : '',
      projectName: project?.label || '',
      // The building belonged to the project that just went.
      buildingId: '',
      buildingName: '',
    }));
  };

  const handleBuildingChange = (value: string) => {
    const building = buildings.find((b) => Number(b.value) === Number(value));

    setDraft((prev) => ({
      ...prev,
      buildingId: value ? Number(value) : '',
      buildingName: building?.label || '',
    }));
  };

  const handleAdd = () => {
    if (!draft.projectId) {
      toast.error('Choose the project this work is for.');
      return;
    }

    if (!draft.product) {
      toast.error('Choose a labour item.');
      return;
    }

    if (!draft.qty || Number(draft.qty) <= 0) {
      toast.error('Enter a quantity greater than zero.');
      return;
    }

    if (editingRowKey) {
      // Back into its own place in the invoice, not onto the end. The lines are
      // read in the order the work was listed on the bill.
      setRows((prev) =>
        prev.map((row) => (row.key === editingRowKey ? { ...draft, key: row.key } : row)),
      );
      setEditingRowKey(null);
    } else {
      setRows((prev) => [...prev, { ...draft, key: `${Date.now()}-${prev.length}` }]);
    }

    // Project and building stay; the labour line does not. Most of an invoice
    // goes to one place, and re-picking it every line is how a form teaches
    // people to stop bothering.
    setDraft((prev) => ({
      ...prev,
      product: '',
      productName: '',
      unit: '',
      qty: '',
      price: '',
    }));
  };

  /** Take a labour line back into the form to be corrected. */
  const handleEditRow = (key: string) => {
    const row = rows.find((r) => r.key === key);

    if (!row) {
      return;
    }

    const { key: _ignored, ...values } = row;

    setDraft(values);
    setEditingRowKey(key);
  };

  const handleCancelRowEdit = () => {
    setEditingRowKey(null);
    setDraft((prev) => ({
      ...prev,
      product: '',
      productName: '',
      unit: '',
      qty: '',
      price: '',
    }));
  };

  const handleRemove = (key: string) => {
    setRows((prev) => prev.filter((row) => row.key !== key));

    if (editingRowKey === key) {
      handleCancelRowEdit();
    }
  };

  const resetAll = () => {
    setSupplier({ id: '', name: '' });
    setInvoiceNo('');
    setInvoiceDate('');
    setInvoiceDateOn(null);
    setNotes('');
    setDiscount('0');
    setPaid('0');
    setRows([]);
    setEditing(null);
    setEditingRowKey(null);
    setDraft({
      product: '',
      productName: '',
      unit: '',
      qty: '',
      price: '',
      projectId: '',
      projectName: '',
      buildingId: '',
      buildingName: '',
    });
  };

  const payload = () => ({
    supplier: supplier.id,
    invoice_no: invoiceNo || null,
    invoice_date: invoiceDate || null,
    notes: notes || null,
    discount: Number(discount || 0),
    paid: Number(paid || 0),
    products: rows.map((row) => ({
      product: row.product,
      qty: row.qty,
      price: row.price,
      project_id: row.projectId,
      building_id: row.buildingId || null,
    })),
  });

  const handleSave = async () => {
    if (!supplier.id) {
      toast.error('Choose a supplier.');
      return;
    }

    if (rows.length === 0) {
      toast.error('Add at least one labour item before saving.');
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
        ? await httpService.post(API_PROJECT_LABOUR_UPDATE_URL, {
            ...payload(),
            mtm_id: editing.mtmId,
          })
        : await httpService.post(API_PROJECT_LABOUR_STORE_URL, payload());

      const refusal = refusedWith(response);

      if (refusal) {
        toast.error(refusal);
        return;
      }

      toast.success(response?.data?.message || 'Saved');
      resetAll();
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
      const response = await httpService.post(API_PROJECT_LABOUR_EDIT_URL, { vr_no: vrNo });
      const refusal = refusedWith(response);

      if (refusal) {
        toast.error(refusal);
        return;
      }

      const data = payloadOf(response);

      setSupplier({ id: Number(data.supplier), name: data.supplier_name || '' });
      setInvoiceNo(data.invoice_no || '');
      setInvoiceDate(data.invoice_date || '');
      setInvoiceDateOn(data.invoice_date ? new Date(data.invoice_date) : null);
      setNotes(data.notes || '');
      setDiscount(String(data.discount ?? 0));
      setPaid(String(data.paid ?? 0));

      const loaded = data.products || [];

      // The invoice comes back with building ids, not names. Without looking
      // them up every tagged line would read "Whole project" in the table --
      // a different thing entirely, and the wrong thing to show somebody who
      // is about to correct the line.
      const names = await buildingNamesFor(
        loaded.filter((row: any) => row.building_id).map((row: any) => Number(row.project_id)),
      );

      setRows(
        loaded.map((row: any, index: number) => ({
          key: `${row.product}-${index}`,
          product: row.product,
          productName: row.product_name,
          // The unit is the dropdown's to tell, and nothing was picked from it
          // here; the quantity reads plainly until the line is opened again.
          unit: '',
          qty: String(row.qty),
          price: String(row.price),
          projectId: row.project_id ?? '',
          projectName:
            projects.find((p) => Number(p.value) === Number(row.project_id))?.label || '',
          buildingId: row.building_id ?? '',
          buildingName: row.building_id ? names[Number(row.building_id)] || '' : '',
        })),
      );

      setEditingRowKey(null);
      setEditing({ mtmId: data.mtm_id, vrNo: data.vr_no });
      toast.info(`Voucher ${data.vr_no} loaded`);
    } catch (error: any) {
      if (!error?.toastReported) {
        toast.error(error?.response?.data?.message || 'Could not find that invoice');
      }
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <HelmetTitle title="Project Labour" />

      {/* content-start on both columns: the two sides hold a different number
          of rows, and the shorter one is stretched to the taller one's height.
          Left to spread, its rows share out that spare height and open gaps
          between the fields. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---------------------------------------------------- the invoice */}
        <div className="grid grid-cols-1 content-start gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="supplier">Select Supplier</label>
            <DdlMultiline
              id="supplier"
              name="supplier"
              acType="3"
              className="h-9.5"
              value={supplier.id ? { value: supplier.id, label: supplier.name } : null}
              onSelect={(option: any) =>
                setSupplier({ id: Number(option?.value) || '', name: option?.label || '' })
              }
            />
          </div>

          <InputElement
            id="invoice_no"
            name="invoice_no"
            label="Bill Number"
            placeholder="Bill Number"
            className="h-9.5"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
          />

          <div className="text-left flex flex-col">
            <label htmlFor="invoice_date" className="text-black dark:text-white">
              Bill Date
            </label>
            <InputDatePicker
              id="invoice_date"
              name="invoice_date"
              className="w-full px-3 py-1 h-9.5"
              selectedDate={invoiceDateOn}
              setSelectedDate={setInvoiceDateOn}
              setCurrentDate={handleInvoiceDate}
            />
          </div>

          <InputElement
            id="notes"
            name="notes"
            label="Notes"
            placeholder="Notes"
            className="h-9.5"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <InputElement
            id="discount"
            name="discount"
            type="number"
            label="Discount Amount"
            placeholder="0"
            className="h-9.5"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />

          <InputElement
            id="paid"
            name="paid"
            type="number"
            label="Payment Amount"
            placeholder="0"
            className="h-9.5"
            disabled={isCashSupplier}
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            description={isCashSupplier ? 'A cash bill is paid in full.' : undefined}
          />

          <div className="flex flex-col justify-end">
            <span className="text-black dark:text-white">Total Tk.</span>
            <span className="py-1 text-lg font-semibold text-black dark:text-white">
              {thousandSeparator(total)}
            </span>
          </div>

          {/* Its own column beside the total rather than a line beneath it, so
              the two figures read side by side and the row keeps the height of
              the fields next to it. */}
          <div className="flex flex-col justify-end">
            <span className="text-black dark:text-white">Due Tk.</span>
            <span className="py-1 text-lg font-semibold text-black dark:text-white">
              {thousandSeparator(due)}
            </span>
          </div>

          {/* Looking an old bill up belongs with the bill, not with the line
              being typed opposite.

              The label is carried for screen readers only. On show it would
              add its own line, and this row sits across from the buttons,
              which have none -- the two columns would stop level no longer.
              The placeholder and the magnifier say the same thing to the eye. */}
          <div className="sm:col-span-2">
            <label htmlFor="search" className="sr-only">
              Search Invoice
            </label>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <InputOnly
                  id="search"
                  name="search"
                  value={search}
                  placeholder="Voucher number"
                  label=""
                  className="h-9.5 w-full py-1"
                  onChange={(e: any) => setSearch(e.target.value)}
                />
              </div>
              <ButtonLoading
                onClick={handleSearch}
                buttonLoading={searching}
                label=" "
                title="Search invoice"
                className="h-9.5 w-12 shrink-0 border-[1px] border-gray-600 text-center hover:border-blue-500 sm:w-20"
                icon={<FiSearch className="ml-2 text-lg text-white" />}
              />
            </div>
          </div>
        </div>

        {/* -------------------------------------------------- the labour row */}
        <div className="grid grid-cols-1 content-start gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="project_id">Select Project</label>
            <select
              id="project_id"
              name="project_id"
              className={SELECT_CLASS}
              value={draft.projectId}
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
              value={draft.buildingId}
              disabled={!draft.projectId}
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

          <div className="sm:col-span-2">
            <label htmlFor="product">Select Labour Item</label>
            <LabourDropdown
              id="product"
              name="product"
              className="h-9.5"
              value={draft.product ? { value: draft.product, label: draft.productName } : null}
              onSelect={(option: any) =>
                setDraft((prev) => ({
                  ...prev,
                  product: Number(option?.value) || '',
                  productName: option?.label || '',
                  unit: option?.label_3 || '',
                  // The dropdown carries the item's unit rate in label_4; it is
                  // a starting point, not a decision -- the clerk can type over
                  // it, and what is typed is what is booked.
                  price: option?.label_4 ? String(option.label_4) : prev.price,
                }))
              }
            />
          </div>

          <div className="relative">
            <InputElement
              id="qty"
              name="qty"
              type="number"
              label="Quantity"
              placeholder="Enter Quantity"
              className="h-9.5"
              value={draft.qty}
              onChange={(e) => setDraft((prev) => ({ ...prev, qty: e.target.value }))}
            />
            {/* Anchored to the foot of the field rather than a fixed distance
                from its top, so it stays centred in the box whatever the row
                height settles at. */}
            <span className="pointer-events-none absolute bottom-2 right-3 text-sm text-gray-500 dark:text-gray-400">
              {draft.unit}
            </span>
          </div>

          <InputElement
            id="price"
            name="price"
            type="number"
            label="Rate"
            placeholder="0"
            className="h-9.5"
            value={draft.price}
            onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />

          <div className="grid grid-cols-1 gap-1 sm:col-span-2 sm:grid-cols-4">
            {/* One button, two jobs — it has to say which it is about to do,
                or a correction silently becomes a duplicate line. */}
            <ButtonLoading
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
              onClick={resetAll}
              label="Reset"
              className="mr-0 whitespace-nowrap p-2 text-center"
              icon={<FiRefreshCw className="ml-2 mr-2 h-6 text-lg text-white" />}
            />
            <ButtonLoading
              onClick={() => navigate('/dashboard')}
              label="Home"
              className="mr-0 whitespace-nowrap p-2 text-center"
              icon={<FiHome className="ml-2 mr-2 h-6 text-lg text-white" />}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-300 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            <tr>
              <th scope="col" className="w-16 px-2 py-2">SL No.</th>
              <th scope="col" className="px-2 py-2">Item Name</th>
              <th scope="col" className="px-2 py-2">Project / Building</th>
              <th scope="col" className="px-2 py-2 text-right">Quantity</th>
              <th scope="col" className="px-2 py-2 text-right">Rate</th>
              <th scope="col" className="px-2 py-2 text-right">Total</th>
              <th scope="col" className="w-16 px-2 py-2 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.key}
                className={
                  'border-b dark:border-gray-700 ' +
                  (editingRowKey === row.key
                    ? 'bg-blue-50 dark:bg-blue-950'
                    : 'bg-white dark:bg-gray-800')
                }
              >
                <td className="px-2 py-2 text-gray-900 dark:text-white">{index + 1}</td>
                <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                  {row.productName}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-white">
                  {row.projectName || '—'}
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {row.buildingName || 'Whole project'}
                  </span>
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">
                  {row.qty} {row.unit}
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-white">{row.price}</td>
                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-white">
                  {thousandSeparator(Number(row.qty || 0) * Number(row.price || 0))}
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
              <td className="px-2 py-2" colSpan={5}>
                Invoice Total
              </td>
              <td className="px-2 py-2 text-right">{thousandSeparator(total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
};

export default ProjectLabour;
