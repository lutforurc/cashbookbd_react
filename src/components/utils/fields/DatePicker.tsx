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
  /** Also pick a time — for fields that schedule something, not just date it. */
  showTime?: boolean;
  disabled?: boolean;
}

const InputDatePicker: React.FC<DatePickerProps> = ({ selectedDate, setSelectedDate, setCurrentDate, className, id, name, onKeyDown, label, placeholder, month = false, showTime = false, disabled = false }) => {
  const datePickerRef = React.useRef<DatePicker>(null);
  const safeSelectedDate =
    selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime()) ? selectedDate : null;

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    setCurrentDate(date);

    // With a time to pick as well, closing on the first click would end the
    // job halfway — the calendar stays open until the clock is set too.
    if (!showTime) {
      datePickerRef.current?.setOpen(false);
    }
  };

  const openCalendar = () => {
    if (disabled) return;
    window.setTimeout(() => {
      datePickerRef.current?.setOpen(true);
    }, 0);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const today = new Date();
      setSelectedDate(today);
      setCurrentDate(today);
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
        onChange={handleDateChange} // Update state when a new date is selected
        onFocus={openCalendar}
        onInputClick={openCalendar}
        dateFormat={month ? 'MMM yyyy' : showTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'} // Format for the date
        showTimeSelect={showTime}
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        peekNextMonth
        placeholderText={placeholder ? placeholder : 'Enter Valid date'}
        wrapperClassName="w-full"
        popperClassName={month ? 'cashbook-month-picker-popper' : 'cashbook-date-picker-popper'}
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
      <style>
        {`
            .cashbook-date-picker-popper,
            .cashbook-month-picker-popper {
              z-index: 9999;
            }

            /* react-datepicker ships a light-only stylesheet, so on a dark page
               the calendar opened as a white card with black text — the one
               bright rectangle on the screen. Tailwind runs in class mode, so
               these hang off html.dark and leave the light theme untouched. */
            .dark .react-datepicker {
              background-color: #24303f;
              border-color: #3d4d60;
              color: #e5e7eb;
            }

            .dark .react-datepicker__header {
              background-color: #1d2a39;
              border-bottom-color: #3d4d60;
            }

            .dark .react-datepicker__current-month,
            .dark .react-datepicker-time__header,
            .dark .react-datepicker__day-name,
            .dark .react-datepicker__day,
            .dark .react-datepicker__month-text,
            .dark .react-datepicker__time-name {
              color: #e5e7eb;
            }

            /* Days spilling in from the neighbouring month stay legible but
               clearly not part of this month. */
            .dark .react-datepicker__day--outside-month {
              color: #7b8794;
            }

            .dark .react-datepicker__day:hover,
            .dark .react-datepicker__month-text:hover {
              background-color: #3d4d60;
              color: #fff;
            }

            .dark .react-datepicker__day--selected,
            .dark .react-datepicker__day--keyboard-selected,
            .dark .react-datepicker__month-text--selected,
            .dark .react-datepicker__month-text--keyboard-selected {
              background-color: rgb(59 130 246);
              color: #fff;
            }

            .dark .react-datepicker__day--today,
            .dark .react-datepicker__month-text--today {
              font-weight: 700;
              color: #93c5fd;
            }

            .dark .react-datepicker__day--disabled {
              color: #5a6472;
            }

            /* The time column that appears beside the calendar when a field
               schedules something rather than just dating it. */
            .dark .react-datepicker__time-container,
            .dark .react-datepicker__time-container .react-datepicker__time {
              background-color: #24303f;
              border-left-color: #3d4d60;
            }

            .dark .react-datepicker__time-list-item {
              color: #e5e7eb;
            }

            .dark .react-datepicker__time-list-item:hover {
              background-color: #3d4d60 !important;
            }

            .dark .react-datepicker__time-list-item--selected {
              background-color: rgb(59 130 246) !important;
              color: #fff;
            }

            /* The month and year selects sit inside the header and would
               otherwise render as white boxes on the dark card. */
            .dark .react-datepicker__month-select,
            .dark .react-datepicker__year-select,
            .dark .react-datepicker__month-year-select {
              background-color: #24303f;
              border: 1px solid #3d4d60;
              color: #e5e7eb;
            }

            .dark .react-datepicker__navigation-icon::before,
            .dark .react-datepicker__year-read-view--down-arrow,
            .dark .react-datepicker__month-read-view--down-arrow {
              border-color: #9aa5b1;
            }

            .dark .react-datepicker__navigation:hover *::before {
              border-color: #fff;
            }

            /* The little arrow joining the popup to the input. */
            .dark .react-datepicker__triangle::before {
              border-bottom-color: #3d4d60 !important;
              border-top-color: #3d4d60 !important;
            }

            .dark .react-datepicker__triangle::after {
              border-bottom-color: #1d2a39 !important;
              border-top-color: #24303f !important;
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
    </div>
  );
};
export default InputDatePicker
