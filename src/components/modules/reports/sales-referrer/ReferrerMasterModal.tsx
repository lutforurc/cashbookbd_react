import React, { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiSave, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import { Input } from '../../../utils/fields/FormControls';
import httpService from '../../../services/httpService';
import { API_REFERRERS_URL } from '../../../services/apiRoutes';

interface ReferrerMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** A row was added or changed -- the report behind should re-read. */
  onChanged: () => void;
}

const BLANK = { name: '', mobile: '', address: '' };

/**
 * The referrer list itself -- kept here, on the report screen, because the
 * owner asked for one screen that both reads the account and keeps the list.
 * There is no separate master screen and no menu behind it.
 *
 * ⚠️ NOTHING IS EVER DELETED, only retired (`status = 0`). Last season's bills
 * name these rows, and a row taken away would leave them naming nothing. A
 * retired referrer drops off the invoice popup and stays on the report.
 */
const ReferrerMasterModal: React.FC<ReferrerMasterModalProps> = ({ isOpen, onClose, onChanged }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState({ ...BLANK });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ ...BLANK });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);

    httpService
      .get(API_REFERRERS_URL)
      .then((response: any) => {
        const list = response?.data?.data?.data?.rows ?? response?.data?.data?.rows ?? [];
        setRows(Array.isArray(list) ? list : []);
      })
      .catch((error: any) => {
        if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not read the referrers.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const add = () => {
    if (!draft.name.trim()) {
      toast.info('A name is required.');
      return;
    }

    setSaving(true);

    httpService
      .post(API_REFERRERS_URL, {
        name: draft.name.trim(),
        mobile: draft.mobile.trim(),
        address: draft.address.trim(),
      })
      .then((response: any) => {
        toast.success(response?.data?.message || 'Referrer added.');
        setDraft({ ...BLANK });
        load();
        onChanged();
      })
      .catch((error: any) => {
        if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not add the referrer.');
      })
      .finally(() => setSaving(false));
  };

  const saveEdit = (id: number) => {
    if (!editDraft.name.trim()) {
      toast.info('A name is required.');
      return;
    }

    setSaving(true);

    httpService
      .put(`${API_REFERRERS_URL}/${id}`, {
        name: editDraft.name.trim(),
        mobile: editDraft.mobile.trim(),
        address: editDraft.address.trim(),
      })
      .then((response: any) => {
        toast.success(response?.data?.message || 'Referrer updated.');
        setEditingId(null);
        load();
        onChanged();
      })
      .catch((error: any) => {
        if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not update the referrer.');
      })
      .finally(() => setSaving(false));
  };

  const toggleStatus = (row: any) => {
    setSaving(true);

    httpService
      .patch(`${API_REFERRERS_URL}/${row.id}/status`, { status: Number(row.status) === 1 ? 0 : 1 })
      .then((response: any) => {
        toast.success(response?.data?.message || 'Referrer updated.');
        load();
        onChanged();
      })
      .catch((error: any) => {
        if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not change the referrer.');
      })
      .finally(() => setSaving(false));
  };

  if (!isOpen) return null;

  const field = (value: string, onValue: (next: string) => void, placeholder: string, onKeyDown?: any) => (
    <Input
      value={value}
      placeholder={placeholder}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) => onValue(event.target.value)}
      onKeyDown={onKeyDown}
      className="w-full p-2 text-sm"
    />
  );

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
              Sales Referrers
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The list the invoice popup picks from. A retired referrer keeps the bills they already brought.
            </p>
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FiX className="text-lg" />
          </Button>
        </div>

        <div className="border-b border-[rgb(var(--c-border))] p-4">
          <div className="grid grid-cols-1 items-end gap-2 md:grid-cols-4">
            <InputElement
              id="referrer_name"
              name="name"
              label="Name"
              placeholder="Name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
              onKeyDown={(event) => event.key === 'Enter' && add()}
            />
            <InputElement
              id="referrer_mobile"
              name="mobile"
              label="Mobile"
              placeholder="Mobile"
              value={draft.mobile}
              onChange={(event) => setDraft((prev) => ({ ...prev, mobile: event.target.value }))}
            />
            <InputElement
              id="referrer_address"
              name="address"
              label="Address"
              placeholder="Address"
              value={draft.address}
              onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
            />
            <ButtonLoading
              onClick={add}
              buttonLoading={saving}
              label="Add"
              className="whitespace-nowrap text-center"
              icon={<FiPlus className="text-lg ml-2 mr-2" />}
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Mobile</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {rows.map((row) => (
                <tr key={row.id}>
                  {editingId === row.id ? (
                    <>
                      <td className="px-2 py-1">{field(editDraft.name, (next) => setEditDraft((prev) => ({ ...prev, name: next })), 'Name')}</td>
                      <td className="px-2 py-1">{field(editDraft.mobile, (next) => setEditDraft((prev) => ({ ...prev, mobile: next })), 'Mobile')}</td>
                      <td className="px-2 py-1">{field(editDraft.address, (next) => setEditDraft((prev) => ({ ...prev, address: next })), 'Address')}</td>
                      <td className="px-3 py-2" />
                      <td className="whitespace-nowrap px-3 py-2">
                        <Button
                          type="button"
                          onClick={() => saveEdit(row.id)}
                          className="mr-2 rounded-sm p-1 text-green-600 hover:bg-gray-100"
                          title="Save"
                        >
                          <FiSave />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-sm p-1 text-gray-500 hover:bg-gray-100"
                          title="Cancel"
                        >
                          <FiX />
                        </Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2">{row.name}</td>
                      <td className="px-3 py-2">{row.mobile}</td>
                      <td className="truncate px-3 py-2">{row.address}</td>
                      <td className="px-3 py-2">
                        {Number(row.status) === 1 ? (
                          'Active'
                        ) : (
                          <span className="text-red-500">Retired</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <Button
                          type="button"
                          onClick={() => {
                            setEditingId(row.id);
                            setEditDraft({
                              name: row.name || '',
                              mobile: row.mobile || '',
                              address: row.address || '',
                            });
                          }}
                          className="mr-2 rounded-sm p-1 text-indigo-600 hover:bg-gray-100"
                          title="Edit"
                        >
                          <FiEdit2 />
                        </Button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(row)}
                          className="text-xs text-gray-600 hover:underline dark:text-gray-300"
                        >
                          {Number(row.status) === 1 ? 'Retire' : 'Reactivate'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500 dark:text-gray-400">
                    {loading ? 'Loading…' : 'No referrers yet.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReferrerMasterModal;
