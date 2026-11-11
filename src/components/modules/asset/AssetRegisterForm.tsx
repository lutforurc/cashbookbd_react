import { FiSave } from 'react-icons/fi';

import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import DdlMultiline from '../../utils/utils-functions/DdlMultiline';
import ToggleSwitch from '../../utils/utils-functions/ToggleSwitch';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { money } from '../hotel/setupHelpers';

/**
 * An asset being typed: what it is, what it cost, and what the old books had
 * already charged against it.
 *
 * Lifted out of AssetRegisterTab, which was carrying the list, the disposal
 * panel, the label printing and this at once. The tab keeps what it is for —
 * reading the register, saving a row, removing one, selling one — and this
 * keeps the boxes. The same split the tab already makes with AssetCarePanel.
 *
 * ⚠️ IT OWNS NO STATE. The draft lives in the tab, because the tab is what
 * saves it and what has to blank it afterwards; a copy held here would be the
 * second answer to "what is being typed" and the two would part company the
 * first time an edit was opened from a row. Everything arrives through props
 * and every keystroke leaves through onChange.
 *
 * ⚠️ `locked` IS THE SERVER'S ANSWER, not this form's guess. Cost and the
 * brought-forward figures are frozen once a year has been charged against the
 * asset, because a schedule already footed on them would stop footing. The tab
 * reads the flag off the row; nothing here decides it.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a purchase date is a calendar date, and
  // going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

export interface AssetRegisterFormProps {
  /** The draft. Held by the tab — see the note above. */
  form: any;
  onChange: (next: any) => void;
  onSave: () => void;
  saving: boolean;
  /**
   * The tab's own filter list, which opens with "Every category" — a filter
   * word, and nonsense on a form. Replaced below rather than rebuilt, so the
   * rates shown here and in the filter cannot drift apart.
   */
  categoryOptions: { id: any; name: string }[];
}

