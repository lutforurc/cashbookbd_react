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
  placeholder?: string; // Placeholder text for the date picker input
}

const InputDatePicker: React.FC<DatePickerProps> = ({ selectedDate, setSelectedDate, setCurrentDate, className, id, name, onKeyDown, label, placeholder }) => {
  const handleDateChange = (date: Date | null) => {
    // Update the startDate with the selected date
    if (date) {
      setSelectedDate(date); // Update the state with the selected date
      setCurrentDate(date);
    }
  };


  return (
    <div className='w-full'>
      <label className='text-gray-900 dark:text-white text-sm' htmlFor="">{label}</label>
      <DatePicker
        id={id}
        name={name || id}
        selected={selectedDate} // Default selected date
        onChange={handleDateChange} // Update state when a new date is selected
        dateFormat="dd/MM/yyyy" // Format for the date
        peekNextMonth
        placeholderText={placeholder ? placeholder : 'Enter Valid date'}
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