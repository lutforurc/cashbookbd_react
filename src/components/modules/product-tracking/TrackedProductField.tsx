import React from 'react';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { TrackedProduct } from './useTrackedProducts';

interface Props {
  id?: string;
  value?: number | string | null;
  products: TrackedProduct[];
  onChange: (productId: number | null) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  label?: string;
}

/**
 * "Select Product (Optional)" — Cash Received / Cash Payment row-এর জন্য।
 *
 * কোনো tracked product না থাকলে কিছুই render হয় না, তাই যেসব Company এই
 * feature ব্যবহার করে না তাদের form হুবহু আগের মতোই থাকে।
 *
 * নাম `trackedProductId` — form-এ আগে থেকে থাকা `currentProduct` field-এর
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
  if (products.length === 0) {
    return null;
  }

  const options = [
    { id: '', name: '-- No Product --' },
    ...products.map((product) => ({
      id: product.id,
      name: product.is_active ? product.name : `${product.name} (inactive)`,
    })),
  ];

  return (
    <DropdownCommon
      id={id}
      name={id}
      label={label}
      value={value ? String(value) : ''}
      data={options}
      onChange={(event) => {
        const selected = event.target.value;
        onChange(selected ? Number(selected) : null);
      }}
      onKeyDown={onKeyDown}
      description="এই টাকা কোন পণ্যের বিপরীতে, তা Product Financial Statement-এ দেখানোর জন্য। খালি রাখলে হিসাব আগের মতোই থাকবে।"
    />
  );
};

export default TrackedProductField;
