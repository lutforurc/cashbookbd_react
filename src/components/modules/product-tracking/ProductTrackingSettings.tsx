import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiPlus, FiEdit2, FiX, FiCheck } from 'react-icons/fi';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import BranchDropdown from '../../utils/utils-functions/BranchDropdown';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import FormToggleField from '../../utils/utils-functions/FormToggleField';
import { getDdlProtectedBranch } from '../branch/ddlBranchSlider';
import {
  SettingPayload,
  TrackingSetting,
  useAvailableProducts,
  useProductTrackingSettings,
} from './productTrackingSettingsSlice';

const emptyForm: SettingPayload = {
  product_id: 0,
  branch_id: 0,
  coa4_id: 0,
  track_sales_bill: true,
  track_purchase_bill: true,
  track_cash_received: true,
  track_cash_payment: true,
  is_active: true,
};

/**
 * Where it is decided which products have their bills, receipts and payments
 * counted separately.
 *
 * Until a product is added here it does not appear on the Cash Received and
 * Cash Payment forms -- that is the opt-in rule, so money is never posted
 * against a product nobody meant to track.
 *
 * Deactivating stops new mappings but leaves the figures and reports already
 * recorded untouched, which is why there is no Delete here.
 */
const ProductTrackingSettings = () => {
  const { settings, loading, saving, error, search, setSearch, create, update, toggle } =
    useProductTrackingSettings();

  const dispatch = useDispatch();
  const branchDdl = useSelector((state: any) => state.branchDdl);

  const [form, setForm] = useState<SettingPayload>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [partyName, setPartyName] = useState('');
  const { products: availableProducts } = useAvailableProducts(form.branch_id, form.coa4_id);

  useEffect(() => {
    dispatch(getDdlProtectedBranch() as any);
  }, [dispatch]);

  // "All Branch" is a real choice here (id = 0), not the absence of one, so it
  // sits at the very top of the list.
  const branchOptions = useMemo(
    () => [
      { id: '0', name: 'All Branch' },
      ...((branchDdl?.protectedData?.data ?? []) as Array<{ id: any; name: string }>).map((b) => ({
        id: String(b.id),
        name: b.name,
      })),
    ],
    [branchDdl?.protectedData?.data],
  );

  // While editing, the product being edited is itself absent from the list (it
  // is already configured), so it has to be put back by hand -- otherwise the
  // dropdown would show empty.
  const productOptions = useMemo(() => {
    const options = availableProducts.map((p) => ({ id: p.id, name: p.name }));

    if (editingId) {
      const current = settings.find((s) => s.id === editingId);
      if (current && !options.some((o) => o.id === current.product_id)) {
        options.unshift({ id: current.product_id, name: current.product_name ?? '' });
      }
    }

    return [{ id: 0, name: '-- Select Product --' }, ...options];
  }, [availableProducts, editingId, settings]);

  const startEdit = (row: TrackingSetting) => {
    setEditingId(row.id);
    setPartyName(row.party_name ?? '');
    setForm({
      product_id: row.product_id,
      branch_id: row.branch_id,
      coa4_id: row.coa4_id,
      track_sales_bill: row.track_sales_bill,
      track_purchase_bill: row.track_purchase_bill,
      track_cash_received: row.track_cash_received,
      track_cash_payment: row.track_cash_payment,
      is_active: row.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setPartyName('');
    setForm(emptyForm);
  };

  const submit = async () => {
    if (!form.product_id) {
      toast.error('Select a product.');
      return;
    }

    const result = editingId ? await update(editingId, form) : await create(form);

    if (result.ok) {
      toast.success(result.message || 'Saved.');
      cancelEdit();
    } else {
      toast.error(result.message);
    }
  };

  const flip = async (row: TrackingSetting) => {
    const result = await toggle(row.id, !row.is_active);
    if (!result.ok) toast.error(result.message);
  };

  const flag = (on: boolean) => (
    <span className={on ? 'text-green-600' : 'text-gray-400'}>{on ? 'Yes' : 'No'}</span>
  );

  return (
    <div className="p-2">
      <HelmetTitle title="Product Tracking" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ------------------ Add / Edit ------------------ */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="mb-3 text-lg font-semibold text-black dark:text-white">
            {editingId ? 'Edit Setting' : 'Add New Product'}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {/* h-9 to stand level with the Branch select below it. Both are
                native selects on dark:bg-boxdark, so the height was the only
                thing setting them apart. */}
            <DropdownCommon
              id="product_id"
              name="product_id"
              label="Product"
              className="h-9"
              value={String(form.product_id)}
              data={productOptions}
              onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })}
              description="The product you want billing, receipts and payments counted separately for."
            />

            <div>
              <label className="dark:text-white text-left text-sm text-gray-900" htmlFor="coa4_id">
                Customer / Supplier
              </label>
              {/* This one is a react-select, and its own styles paint the box a
                  darker grey than the native selects above and below it. The
                  classes land on the control (DdlMultiline forwards className
                  there), and the ! is what beats the library's own colour, so
                  all three boxes on this form read as one set. */}
              <DdlMultiline
                id="coa4_id"
                name="coa4_id"
                className="h-9 !bg-white dark:!bg-boxdark !border-gray-300 dark:!border-gray-600"
                placeholder="For all parties"
                value={form.coa4_id ? { value: String(form.coa4_id), label: partyName } : null}
                onSelect={(selected) => {
                  setForm({ ...form, coa4_id: selected ? Number(selected.value) : 0 });
                  setPartyName(selected?.label ?? '');
                }}
              />
              <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Which customer or supplier this product is tracked for. Left empty it applies to
                every party. A setting made for one party wins over this.
              </p>
            </div>

            <div>
              <label className="dark:text-white text-left text-sm text-gray-900" htmlFor="branch_id">
                Branch
              </label>
              <BranchDropdown
                id="branch_id"
                name="branch_id"
                className="w-full p-1 text-sm h-9"
                branchDdl={branchOptions}
                value={String(form.branch_id)}
                onChange={(e) => setForm({ ...form, branch_id: Number(e.target.value) })}
              />
              <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                All Branch applies this to every branch of the company. A setting made for one
                branch wins over it.
              </p>
            </div>

            {[
              ['track_sales_bill', 'Sales Bill', 'Bills for this product are counted from sales invoices'],
              ['track_purchase_bill', 'Purchase Bill', 'Bills for this product are counted from purchase invoices'],
              ['track_cash_received', 'Cash Received', 'This product can be chosen on the Cash Received form'],
              ['track_cash_payment', 'Cash Payment', 'This product can be chosen on the Cash Payment form'],
              ['is_active', 'Active', 'Switching this off stops new mappings; figures already recorded stay as they are'],
            ].map(([key, label, hint]) => (
              // The same switch the branch setup screen uses for its settings,
              // so a setting reads the same wherever it is met. No bottom margin
              // of its own -- the grid above already spaces these rows.
              <FormToggleField
                key={key}
                label={label}
                description={hint}
                className=""
                checked={Boolean((form as any)[key])}
                onChange={(checked) => setForm({ ...form, [key]: checked })}
              />
            ))}

            {/* Left as ButtonLoading's own shape -- no height class, and the icon
                carries no margins of its own, because the button already spaces
                it. This is the Add Branch button, and these two should not be
                two different buttons. */}
            <div className="flex gap-2">
              <ButtonLoading
                onClick={submit}
                buttonLoading={saving}
                label={editingId ? 'Update' : 'Add'}
                icon={editingId ? <FiEdit2 size={15} /> : <FiPlus size={15} />}
              />
              {editingId ? (
                <ButtonLoading
                  onClick={cancelEdit}
                  buttonLoading={false}
                  label="Cancel"
                  icon={<FiX size={15} />}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* ------------------ List ------------------ */}
        <div className="lg:col-span-2 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Tracked Products ({settings.length})
            </h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product"
              className="w-56 rounded-xs border border-gray-300 p-1 text-sm outline-none dark:border-gray-600 dark:bg-boxdark dark:text-white"
            />
          </div>

          {error ? (
            <p className="rounded-sm bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {loading ? <Loader /> : null}

          {!loading && !error && settings.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 dark:text-gray-400">
              No product has been added yet. Add one with the form on the left — until you do, the
              Product dropdown does not appear on the Cash Received and Cash Payment forms.
            </p>
          ) : null}

          {settings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-300 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2">Customer / Supplier</th>
                    <th className="px-2 py-2">Branch</th>
                    <th className="px-2 py-2 text-center">Sales Bill</th>
                    <th className="px-2 py-2 text-center">Purchase Bill</th>
                    <th className="px-2 py-2 text-center">Received</th>
                    <th className="px-2 py-2 text-center">Payment</th>
                    <th className="px-2 py-2 text-center">Active</th>
                    <th className="px-2 py-2 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                        {row.product_name}
                      </td>
                      <td className="px-2 py-2">
                        {row.coa4_id === 0 ? (
                          <span className="text-gray-400">All parties</span>
                        ) : (
                          row.party_name ?? row.coa4_id
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {row.branch_id === 0 ? 'All Branch' : row.branch_name ?? row.branch_id}
                      </td>
                      <td className="px-2 py-2 text-center">{flag(row.track_sales_bill)}</td>
                      <td className="px-2 py-2 text-center">{flag(row.track_purchase_bill)}</td>
                      <td className="px-2 py-2 text-center">{flag(row.track_cash_received)}</td>
                      <td className="px-2 py-2 text-center">{flag(row.track_cash_payment)}</td>
                      <td className="px-2 py-2 text-center">{flag(row.is_active)}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => startEdit(row)}
                          className="mr-2 text-blue-600"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => flip(row)}
                          className={row.is_active ? 'text-red-500' : 'text-green-600'}
                          title={row.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {row.is_active ? <FiX /> : <FiCheck />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProductTrackingSettings;
