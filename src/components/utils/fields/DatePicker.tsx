import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  id?: string; // ID for the date picker component
  name?: string; // Name for the date picker component
  selectedDate?: Date | null;
  setSelectedDate: (date: Date | null) => void;
  setCurrentDate: (date: Date | null) => void;
  className?: string; // Additional class name for the date picker component (optional)
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void; // Optional onKeyDown prop
  label?: string; // Label for the date picker component
  placeholder?: string; // Placeholder text for the date picker input
  month?: boolean; // Show month/year picker instead of date picker
  disabled?: boolean;
}

const InputDatePicker: React.FC<DatePickerProps> = ({ selectedDate, setSelectedDate, setCurrentDate, className, id, name, onKeyDown, label, placeholder, month = false, disabled = false }) => {
  const datePickerRef = React.useRef<DatePicker>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const safeSelectedDate =
    selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime()) ? selectedDate : null;

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const today = new Date();
      setSelectedDate(today);
      setCurrentDate(today);
      setIsOpen(false);
      datePickerRef.current?.setOpen(false);
    }

    onKeyDown?.(event);
  };

  return (
    <div className='w-full'>
      <label className='text-gray-900 dark:text-white text-sm' htmlFor="">{label}</label>
      <DatePicker
        ref={datePickerRef}
        id={id}
        name={name || id}
        selected={safeSelectedDate}
        open={isOpen}
        onChange={handleDateChange} // Update state when a new date is selected
        onFocus={() => setIsOpen(true)}
        onClickOutside={() => setIsOpen(false)}
        onCalendarClose={() => setIsOpen(false)}
        dateFormat={month ? 'MMM yyyy' : 'dd/MM/yyyy'} // Format for the date
        peekNextMonth
        placeholderText={placeholder ? placeholder : 'Enter Valid date'}
        wrapperClassName="w-full"
        popperClassName={month ? 'cashbook-month-picker-popper' : undefined}
        calendarClassName={month ? 'cashbook-month-picker' : undefined}
        dropdownMode="select"
        onKeyDown={handleKeyDown}
        shouldCloseOnSelect
        disabled={disabled}
        className={`dark:placeholder-gray-500 rounded-xs border pl-3 text-black outline-none  dark:border-form-strokedark bg-white dark:bg-transparent dark:text-white focus:outline-none 
        focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
        showMonthYearPicker={month}
        showMonthDropdown={!month}
        showYearDropdown
      />
      {month ? (
        <style>
          {`
            .cashbook-month-picker-popper {
              z-index: 9999;
            }

            .cashbook-month-picker {
              width: 320px;
              border-radius: 2px;
              font-size: 14px;
            }

            .cashbook-month-picker .react-datepicker__month-container {
              width: 100%;
            }

            .cashbook-month-picker .react-datepicker__header {
              padding: 10px 0 8px;
            }

            .cashbook-month-picker .react-datepicker__current-month {
              font-size: 16px;
              font-weight: 700;
            }

            .cashbook-month-picker .react-datepicker__month {
              margin: 10px 14px 14px;
            }

            .cashbook-month-picker .react-datepicker__month-wrapper {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 8px;
            }

            .cashbook-month-picker .react-datepicker__month-text {
              width: auto;
              margin: 0;
              padding: 7px 0;
              border-radius: 4px;
            }
          `}
        </style>
      ) : null}
    </div>
  );
};
export default InputDatePicker
