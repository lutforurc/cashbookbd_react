import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaHouse, FaTrash } from 'react-icons/fa6';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import httpService from '../../../services/httpService';
import { API_REPORT_GROUP_SETUP_URL } from '../../../services/apiRoutes';

type GroupItem = {
  id: number;
  name: string;
};

const reportGroups = [
  { id: '1', name: 'Operating Cost' },
  { id: '2', name: 'Purchase Cost' },
];

const GroupReportSetup = () => {
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState('');
  const [itemId, setItemId] = useState('');
  const [options, setOptions] = useState<GroupItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSetup = async (selectedGroup: string) => {
    if (!selectedGroup) {
      setOptions([]);
      setSelectedItems([]);
      setItemId('');
      return;
    }

    setLoading(true);
    try {
      const response = await httpService.get(`${API_REPORT_GROUP_SETUP_URL}/${selectedGroup}`);
      const data = response?.data?.data ?? response?.data ?? {};
      setOptions(Array.isArray(data.options) ? data.options : []);
      setSelectedItems(Array.isArray(data.selected) ? data.selected : []);
      setItemId('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load group information.');
      setOptions([]);
      setSelectedItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSetup(groupId);
  }, [groupId]);

  const handleAdd = async () => {
    if (!groupId) {
      toast.info('Please select group.');
      return;
    }
    if (!itemId) {
      toast.info('Please select group item.');
      return;
    }

    setSaving(true);
    try {
      const response = await httpService.post(`${API_REPORT_GROUP_SETUP_URL}/items`, {
        group_id: Number(groupId),
        item_id: Number(itemId),
      });
      const data = response?.data ?? {};
      if (data.success === false) {
        toast.info(data.message || 'Unable to add group item.');
        return;
      }
      toast.success(data.message || 'Group item added successfully.');
      await loadSetup(groupId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to add group item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deleteId: number) => {
    if (!groupId) return;
    setDeletingId(deleteId);
    try {
      const response = await httpService.post(`${API_REPORT_GROUP_SETUP_URL}/items/delete`, {
        report_type: Number(groupId),
        delete_id: deleteId,
      });
      toast.success(response?.data?.message || 'Group item removed successfully.');
      await loadSetup(groupId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to remove group item.');
    } finally {
      setDeletingId(null);
    }
  };

  const availableOptions = options.filter(
    (option) => !selectedItems.some((selected) => Number(selected.id) === Number(option.id)),
  );

  return (
    <div>
      <HelmetTitle title="Add Group Report" />
      <div className="mt-3 border border-stroke bg-white p-4 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add Group</h1>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="mb-2 text-base font-medium text-gray-900 dark:text-white">Group Information</h2>
            <div className="space-y-4">
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="h-10 w-full rounded-sm border border-stroke bg-transparent px-3 text-sm outline-none dark:border-strokedark dark:bg-form-input"
              >
                <option value="">Select your group</option>
                {reportGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
              </select>

              <select
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
                disabled={!groupId || loading}
                className="h-10 w-full rounded-sm border border-stroke bg-transparent px-3 text-sm outline-none disabled:opacity-60 dark:border-strokedark dark:bg-form-input"
              >
                <option value="">{loading ? 'Loading items...' : 'Select group item'}</option>
                {availableOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={saving || loading}
                  className="h-10 rounded-sm bg-slate-700 px-4 text-sm font-medium uppercase text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex h-10 items-center justify-center gap-2 rounded-sm bg-primary px-4 text-sm font-medium uppercase text-white"
                >
                  <FaHouse /> Home
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <h2 className="mb-2 text-base font-medium text-gray-900 dark:text-white">
              Already added for details reports
            </h2>
            {loading ? <Loader /> : null}
            {!loading && !groupId ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Select a group to view added items.</p>
            ) : null}
            {!loading && groupId && selectedItems.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No items added yet.</p>
            ) : null}
            <ul className="divide-y divide-stroke border-y border-stroke dark:divide-strokedark dark:border-strokedark">
              {selectedItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-2 py-2 text-sm">
                  <span>{item.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    className="p-2 text-red-600 hover:text-red-800 disabled:opacity-50"
                    aria-label={`Remove ${item.name}`}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupReportSetup;
