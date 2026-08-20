import { useCallback, useEffect, useMemo, useState } from 'react';
import { FIELD_SELECT, FIELD_SIZE } from '../../../../theme/fieldStyles';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiEdit2, FiHome, FiPlus, FiRefreshCw, FiSave, FiSearch, FiTrash2, FiX } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import InputOnly from '../../../utils/fields/InputOnly';
import DdlMultiline from '../../../utils/utils-functions/DdlMultiline';
import ProductDropdown from '../../../utils/utils-functions/ProductDropdown';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_PROJECT_EXPENSE_BUILDINGS_DDL_URL,
  API_PROJECT_EXPENSE_PROJECTS_DDL_URL,
  API_PROJECT_PURCHASE_EDIT_URL,
  API_PROJECT_PURCHASE_STORE_URL,
  API_PROJECT_PURCHASE_UPDATE_URL,
} from '../../../services/apiRoutes';
import { Select } from '../../../utils/fields/FormControls';

interface Option {
  value: number | string;
  label: string;
}

interface ProductRow {
  key: string;
  product: number | '';
  productName: string;
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

const SELECT_CLASS = `${FIELD_SELECT} ${FIELD_SIZE.md} w-full`;

/**
 * Material bought for a project, and for the buildings within it.
 *
 * Laid out like the Construction Purchase Invoice it is modelled on, with two
 * differences that matter.
 *
 * Building replaces Warehouse. This branch keeps no warehouses -- the existing
 * screen shows "Not Applicable" and means it -- and a second location dropdown
 * beside the first would only be something to get wrong.
 *
 * Building is chosen PER PRODUCT ROW, not once for the invoice, because a
 * delivery can serve more than one. The header choice is a default that each
 * new row inherits, so an invoice for a single building still takes one pick.
 * The ledger then carries one Purchase line per building, which is what lets a
 * building be asked what it has cost.
 */
const ProjectPurchase = () => {
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
  const [vehicleNo, setVehicleNo] = useState('');
  const [notes, setNotes] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paid, setPaid] = useState('0');

