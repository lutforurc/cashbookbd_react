import { FiSave } from 'react-icons/fi';

import InputElement from '../../utils/fields/InputElement';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

/**
 * A category being typed: its rate, and the four heads its money moves through.
 *
 * Lifted out of AssetCategoriesTab, which was carrying the list and the form at
 * once and could no longer be read end to end. The tab keeps what it is for —
 * reading the categories, saving one, removing one — and this keeps the boxes.
 * The same split AssetRegisterTab already makes with AssetCarePanel.
 *
 * ⚠️ IT OWNS NO STATE. The draft lives in the tab, because the tab is what
 * saves it and what has to blank it afterwards; a copy held here would be the
 * second answer to "what is being typed" and the two would part company the
 * first time an edit was opened from a row. Everything arrives through props
 * and every keystroke leaves through onChange.
 */

export interface AssetCategoryFormProps {
  /** The draft. Held by the tab — see the note above. */
  form: any;
  onChange: (next: any) => void;
  onSave: () => void;
  saving: boolean;
  /**
   * ⚠️ Two lists, and they are not interchangeable. The cost and the
   * accumulated depreciation belong to the balance sheet, the yearly charge and
   * the gain or loss on sale to the profit and loss. "Depreciation" is a word
   * that appears in both halves, and two heads pointed the wrong way round
   * would run the books backwards with nothing on screen looking odd.
   */
  balanceSheetHeads: any[];
  expenseHeads: any[];
}

/**
 * A chart head as a dropdown line.
 *
 * ⚠️ The first line is NAMED, not blank. "Not chosen yet" is a real state here
 * — a category saves perfectly well without its heads and simply cannot be
 * depreciated — so the box says which state it is in rather than looking
 * unfilled. It came across with the form because it is a label, not data.
 */
const headOptions = (heads: any[]) => [
  { id: '', name: 'Not chosen yet' },
  ...heads.map((head: any) => ({ id: head.id, name: `${head.name} — ${head.group_name}` })),
];

const AssetCategoryForm = ({
  form,
  onChange,
  onSave,
  saving,
  balanceSheetHeads,
  expenseHeads,
}: AssetCategoryFormProps) => {
  /** One field of the draft, leaving the rest alone. */
  const set = (field: string) => (event: any) =>
    onChange({ ...form, [field]: event.target.value });

  return (
    <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <InputElement
          id="asset_category_name"
          name="name"
          label="Category"
          placeholder="Vehicles"
          value={form.name}
          onChange={set('name')}
        />
        <InputElement
          id="asset_category_code"
          name="code"
          label="Code"
          placeholder="VEH"
          value={form.code ?? ''}
          onChange={set('code')}
          description="Optional. Handy on a sticker."
        />
        <InputElement
          id="asset_category_rate"
          name="rate"
          label="Rate %"
          type="number"
          min={0}
          max={100}
          placeholder="20"
          value={String(form.rate ?? '')}
          onChange={set('rate')}
          description="A year, of what the asset is still worth."
        />
        <InputElement
          id="asset_category_residual"
          name="residual_value"
          label="Stops at"
          type="number"
          min={0}
          value={String(form.residual_value ?? 1)}
          onChange={set('residual_value')}
          description="One taka, so the asset never vanishes off the books."
        />
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <DropdownCommon
          id="asset_coa4_id"
          name="asset_coa4_id"
          label="Asset head"
          data={headOptions(balanceSheetHeads)}
          value={form.asset_coa4_id}
          onChange={set('asset_coa4_id')}
          description="Where what it cost sits. Balance sheet."
        />
        <DropdownCommon
          id="accum_dep_coa4_id"
          name="accum_dep_coa4_id"
          label="Accumulated depreciation"
          data={headOptions(balanceSheetHeads)}
          value={form.accum_dep_coa4_id}
          onChange={set('accum_dep_coa4_id')}
          description="Grows underneath the asset. Balance sheet."
        />
        <DropdownCommon
          id="dep_expense_coa4_id"
          name="dep_expense_coa4_id"
          label="Depreciation charge"
          data={headOptions(expenseHeads)}
          value={form.dep_expense_coa4_id}
          onChange={set('dep_expense_coa4_id')}
          description="This year’s expense. Profit and loss."
        />
      </div>

      {/* ⚠️ THE FOURTH HEAD, AND IT ARRIVED LATE. The first three are what
          depreciation needs; this one is what SELLING needs, and a category
          can be perfectly able to depreciate and unable to dispose. Without
          it on this form there was no way to give a category its gain-or-loss
          head at all, so the disposal panel refused every sale with a
          message pointing at a box that did not exist. */}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <DropdownCommon
          id="disposal_coa4_id"
          name="disposal_coa4_id"
          label="Gain or loss on sale"
          data={headOptions(expenseHeads)}
          value={form.disposal_coa4_id}
          onChange={set('disposal_coa4_id')}
          description="Only needed to sell or write one off. Profit and loss."
        />
      </div>

      <div className="mt-2">
        <InputElement
          id="asset_category_notes"
          name="notes"
          label="Note"
          placeholder="Optional — where the rate came from"
          value={form.notes ?? ''}
          onChange={set('notes')}
        />
      </div>

      {/* ⚠️ The two things somebody typing a rate needs told, and neither is
          obvious from the form: the charge falls every year rather than
          staying flat, and a rate changed later does not reach back. */}
      <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        Reducing balance: 20% of 100,000 is 20,000 in the first full year and 16,000 in the next,
        because the second year is charged on 80,000. Changing a rate here reaches the next run —
        every year already charged keeps the rate it was charged at.
      </p>

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

export default AssetCategoryForm;
