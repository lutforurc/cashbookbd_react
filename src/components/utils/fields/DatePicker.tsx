import React, { useState } from 'react';
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
}

const InputDatePicker: React.FC<DatePickerProps> = ({ selectedDate, setSelectedDate, setCurrentDate, className, id, name, onKeyDown, label }) => {
  const handleDateChange = (date: Date | null) => {
    // Update the startDate with the selected date
    if (date) {
      setSelectedDate(date); // Update the state with the selected date
      setCurrentDate(date);
    }
  };


  return (
    <div className='w-full'>
      <label htmlFor="">{label}</label>
      <DatePicker
        id={id}
        name={name || id}
        selected={selectedDate} // Default selected date
        onChange={handleDateChange} // Update state when a new date is selected
        dateFormat="dd/MM/yyyy" // Format for the date
        peekNextMonth
        placeholderText={label ? label : 'Enter Valid date'}
        wrapperClassName="w-full"
        dropdownMode="select"
        onKeyDown={onKeyDown ?? (() => {})} // Pass it to the input
        className={`dark:placeholder-gray-500 rounded-xs border pl-3 text-black outline-none  dark:border-form-strokedark bg-white dark:bg-transparent dark:text-white focus:outline-none 
        focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 ${className}`}
        showMonthDropdown
        showYearDropdown
      />
    </div>
  );
};
export default InputDatePicker