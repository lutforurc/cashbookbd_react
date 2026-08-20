import React, { useEffect, useMemo, useState } from 'react';
import { FIELD_HEIGHT_REM, FIELD_SELECT, withFieldHeight } from '../../../../theme/fieldStyles';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaHouse, FaTrash } from 'react-icons/fa6';
import { FiCheckSquare } from 'react-icons/fi';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import Loader from '../../../../common/Loader';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import Table from '../../../utils/others/Table';
import httpService from '../../../services/httpService';
import { API_REPORT_GROUP_SETUP_URL } from '../../../services/apiRoutes';
import { Select as FormSelect } from '../../../utils/fields/FormControls';

type GroupItem = {
  id: number;
  name: string;
};

type SelectOption = {
  value: number;
  label: string;
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
  const searchableOptions = useMemo<SelectOption[]>(
    () => availableOptions.map((option) => ({ value: Number(option.id), label: option.name })),
    [availableOptions],
  );
  const selectedOption = searchableOptions.find((option) => String(option.value) === String(itemId)) || null;
  const tableData = selectedItems.map((item, index) => ({
    ...item,
    sl_number: index + 1,
  }));
  const columns = [
    {
      key: 'sl_number',
      header: 'Sl. No',
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Group Item',
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'w-32 text-center',
      cellClass: 'text-center',
      render: (item: GroupItem) => (
        <Button
          type="button"
          onClick={() => handleDelete(item.id)}
          disabled={deletingId === item.id}
          className="inline-flex items-center justify-center p-2 text-red-500 transition-colors hover:text-red-300 disabled:opacity-50"
          aria-label={`Remove ${item.name}`}
        >
          <FaTrash />
        </Button>
      ),
    },
  ];

  return (
    <div className="">
      <HelmetTitle title="Add Group Report" />
      <div className="py-3">

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Group
            </label>
            <FormSelect
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className={`${FIELD_SELECT} w-full px-3 text-sm font-medium`}
            >
              <option value="">Select your group</option>
              {reportGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </FormSelect>
          </div>

          <div className="min-w-[280px] flex-[1.4]">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Select Group Item
            </label>
            <Select<SelectOption>
              value={selectedOption}
              onChange={(option) => setItemId(option ? String(option.value) : '')}
              options={searchableOptions}
              isClearable
              isSearchable
              isDisabled={!groupId || loading}
              placeholder={loading ? 'Loading items...' : 'Select group item'}
              noOptionsMessage={() => (groupId ? 'No group item found' : 'Select a group first')}
              className="cash-react-select-container w-full"
              classNamePrefix="cash-react-select"
              styles={withFieldHeight({
                // The one height, in the units react-select understands.
                control: (base) => ({ ...base, minHeight: FIELD_HEIGHT_REM }),
              })}
              classNames={{
                control: (state) =>
                  // No height here: `min-h-10!` stood where the shared one now
                  // does, and an !important min-height beats an inline height, so
                  // this dropdown alone stood 40px beside 34px neighbours.
                  `rounded-none! border-stroke! bg-transparent! text-sm! shadow-none! dark:border-strokedark! dark:bg-form-input! ${
                    state.isFocused ? 'border-blue-500! dark:border-blue-400!' : ''
                  }`,
                valueContainer: () => 'px-3! py-0!',
                input: () => 'text-slate-900! dark:text-[rgb(var(--c-text))]!',
                singleValue: () => 'text-slate-900! dark:text-[rgb(var(--c-text))]!',
                placeholder: () => 'text-slate-500! dark:text-slate-300!',
                menu: () => 'z-50! rounded-none! border! border-stroke! bg-white! dark:border-strokedark! dark:bg-boxdark!',
                option: (state) =>
                  `cursor-pointer! text-sm! ${
                    state.isFocused ? 'bg-slate-100! dark:bg-slate-700!' : 'bg-white! dark:bg-boxdark!'
                  } ${state.isSelected ? 'bg-slate-200! dark:bg-slate-600!' : ''} text-slate-900! dark:text-[rgb(var(--c-text))]!`,
              }}
            />
          </div>

          <div className="ml-auto flex gap-2">
            <ButtonLoading
              onClick={handleAdd}
              disabled={saving || loading}
              buttonLoading={saving}
              label="Add"
              icon={<FiCheckSquare />}
              className="px-6"
            />
            <ButtonLoading
              onClick={() => navigate('/dashboard')}
              buttonLoading={false}
              label="Home"
              icon={<FaHouse />}
              className="px-5"
            />
          </div>
        </div>
      </div>

      <div className="overflow-y-auto">
        {loading ? <Loader /> : null}
        <Table
          columns={columns}
          data={tableData || []}
          noDataMessage={groupId ? 'No group items added yet.' : 'Select a group to view added items.'}
        />
      </div>
    </div>
  );
};

export default GroupReportSetup;
