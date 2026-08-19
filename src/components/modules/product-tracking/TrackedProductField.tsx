import React from 'react';
import Select, { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { TrackedProduct } from './useTrackedProducts';
import { Select as FormSelect } from '../../utils/fields/FormControls';
import { FIELD_HEIGHT_REM, withFieldHeight } from '../../../theme/fieldStyles';

interface Props {
  id?: string;
  value?: number | string | null;
  products: TrackedProduct[];
  onChange: (productId: number | null) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  label?: string;
  /**
   * The line under the box. A voucher row asks which product the money is
   * against; an invoice asks which product the invoice is against. Same field,
   * different sentence, so the caller supplies it.
   */
  helpText?: string;
}

type Option = { value: string; label: string };

/**
 * "Select Product (Optional)" -- for a Cash Received / Cash Payment row.
 *
 * It deliberately looks like the Select Order and Select Account beside it:
 * the same react-select, the same height, the same dark-mode colours. A native
 * <FormSelect> looked different and left the form feeling half-finished.
 *
 * With no tracked product it renders nothing, so a company not using this
 * feature keeps exactly the form it had before.
 *
 * The name is `trackedProductId` -- not to be confused with the form's existing
 * `currentProduct` field, which is an account suggestion object, not a product.
 */
const TrackedProductField: React.FC<Props> = ({
  id = 'trackedProductId',
  value,
  products,
  onChange,
  onKeyDown,
  label = 'Select Product (Optional)',
  helpText = 'Which product this money is against. Left empty, the figures stay as they were.',
}) => {
  const [darkMode] = useLocalStorage('color-theme', 'light');
  const isDark = darkMode === 'dark';

  if (products.length === 0) {
    return null;
  }

  const options: Option[] = products.map((product) => ({
    value: String(product.id),
    label: product.is_active ? product.name : `${product.name} (inactive)`,
  }));

  const selected = options.find((option) => option.value === String(value ?? '')) ?? null;

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
    placeholder: (base) => ({ ...base, color: isDark ? 'rgb(var(--c-gray-400))' : 'rgb(var(--c-gray-400))' }),
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
    <div>
      <label htmlFor={id} className="dark:text-[rgb(var(--c-text))] text-left text-sm text-gray-900">
        {label}
      </label>
      {/* The container class and the prefix are what put this box on the same
          react-select skin as Select Order and Select Account beside it -- the
          rules for it live in css/style.css under .cash-react-select-container.
          Without them this was the one field on the row styling itself alone,
          and it sat on a visibly different background. */}
      <Select<Option, false>
        inputId={id}
        name={id}
        className="cash-react-select-container w-full"
        classNamePrefix="cash-react-select"
        options={options}
        value={selected}
        isClearable
        placeholder="-- No Product --"
        styles={withFieldHeight(styles)}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        onKeyDown={onKeyDown}
        onChange={(option) => onChange(option ? Number(option.value) : null)}
      />
      <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
        {helpText}
      </p>
    </div>
  );
};

export default TrackedProductField;
