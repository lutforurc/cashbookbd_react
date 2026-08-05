import React from 'react';
import Select, { StylesConfig } from 'react-select';
import useLocalStorage from '../../../hooks/useLocalStorage';
import { TrackedProduct } from './useTrackedProducts';

interface Props {
  id?: string;
  value?: number | string | null;
  products: TrackedProduct[];
  onChange: (productId: number | null) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  label?: string;
}

type Option = { value: string; label: string };

/**
 * "Select Product (Optional)" -- for a Cash Received / Cash Payment row.
 *
 * It deliberately looks like the Select Order and Select Account beside it:
 * the same react-select, the same height, the same dark-mode colours. A native
 * <select> looked different and left the form feeling half-finished.
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
      minHeight: '2.1rem',
      height: '2.1rem',
      borderRadius: '0.0rem',
      borderColor: state.isFocused ? 'rgb(59 130 246)' : isDark ? '#363843' : '#d2d6dc',
      backgroundColor: isDark ? '#1f212a' : '#fcfcfc',
      color: isDark ? '#fff' : '#000',
      boxShadow: state.isFocused ? '0 0 0 1px rgb(59 130 246)' : '',
      fontSize: '0.9rem',
      '&:hover': {
        borderColor: state.isFocused ? 'rgb(59 130 246)' : isDark ? '#363843' : '#d2d6dc',
      },
    }),
    valueContainer: (base) => ({ ...base, height: '2.1rem', padding: '0 0.5rem' }),
    indicatorsContainer: (base) => ({ ...base, height: '2.1rem' }),
    singleValue: (base) => ({ ...base, color: isDark ? '#fff' : '#000' }),
    input: (base) => ({ ...base, color: isDark ? '#fff' : '#000', margin: 0, padding: 0 }),
    placeholder: (base) => ({ ...base, color: isDark ? '#9ca3af' : '#9ca3af' }),
    menu: (base) => ({
      ...base,
      zIndex: 1000,
      backgroundColor: isDark ? '#3b3e47' : '#fff',
      borderColor: isDark ? '#808290' : '#000',
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      whiteSpace: 'normal',
      fontSize: '0.8rem',
      backgroundColor: isFocused
        ? isDark
          ? '#3b3e47'
          : '#E5E7EB'
        : isSelected
          ? isDark
            ? '#50535e'
            : '#d1d5db'
          : isDark
            ? '#1f212a'
            : '#fff',
      color: isDark ? '#fff' : '#000',
      '&:hover': {
        backgroundColor: isDark ? '#50535e' : '#d1d5db',
        color: isDark ? '#fff' : '#000',
      },
    }),
  };

  return (
    <div>
      <label htmlFor={id} className="dark:text-white text-left text-sm text-gray-900">
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
        styles={styles}
        menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
        onKeyDown={onKeyDown}
        onChange={(option) => onChange(option ? Number(option.value) : null)}
      />
      <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
        Which product this money is against. Left empty, the figures stay as they were.
      </p>
    </div>
  );
};

export default TrackedProductField;
