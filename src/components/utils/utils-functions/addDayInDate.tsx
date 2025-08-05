// utils/addDayInDate.ts
export const addDayInDate = (transaction_date: string, daysToAdd: number): string => {
    // Parse the date string "DD/MM/YYYY"
    const [day, month, year] = transaction_date.split("/").map(Number);
    const date = new Date(year, month - 1, day); // Convert to a Date object
  
    // Add the specified number of days
    date.setDate(date.getDate() + daysToAdd);
  
    // Format back to "DD/MM/YYYY"
    const newDay = String(date.getDate()).padStart(2, "0");
    const newMonth = String(date.getMonth() + 1).padStart(2, "0");
    const newYear = date.getFullYear();
  
    return `${newDay}/${newMonth}/${newYear}`;
  };