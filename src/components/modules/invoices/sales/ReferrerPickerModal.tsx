import React, { useEffect, useState } from 'react';
import { FiPlus, FiSave, FiX } from 'react-icons/fi';
import Select, { StylesConfig } from 'react-select';
import { toast } from 'react-toastify';

import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import useLocalStorage from '../../../../hooks/useLocalStorage';
import httpService from '../../../services/httpService';
import { API_REFERRERS_URL } from '../../../services/apiRoutes';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../../theme/fieldStyles';

const BLANK = { name: '', mobile: '', address: '' };

type Option = { value: string; label: string };

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
 * The list is kept on the report screen, and a new name can be added from here
 * as well -- standing at the counter with a bill half entered, being sent to a
 * report screen to add the person would be absurd. Both places write the same
 * list through the same route.
 */
const ReferrerPickerModal: React.FC<ReferrerPickerModalProps> = ({
  isOpen,
  onClose,
  onPick,
  selectedId,
}) => {
  const [darkMode] = useLocalStorage('color-theme', 'light');
  const isDark = darkMode === 'dark';
  const [rows, setRows] = useState<{ id: number | string; name: string }[]>([]);
  const [picked, setPicked] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);

    return httpService
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
      .catch((error: any) => {
        if (!error?.toastReported) toast.error('Could not read the referrer list.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;

    setPicked(selectedId || '');
    setAdding(false);
    setDraft({ ...BLANK });
    load();
  }, [isOpen, selectedId]);

  // A name given here is added to the list and picked at once: the bill being
  // written is the reason it was typed.
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
        const id = response?.data?.data?.data?.id;

        toast.success(response?.data?.message || 'Referrer added.');
        setDraft({ ...BLANK });
        setAdding(false);
        if (id) setPicked(String(id));
        load();
      })
      .catch((error: any) => {
        if (!error?.toastReported) toast.error(error?.response?.data?.message || 'Could not add the referrer.');
      })
      .finally(() => setSaving(false));
  };

  if (!isOpen) return null;

  // A searchable box, not the native <select> this started as: a shop with a
  // hundred names on the list had to scroll a dropdown to find one, and reading
  // down a list is how the wrong name gets picked. Typing two letters of either
  // the name or the mobile (both are in the label) narrows it instead.
  //
  // The skin is the one every other react-select in the app wears -- the
  // container class and prefix are what apply it (see css/style.css).
  const options: Option[] = [
    { value: '', label: '— none —' },
    ...rows.map((row) => ({ value: String(row.id), label: row.name })),
  ];

  const styles: StylesConfig<Option, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: FIELD_HEIGHT_REM,
      height: FIELD_HEIGHT_REM,
      borderRadius: '0.0rem',
      borderColor: state.isFocused ? 'rgb(var(--c-blue-500))' : isDark ? 'rgb(var(--c-strokedark))' : 'rgb(var(--c-gray-300))',
      backgroundColor: isDark ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))',
      color: isDark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      boxShadow: state.isFocused ? '0 0 0 1px rgb(var(--c-blue-500))' : '',
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: state.isFocused ? 'rgb(var(--c-blue-500))' : isDark ? 'rgb(var(--c-strokedark))' : 'rgb(var(--c-gray-300))',
      },
    }),
    valueContainer: (base) => ({ ...base, height: FIELD_HEIGHT_REM, padding: '0 0.5rem' }),
    indicatorsContainer: (base) => ({ ...base, height: FIELD_HEIGHT_REM }),
    singleValue: (base) => ({ ...base, color: isDark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))' }),
    input: (base) => ({ ...base, color: isDark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))', margin: 0, padding: 0 }),
    placeholder: (base) => ({ ...base, color: 'rgb(var(--c-gray-400))' }),
    menu: (base) => ({
      ...base,
      zIndex: 1000,
      backgroundColor: isDark ? 'rgb(var(--c-graydark))' : 'rgb(var(--c-white))',
      borderColor: isDark ? 'rgb(var(--c-bodydark2))' : 'rgb(var(--c-black-2))',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      whiteSpace: 'normal',
      fontSize: '0.8rem',
      backgroundColor: isFocused
        ? isDark
          ? 'rgb(var(--c-graydark))'
          : 'rgb(var(--c-gray-200))'
        : isSelected
          ? isDark
            ? 'rgb(var(--c-gray-600))'
            : 'rgb(var(--c-gray-300))'
          : isDark
            ? 'rgb(var(--c-form-input))'
            : 'rgb(var(--c-white))',
      color: isDark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      '&:hover': {
        backgroundColor: isDark ? 'rgb(var(--c-gray-600))' : 'rgb(var(--c-gray-300))',
        color: isDark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
      },
    }),
  };

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
          <label
            htmlFor="referrer_id"
            className="text-left text-sm text-black dark:text-white"
          >
            Select Reference
          </label>
          <Select<Option, false>
            inputId="referrer_id"
            name="referrer_id"
            className="cash-react-select-container w-full"
            classNamePrefix="cash-react-select"
            options={options}
            value={options.find((option) => option.value === picked) ?? null}
            placeholder="Type a name or mobile"
            styles={withFieldHeight(styles)}
            menuPortalTarget={document.body}
            // The popup exists to pick a name, so the box starts ready to type
            // into -- one click less, every bill.
            autoFocus
            onChange={(option) => setPicked(option ? option.value : '')}
          />
          {loading ? <p className="mt-2 text-xs text-gray-500">Loading…</p> : null}
          {!loading && !rows.length ? (
            <p className="mt-2 text-xs text-gray-500">
              Nobody on the list yet.
            </p>
          ) : null}

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {adding ? 'Cancel' : '+ New reference'}
            </button>
          </div>

          {adding ? (
            <div className="mt-2 rounded-sm border border-[rgb(var(--c-border))] p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <InputElement
                  id="new_referrer_name"
                  name="name"
                  label="Name"
                  placeholder="Name"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  onKeyDown={(event) => event.key === 'Enter' && add()}
                />
                <InputElement
                  id="new_referrer_mobile"
                  name="mobile"
                  label="Mobile"
                  placeholder="Mobile"
                  value={draft.mobile}
                  onChange={(event) => setDraft((prev) => ({ ...prev, mobile: event.target.value }))}
                />
              </div>

              <div className="mt-2">
                <InputElement
                  id="new_referrer_address"
                  name="address"
                  label="Address"
                  placeholder="Address"
                  value={draft.address}
                  onChange={(event) => setDraft((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>

              <div className="mt-2 flex justify-end">
                <ButtonLoading
                  onClick={add}
                  buttonLoading={saving}
                  label="Add"
                  className="whitespace-nowrap text-center"
                  icon={<FiPlus className="text-lg ml-2 mr-2" />}
                />
              </div>
            </div>
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
