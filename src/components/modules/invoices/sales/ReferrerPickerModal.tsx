import React, { useEffect, useState } from 'react';
import { FiSave, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import httpService from '../../../services/httpService';
import { API_REFERRERS_URL } from '../../../services/apiRoutes';

interface ReferrerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The referrer chosen, or '' when the bill is to name nobody. */
  onPick: (referrerId: string) => void;
  selectedId: string;
}

/**
 * Who recommended this sale.
 *
 * ⚠️ THIS POPUP IS THE ONLY PLACE THE NAME EVER SHOWS. The invoice itself keeps
 * a switch and nothing else -- the customer stands at the counter and reads
 * that screen, and the owner asked for this to be kept from them. So do not add
 * the name to the form, to the paper, or to the print payload.
 *
 * The list is kept on the report screen; this only picks from it. A referrer
 * nobody has added yet is added there, which is the owner's own arrangement --
 * one screen that both reads the account and keeps the list.
 */
const ReferrerPickerModal: React.FC<ReferrerPickerModalProps> = ({
  isOpen,
  onClose,
  onPick,
  selectedId,
}) => {
  const [rows, setRows] = useState<{ id: number | string; name: string }[]>([]);
  const [picked, setPicked] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPicked(selectedId || '');
    setLoading(true);

    httpService
      .get(API_REFERRERS_URL)
      .then((response: any) => {
        const list = response?.data?.data?.data?.rows ?? response?.data?.data?.rows ?? [];

        // Retired referrers stay in the report's history but are not offered
        // at the counter.
        setRows(
          (Array.isArray(list) ? list : [])
            .filter((row: any) => Number(row.status) === 1)
            .map((row: any) => ({
              id: row.id,
              name: row.mobile ? `${row.name} — ${row.mobile}` : row.name,
            })),
        );
      })
      .catch(() => toast.error('Could not read the referrer list.'))
      .finally(() => setLoading(false));
  }, [isOpen, selectedId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="w-full max-w-md rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
            Reference
          </h3>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <FiX className="text-lg" />
          </Button>
        </div>

        <div className="p-4">
          <DropdownCommon
            id="referrer_id"
            name="referrer_id"
            label="Select Reference"
            value={picked}
            onChange={(event) => setPicked(event.target.value)}
            className="bg-transparent"
            data={[{ id: '', name: '— none —' }, ...rows]}
          />
          {loading ? <p className="mt-2 text-xs text-gray-500">Loading…</p> : null}
          {!loading && !rows.length ? (
            <p className="mt-2 text-xs text-gray-500">
              The list is empty. Add one on the Sales Referrer report.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-[rgb(var(--c-border))] px-4 py-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={() => {
              onPick('');
              onClose();
            }}
            className="rounded-sm border border-[rgb(var(--c-border))] px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Remove
          </Button>
          <ButtonLoading
            onClick={() => {
              onPick(picked);
              onClose();
            }}
            buttonLoading={false}
            label="Save"
            className="whitespace-nowrap text-center"
            icon={<FiSave className="text-lg ml-2 mr-2" />}
          />
        </div>
      </div>
    </div>
  );
};

export default ReferrerPickerModal;
