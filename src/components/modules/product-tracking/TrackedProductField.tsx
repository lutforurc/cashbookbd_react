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
 * "Select Product (Optional)" — Cash Received / Cash Payment row-এর জন্য।
 *
 * চেহারা ইচ্ছাকৃতভাবে পাশের Select Order ও Select Account-এর মতো: একই
 * react-select, একই উচ্চতা, একই dark-mode রং। native <select> দেখতে আলাদা
 * লাগত এবং ফর্মটি অসম্পূর্ণ মনে হতো।
 *
 * কোনো tracked product না থাকলে কিছুই render হয় না, তাই যেসব Company এই
 * feature ব্যবহার করে না তাদের ফর্ম হুবহু আগের মতোই থাকে।
 *
 * নাম `trackedProductId` — ফর্মে আগে থেকে থাকা `currentProduct` field-এর
 * সঙ্গে গুলিয়ে ফেলা যাবে না; সেটি account suggestion object, product নয়।
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
      <Select<Option, false>
        inputId={id}
        name={id}
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
        এই টাকা কোন পণ্যের বিপরীতে। খালি রাখলে হিসাব আগের মতোই থাকবে।
      </p>
    </div>
  );
};

export default TrackedProductField;