  // The row being typed, and the rows already added.
  const [draft, setDraft] = useState<Omit<ProductRow, 'key'>>({
    product: '',
    productName: '',
    qty: '',
    price: '',
    projectId: '',
    projectName: '',
    buildingId: '',
    buildingName: '',
  });
  const [rows, setRows] = useState<ProductRow[]>([]);

  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ mtmId: string; vrNo: string } | null>(null);
  // Which product line is open in the form, if any. Distinct from `editing`
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
      toast.error('Choose the project this material is for.');
      return;
    }

    if (!draft.product) {
      toast.error('Choose a product.');
      return;
    }

    if (!draft.qty || Number(draft.qty) <= 0) {
      toast.error('Enter a quantity greater than zero.');
      return;
    }

    if (editingRowKey) {
      // Back into its own place in the invoice, not onto the end. The lines are
      // read in the order the goods were listed on the supplier's bill.
      setRows((prev) =>
        prev.map((row) => (row.key === editingRowKey ? { ...draft, key: row.key } : row)),
      );
      setEditingRowKey(null);
    } else {
      setRows((prev) => [...prev, { ...draft, key: `${Date.now()}-${prev.length}` }]);
    }

    // Project and building stay; the product line does not. Most of an
    // invoice goes to one place, and re-picking it every row is how a form
    // teaches people to stop bothering.
    setDraft((prev) => ({
      ...prev,
      product: '',
      productName: '',
      qty: '',
      price: '',
    }));
  };

  /** Take a product line back into the form to be corrected. */
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
    setVehicleNo('');
    setNotes('');
    setDiscount('0');
    setPaid('0');
    setRows([]);
    setEditing(null);
    setEditingRowKey(null);
    setDraft({
      product: '',
      productName: '',
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
    vehicle_no: vehicleNo || null,
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
      toast.error('Add at least one product before saving.');
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
        ? await httpService.post(API_PROJECT_PURCHASE_UPDATE_URL, {
            ...payload(),
            mtm_id: editing.mtmId,
          })
        : await httpService.post(API_PROJECT_PURCHASE_STORE_URL, payload());

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
      const response = await httpService.post(API_PROJECT_PURCHASE_EDIT_URL, { vr_no: vrNo });
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
      setVehicleNo(data.vehicle_no || '');
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
      <HelmetTitle title="Project Purchase" />



      {/* content-start on both columns: the two sides hold a different number
          of rows, and the shorter one is stretched to the taller one's height.
          Left to spread, its rows share out that spare height and open gaps
          between the fields. Starting the content keeps the rows their own
          size and leaves the slack at the foot of the column, where it shows
          as nothing at all. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ---------------------------------------------------- the invoice */}
        <div className="grid grid-cols-1 content-start gap-2 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="supplier">Select Supplier</label>
            <DdlMultiline
 id="supplier"
 name="supplier"
 acType="3"
 className=""
 value={supplier.id ? { value: supplier.id, label: supplier.name } : null}
 onSelect={(option: any) =>
                setSupplier({ id: Number(option?.value) || '', name: option?.label || '' })
              }
            />
          </div>

          {/* Notes finishes the supplier's row, as on Project Labour. The
              invoice's own number and date then start the next one together,
              which is the order they are read off the supplier's bill in. */}
          <InputElement
 id="notes"
 name="notes"
 label="Notes"
 placeholder="Notes"
 className=""
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
          />

          <InputElement
 id="invoice_no"
 name="invoice_no"
 label="Invoice Number"
 placeholder="Invoice Number"
 className=""
 value={invoiceNo}
 onChange={(e) => setInvoiceNo(e.target.value)}
          />

          <div className="text-left flex flex-col">
            <label htmlFor="invoice_date" className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Invoice Date
            </label>
            <InputDatePicker
 id="invoice_date"
 name="invoice_date"
 className="w-full px-3 py-1 "
 selectedDate={invoiceDateOn}
 setSelectedDate={setInvoiceDateOn}
 setCurrentDate={handleInvoiceDate}
            />
          </div>

          <InputElement
 id="vehicle_no"
 name="vehicle_no"
 label="Vehicle Number"
 placeholder="Vehicle Number"
 className=""
 value={vehicleNo}
 onChange={(e) => setVehicleNo(e.target.value)}
          />

          <InputElement
 id="discount"
 name="discount"
 type="number"
 label="Discount Amount"
 placeholder="0"
 className=""
 value={discount}
 onChange={(e) => setDiscount(e.target.value)}
          />

          <InputElement
 id="paid"
 name="paid"
 type="number"
 label="Payment Amount"
 placeholder="0"
 className=""
 disabled={isCashSupplier}
 value={paid}
 onChange={(e) => setPaid(e.target.value)}
            description={isCashSupplier ? 'A cash purchase is paid in full.' : undefined}
          />

          <div className="flex flex-col justify-end">
            <span className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Total Tk.</span>
            <span className="py-1 text-lg font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              {thousandSeparator(total)}
            </span>
          </div>

          {/* Looking an old invoice up belongs with the invoice, not with the
              line being typed opposite.

              The label is carried for screen readers only. On show it would
              add its own line, and this row sits across from the buttons,
              which have none -- the two columns would stop level no longer.
              The placeholder and the magnifier say the same thing to the eye. */}
          <div className="sm:col-span-2">
            <label htmlFor="search" className="sr-only">
              Search Invoice
            </label>
            <div className="flex items-end">
              <div className="min-w-0 flex-1">
                <InputOnly
 id="search"
 name="search"
 value={search}
 placeholder="Voucher number"
 label=""
 className="w-full py-1"
 onChange={(e: any) => setSearch(e.target.value)}
                />
              </div>
              {/* No gap, and -ml-px so the two borders sit on one line -- the
                  box and the button it belongs to read as one control. */}
              <ButtonLoading
                onClick={handleSearch}
                buttonLoading={searching}
                label=" "
                title="Search invoice"
                className="-ml-px w-12 shrink-0 border border-gray-600 text-center hover:border-blue-500 sm:w-20"
                icon={<FiSearch className="ml-2 text-lg" />}
              />
            </div>
          </div>

          {/* A figure of its own rather than small print under the total. It
              follows the search box so that it lands in the same column as the
              total, directly beneath it -- this form carries one field more
              than Project Labour, so the two cannot sit side by side without
              pushing the column past the buttons opposite.

              Label and figure share one line here, unlike the total above:
              this is the last row of the column, so every line it saves is a
              line the form does not grow by. */}
          <div className="flex items-baseline justify-start gap-2">
            <span className="text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">Due Tk.</span>
            <span className="text-lg font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              {thousandSeparator(due)}
            </span>
          </div>
        </div>

        {/* ------------------------------------------------- the product row */}
        <div className="grid grid-cols-1 content-start gap-2 sm:grid-cols-2">
          <div>
            <label htmlFor="project_id">Select Project</label>
            <Select
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
            </Select>
          </div>

          <div>
            <label htmlFor="building_id">Select Building</label>
            <Select
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
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="product">Select Product</label>
            <ProductDropdown
 id="product"
 name="product"
 className=""
 value={draft.product ? { value: draft.product, label: draft.productName } : null}
 onSelect={(option: any) =>
                setDraft((prev) => ({
                  ...prev,
                  product: Number(option?.value) || '',
                  productName: option?.label || '',
                  // The dropdown carries the last known rate in label_3; it is
                  // a starting point, not a decision -- the clerk can type over
                  // it, and what is typed is what is booked.
                  price: option?.label_3 ? String(option.label_3) : prev.price,
                }))
              }
            />
          </div>

          <InputElement
 id="qty"
 name="qty"
 type="number"
 label="Quantity"
 placeholder="Enter Quantity"
 className=""
 value={draft.qty}
 onChange={(e) => setDraft((prev) => ({ ...prev, qty: e.target.value }))}
          />

          <InputElement
 id="price"
 name="price"
 type="number"
 label="Price"
 placeholder="0"
 className=""
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
                icon={<FiX className="ml-2 mr-2 h-6 text-lg" />}
              />
            ) : (
              <ButtonLoading
                disabled={saving}
                onClick={handleSave}
                buttonLoading={saving}
                label={saving ? 'Saving...' : editing ? 'Update' : 'Save'}
                className="mr-0 whitespace-nowrap text-center"
                icon={<FiSave className="ml-2 mr-2 h-6 text-lg" />}
              />
            )}
            <ButtonLoading
              onClick={resetAll}
              label="Reset"
              className="mr-0 whitespace-nowrap p-2 text-center"
              icon={<FiRefreshCw className="ml-2 mr-2 h-6 text-lg" />}
            />
            <ButtonLoading
              onClick={() => navigate('/dashboard')}
              label="Home"
              className="mr-0 whitespace-nowrap p-2 text-center"
              icon={<FiHome className="ml-2 mr-2 h-6 text-lg" />}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------ table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
            <tr>
              <th scope="col" className="w-16 px-2 py-2">SL No.</th>
              <th scope="col" className="px-2 py-2">Product Name</th>
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
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">{index + 1}</td>
                <td className="px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.productName}
                </td>
                <td className="px-2 py-2 text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {row.projectName || '—'}
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {row.buildingName || 'Whole project'}
                  </span>
                </td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">{row.qty}</td>
                <td className="px-2 py-2 text-right text-gray-900 dark:text-[rgb(var(--c-text))]">{row.price}</td>
                <td className="px-2 py-2 text-right font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {thousandSeparator(Number(row.qty || 0) * Number(row.price || 0))}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      aria-label="Edit line"
                      title="Edit this line"
                      onClick={() => handleEditRow(row.key)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      type="button"
                      aria-label="Remove line"
                      title="Remove this line"
                      onClick={() => handleRemove(row.key)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-200 font-semibold text-gray-900 dark:bg-gray-700 dark:text-[rgb(var(--c-text))]">
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

export default ProjectPurchase;
