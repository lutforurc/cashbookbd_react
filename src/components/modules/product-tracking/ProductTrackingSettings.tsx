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
 * এখানেই ঠিক হয় কোন Product-এর Bill/Received/Payment আলাদা করে হিসাব রাখা হবে।
 *
 * যোগ না করা পর্যন্ত Cash Received/Payment ফর্মে ঐ Product দেখাবে না — এটাই
 * opt-in নিয়ম, যাতে ভুল Product-এ টাকা বসে না যায়।
 *
 * নিষ্ক্রিয় করলে নতুন mapping বন্ধ হয়, কিন্তু পুরোনো hisab ও report অক্ষত
 * থাকে — তাই এখানে কোনো "Delete" নেই।
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

  // "All Branch" এখানে একটি বাস্তব বিকল্প (id = 0), শাখা বাছার অনুপস্থিতি নয় —
  // তাই তালিকার একেবারে উপরে বসানো হয়েছে।
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

  // সম্পাদনার সময় ঐ Product নিজেই তালিকায় থাকে না (already configured),
  // তাই তাকে হাতে করে ঢোকাতে হয় — নইলে dropdown ফাঁকা দেখাত।
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
      toast.error('একটি Product বাছুন।');
      return;
    }

    const result = editingId ? await update(editingId, form) : await create(form);

    if (result.ok) {
      toast.success(result.message || 'সংরক্ষিত হয়েছে।');
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
    <span className={on ? 'text-green-600' : 'text-gray-400'}>{on ? 'হ্যাঁ' : 'না'}</span>
  );

  return (
    <div className="p-2">
      <HelmetTitle title="Product Tracking" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ------------------ যোগ / সম্পাদনা ------------------ */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h3 className="mb-3 text-lg font-semibold text-black dark:text-white">
            {editingId ? 'Setting সম্পাদনা' : 'নতুন Product যোগ করুন'}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <DropdownCommon
              id="product_id"
              name="product_id"
              label="Product"
              value={String(form.product_id)}
              data={productOptions}
              onChange={(e) => setForm({ ...form, product_id: Number(e.target.value) })}
              description="যে পণ্যের বিপরীতে আলাদা করে বিল, আদায় ও পরিশোধের হিসাব রাখতে চান।"
            />

            <div>
              <label className="dark:text-white text-left text-sm text-gray-900" htmlFor="coa4_id">
                Customer / Supplier
              </label>
              <DdlMultiline
                id="coa4_id"
                name="coa4_id"
                className="h-9"
                placeholder="সব পার্টির জন্য"
                value={form.coa4_id ? { value: String(form.coa4_id), label: partyName } : null}
                onSelect={(selected) => {
                  setForm({ ...form, coa4_id: selected ? Number(selected.value) : 0 });
                  setPartyName(selected?.label ?? '');
                }}
              />
              <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                কোন Customer/Supplier-এর জন্য এই পণ্যের হিসাব রাখবেন। খালি রাখলে সব পার্টির
                জন্য প্রযোজ্য হবে। নির্দিষ্ট পার্টির সেটিং থাকলে সেটিই আগে গণ্য হয়।
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
                All Branch দিলে এই কোম্পানির সব শাখায় প্রযোজ্য হবে। নির্দিষ্ট শাখার সেটিং
                থাকলে সেটিই আগে গণ্য হয়।
              </p>
            </div>

            {[
              ['track_sales_bill', 'Sales Bill', 'বিক্রয় ইনভয়েস থেকে এই পণ্যের বিল হিসাব হবে'],
              ['track_purchase_bill', 'Purchase Bill', 'ক্রয় ইনভয়েস থেকে এই পণ্যের বিল হিসাব হবে'],
              ['track_cash_received', 'Cash Received', 'Cash Received ফর্মে এই পণ্য বাছা যাবে'],
              ['track_cash_payment', 'Cash Payment', 'Cash Payment ফর্মে এই পণ্য বাছা যাবে'],
              ['is_active', 'Active', 'বন্ধ করলে নতুন mapping হবে না, পুরোনো হিসাব অক্ষত থাকবে'],
            ].map(([key, label, hint]) => (
              <label key={key} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean((form as any)[key])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                <span>
                  <span className="text-black dark:text-white">{label}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>
                </span>
              </label>
            ))}

            <div className="flex gap-2">
              <ButtonLoading
                onClick={submit}
                buttonLoading={saving}
                label={editingId ? 'Update' : 'Add'}
                className="whitespace-nowrap"
                icon={
                  editingId ? (
                    <FiEdit2 className="text-white text-lg ml-2 mr-2" />
                  ) : (
                    <FiPlus className="text-white text-lg ml-2 mr-2" />
                  )
                }
              />
              {editingId ? (
                <ButtonLoading
                  onClick={cancelEdit}
                  buttonLoading={false}
                  label="Cancel"
                  className="whitespace-nowrap"
                  icon={<FiX className="text-white text-lg ml-2 mr-2" />}
                />
              ) : null}
            </div>
          </div>
        </div>

        {/* ------------------ তালিকা ------------------ */}
        <div className="lg:col-span-2 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-black dark:text-white">
              Tracked Products ({settings.length})
            </h3>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Product খুঁজুন"
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
              এখনো কোনো Product যোগ করা হয়নি। বাঁ পাশের ফর্ম দিয়ে যোগ করুন — যোগ করার আগ
              পর্যন্ত Cash Received/Payment ফর্মে Product dropdown দেখা যাবে না।
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
                          <span className="text-gray-400">সব পার্টি</span>
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
