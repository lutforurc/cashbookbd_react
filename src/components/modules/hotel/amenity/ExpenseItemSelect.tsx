import Select, { StylesConfig } from 'react-select';
import useLocalStorage from '../../../../hooks/useLocalStorage';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../../theme/fieldStyles';

/**
 * Pick one expense item (Assets → Items, kind Expense) -- meat, soap, shampoo.
 *
 * ⚠️ NOT THE PRODUCT DROPDOWN. That one searches product_items, the shop's stock;
 * the hotel's store now holds expense items instead. The list is a few dozen
 * rows, loaded once by the screen (with what is on hand) and searched here as
 * typed -- no round trip per letter.
 */
export type ExpenseItem = {
  id: number;
  name: string;
  code?: string | null;
  head_name?: string | null;
  unit_name?: string | null;
  on_hand?: number;
};

type Props = {
  id?: string;
  items: ExpenseItem[];
  value: number | string | null;
  onSelect: (item: ExpenseItem | null) => void;
  /** Show "on hand" beside each name -- the issue screen wants it, the kit does not. */
  showOnHand?: boolean;
  placeholder?: string;
};

const ExpenseItemSelect = ({ id, items, value, onSelect, showOnHand, placeholder }: Props) => {
  const [themeMode] = useLocalStorage('color-theme', 'light');
  const dark = themeMode === 'dark';

  const options = items.map((item) => ({ value: item.id, label: item.name, item }));
  const selected = options.find((option) => Number(option.value) === Number(value)) ?? null;

  const styles: StylesConfig<any> = {
    control: (base, state) => ({
      ...base,
      minHeight: FIELD_HEIGHT_REM,
      borderRadius: 0,
      boxShadow: 'none',
      fontSize: '0.9rem',
      borderColor: state.isFocused
        ? 'rgb(var(--c-blue-500))'
        : dark
          ? 'rgb(var(--c-strokedark))'
          : 'rgb(var(--c-gray-300))',
      backgroundColor: dark ? 'rgb(var(--c-form-input))' : 'rgb(var(--c-gray-3))',
    }),
    menu: (base) => ({
      ...base,
      zIndex: 1000,
      backgroundColor: dark ? 'rgb(var(--c-graydark))' : 'rgb(var(--c-white))',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 1000 }),
    option: (base, { isFocused }) => ({
      ...base,
      fontSize: '0.85rem',
      backgroundColor: isFocused
        ? dark
          ? 'rgb(var(--c-gray-600))'
          : 'rgb(var(--c-gray-200))'
        : 'transparent',
      color: dark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))',
    }),
    singleValue: (base) => ({ ...base, color: dark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))' }),
    input: (base) => ({ ...base, color: dark ? 'rgb(var(--c-white))' : 'rgb(var(--c-black-2))' }),
  };

  return (
    <Select
      inputId={id}
      options={options}
      value={selected}
      isClearable
      placeholder={placeholder ?? 'Select item'}
      onChange={(option: any) => onSelect(option?.item ?? null)}
      // Name, code and head all match what is typed.
      filterOption={(option: any, input: string) => {
        const term = input.trim().toLowerCase();
        const item: ExpenseItem = option.data.item;
        return (
          !term ||
          [item.name, item.code, item.head_name].some((text) =>
            String(text ?? '').toLowerCase().includes(term),
          )
        );
      }}
      formatOptionLabel={(option: any, { context }) =>
        context === 'menu' ? (
          <div className="flex items-baseline justify-between gap-3">
            <span>
              {option.item.name}
              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                {option.item.head_name}
              </span>
            </span>
            {showOnHand ? (
              <span
                className={`text-xs tabular-nums ${
                  Number(option.item.on_hand) < 0 ? 'text-rose-600' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {Number(option.item.on_hand ?? 0)} {option.item.unit_name ?? ''}
              </span>
            ) : null}
          </div>
        ) : (
          option.item.name
        )
      }
      styles={withFieldHeight(styles)}
      menuPortalTarget={document.body}
    />
  );
};

export default ExpenseItemSelect;
