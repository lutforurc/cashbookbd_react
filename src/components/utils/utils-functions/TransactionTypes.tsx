import React, { useState } from 'react';
import { FIELD_SELECT } from '../../../theme/fieldStyles';
import { Select } from '../fields/FormControls';

interface OrderProps {
  name?: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLSelectElement>) => void;
  className?: string;
  id?: string;
  value?: string;
  selectOption?: string;
}

const TransactionTypes: React.FC<OrderProps> = ({
  name,
  onChange,
  onKeyDown,
  className,
  id,
  value,
  selectOption = 'All Transactions',
}) => {
  const [selectedValue, setSelectedValue] = useState<string>("");

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedValue(event.target.value); // Update internal state
    onChange(event); // Trigger the parent's onChange handler
  };

  return (
    <Select
      onChange={handleChange}
      onKeyDown={onKeyDown}
      value={selectedValue} // Bind the selected value to state
      id={id}
      name={name}
      className={`${FIELD_SELECT} block p-2 text-sm ${className}`}
    >
      <option value="">
        {selectOption}
      </option>
      {/* acc_vr_type ids; the server matches them on the voucher prefix --
          1 is 1-, 2 is 2-. They were labelled Sales / Purchase, which is not
          what either value ever returned. */}
      <option value="1">Received</option>
      <option value="2">Payment</option>
      {/* 3 matches 3- and 10- (cash + credit sales), 4 matches 4- and 9-. */}
      <option value="3">Sales</option>
      <option value="4">Purchase</option>
    </Select>
  );
};

export default TransactionTypes;