const AssetRegisterForm = ({
  form,
  onChange,
  onSave,
  saving,
  categoryOptions,
}: AssetRegisterFormProps) => {
  /** One field of the draft, leaving the rest alone. */
  const set = (field: string) => (event: any) =>
    onChange({ ...form, [field]: event.target.value });

  /** A date field, stored as text the server's way. */
  const setDate = (field: string) => (date: Date | null) =>
    onChange({ ...form, [field]: asText(date) });

  // What the voucher would say if this were saved. The same three legs the
  // server writes, in the same order, so the figures can be read before they
  // are posted rather than after.
  const cost = Number(form.cost || 0);
  const opening = Number(form.opening_accum_dep || 0);
  const net = Math.max(Math.round((cost - opening) * 100) / 100, 0);
  const categoryName =
    categoryOptions.find((one) => Number(one.id) === Number(form.category_id))?.name ??
    'the category';

  return (
    <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <InputElement
          id="asset_code"
          name="code"
          label="Code"
          placeholder="VEH-001"
          value={form.code}
          onChange={set('code')}
          description="What goes on the sticker."
        />
        <div className="md:col-span-2">
          <InputElement
            id="asset_name"
            name="name"
            label="Asset"
            placeholder="Toyota Hiace, Dhaka Metro Ga 11-2233"
            value={form.name}
            onChange={set('name')}
          />
        </div>
        <DropdownCommon
          id="asset_category"
          name="category_id"
          label="Category"
          data={[{ id: '', name: 'Choose one' }, ...categoryOptions.slice(1)]}
          value={form.category_id}
          onChange={set('category_id')}
          description="The rate comes from here."
        />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
        <InputDatePicker
          id="asset_purchase_date"
          name="purchase_date"
          label="Bought on"
          selectedDate={asDate(form.purchase_date)}
          setSelectedDate={setDate('purchase_date')}
          setCurrentDate={() => undefined}
          className="w-full"
        />
        <InputElement
          id="asset_cost"
          name="cost"
          label="Cost"
          type="number"
          min={0}
          value={String(form.cost ?? '')}
          onChange={set('cost')}
          disabled={form.locked}
          description={
            form.locked
              ? 'Frozen — depreciation has been charged against this asset.'
              : form.in_books
                ? 'Changing this replaces the journal behind it.'
                : 'What it cost.'
          }
        />
        <InputElement
          id="asset_serial"
          name="serial_no"
          label="Serial no"
          value={form.serial_no ?? ''}
          onChange={set('serial_no')}
        />
        <InputElement
          id="asset_location"
          name="location"
          label="Where it is"
          placeholder="Head office, second floor"
          value={form.location ?? ''}
          onChange={set('location')}
        />
      </div>

      {/* ⚠️ THE HALF THAT POSTS NOTHING, and it says so. An asset carried
          over from the old books is already in the ledger; these two boxes
          are what this system has to be told so that its own arithmetic
          starts in the right place. */}
      <div className="mt-3 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="mb-2 text-sm font-medium text-black dark:text-white">
          Brought forward from the old books
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <InputElement
            id="asset_opening_dep"
            name="opening_accum_dep"
            label="Depreciation so far"
            type="number"
            min={0}
            value={String(form.opening_accum_dep ?? '')}
            onChange={set('opening_accum_dep')}
            disabled={form.locked}
            description="What has already been charged against it."
          />
          <div>
            <InputDatePicker
              id="asset_opening_as_on"
              name="opening_as_on"
              label="As on"
              selectedDate={asDate(form.opening_as_on)}
              setSelectedDate={setDate('opening_as_on')}
              setCurrentDate={() => undefined}
              className="w-full"
            />
            <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
              The day that figure was true.
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
              Leave both empty for something bought new. For an asset carried over, enter what it{' '}
              <strong>originally cost</strong> above and what has been charged against it here —
              not what it is worth now.
              <br />
              <strong>Nothing is posted from here unless you ask.</strong> Where the old books&rsquo;
              opening entries already put these figures in the ledger, leave them be; the tick
              below is for the case where they were never posted.
            </p>
          </div>
        </div>
      </div>

      {/* ⚠️ POSTED IS NOT FROZEN — ONLY CHARGED IS. A row with depreciation
          against it cannot be re-figured, so it offers nothing here. An
          unposted row can be posted on the spot; a posted one says what saving
          will do to the journal it already has. */}
      {!form.locked ? (
        <div className="mt-3 rounded border border-stroke p-3 dark:border-strokedark">
          {form.in_books ? (
            <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
              <strong className="text-black dark:text-white">This asset is in the books.</strong>{' '}
              Change any figure above and saving replaces its journal: the old voucher is withdrawn
              and a new number is issued, keeping the same other side. Type a wrong number and the
              books follow the corrected one.
            </p>
          ) : (
            <>
              <ToggleSwitch
                label="Post this to the books"
                checked={!!form.post_to_books}
                onChange={(checked) => onChange({ ...form, post_to_books: checked })}
              />
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Leave it unticked where the figures are already in the ledger from the old
                books&rsquo; opening entries — posting them again would double both.
              </p>
            </>
          )}

          {!form.in_books && form.post_to_books ? (
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
              <div className="md:col-span-2">
                <label htmlFor="asset_counter" className="mb-1 block text-sm text-black dark:text-white">
                  Counter account *
                </label>
                <DdlMultiline
                  id="asset_counter"
                  name="counter_coa4_id"
                  placeholder="Capital, a loan, a supplier…"
                  // ⚠️ Income, expense and manufacturing are never the other
                  // side of an asset arriving. Assets and liabilities are --
                  // capital, a director's loan, the bank that paid, or the
                  // supplier owed it. `acType` is an EXCLUDE list of level-1 ids.
                  acType={['3', '4', '5']}
                  minChars={2}
                  value={
                    form.counter_coa4_id
                      ? { value: form.counter_coa4_id, label: form.counter_label || String(form.counter_coa4_id) }
                      : null
                  }
                  onSelect={(option: any) =>
                    onChange({
                      ...form,
                      counter_coa4_id: option ? String(option.value) : '',
                      counter_label: option ? String(option.label) : '',
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                  The voucher will be:{' '}
                  <strong>Dr {categoryName}</strong> {money(cost)}
                  {opening > 0 ? (
                    <>
                      {' '}· <strong>Cr Accumulated Depreciation</strong> {money(opening)}
                    </>
                  ) : null}
                  {net > 0 ? (
                    <>
                      {' '}· <strong>Cr {form.counter_label || 'the counter account'}</strong>{' '}
                      {money(net)}
                    </>
                  ) : null}
                  .
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2">
        <InputElement
          id="asset_notes"
          name="notes"
          label="Note"
          placeholder="Optional"
          value={form.notes ?? ''}
          onChange={set('notes')}
        />
      </div>

      <div className="mt-3">
        <ButtonLoading
          onClick={onSave}
          buttonLoading={saving}
          icon={<FiSave className="h-5 w-5" />}
          label="Save"
          variant="primary"
        />
      </div>
    </div>
  );
};

export default AssetRegisterForm;
