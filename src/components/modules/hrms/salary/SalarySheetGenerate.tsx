import React, { useState, useEffect } from 'react';
import { FiSave, FiPrinter } from 'react-icons/fi';

const SalarySheetGenerate = (user:any) => {
  const [employees, setEmployees] = useState([
    {
      id: 29,
      serial_no: 1,
      name: 'Pronoy',
      designation_name: 'Supervisor',
      basic_salary: 25000,
      others_allowance: 0,
      loan_balance: 0,
      loan_deduction: 0,
      net_deduction: 0
    },
    {
      id: 30,
      serial_no: 2,
      name: 'Md. Lotif',
      designation_name: 'Mason',
      basic_salary: 24750,
      others_allowance: 0,
      loan_balance: 0,
      loan_deduction: 0,
      net_deduction: 0
    },
    {
      id: 31,
      serial_no: 3,
      name: 'Md. Nur nobi',
      designation_name: 'Daily Labour (Mason Helper)',
      basic_salary: 19000,
      others_allowance: 0,
      loan_balance: 0,
      loan_deduction: 0,
      net_deduction: 0
    }
  ]);

  // Input field change handler
  const handleInputChange = (id, fieldName, value) => {
    setEmployees(prev => 
      prev.map(emp => {
        if (emp.id === id) {
          const updatedEmp = { ...emp, [fieldName]: parseFloat(value) || 0 };
          return updatedEmp;
        }
        return emp;
      })
    );
  };

  // Calculate total salary
  const calculateTotalSalary = (emp:any) => {
    return emp.basic_salary + emp.others_allowance;
  };

  // Calculate net salary
  const calculateNetSalary = (emp:any) => {
    const totalSalary = calculateTotalSalary(emp);
    const totalDeduction = emp.loan_deduction + emp.net_deduction;
    return totalSalary - totalDeduction;
  };

  // Delete row
  const handleDeleteRow = (id:number) => {
    if (confirm('আপনি কি এই কর্মচারীকে মুছে ফেলতে চান?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  // Grand totals
  const grandTotals = employees.reduce((acc, emp) => ({
    basic_salary: acc.basic_salary + emp.basic_salary,
    others_allowance: acc.others_allowance + emp.others_allowance,
    total_salary: acc.total_salary + calculateTotalSalary(emp),
    loan_deduction: acc.loan_deduction + emp.loan_deduction,
    net_deduction: acc.net_deduction + emp.net_deduction,
    net_salary: acc.net_salary + calculateNetSalary(emp)
  }), {
    basic_salary: 0,
    others_allowance: 0,
    total_salary: 0,
    loan_deduction: 0,
    net_deduction: 0,
    net_salary: 0
  });

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">বেতন শীট</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded-md transition">
              <FiSave /> সংরক্ষণ
            </button>
            <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded-md transition">
              <FiPrinter /> প্রিন্ট
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-gray-600 px-3 py-3 text-center w-20">ক্রমিক নং</th>
                <th className="border border-gray-600 px-3 py-3 text-left min-w-[200px]">কর্মচারীর নাম</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">মূল বেতন</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">অন্যান্য ভাতা</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">মোট বেতন</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">ঋণ ব্যালেন্স</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">ঋণ কর্তন</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">মোট কর্তন</th>
                <th className="border border-gray-600 px-3 py-3 text-right min-w-[130px]">নিট বেতন</th>
                <th className="border border-gray-600 px-3 py-3 text-center w-20">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, index:number) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition">
                  <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                    {emp.serial_no}
                  </td>
                  <td className="border border-gray-300 px-3 py-2">
                    <div className="font-semibold text-gray-800">{emp.name}</div>
                    <div className="text-sm text-gray-600">{emp.designation_name}</div>
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={emp.basic_salary}
                      onChange={(e) => handleInputChange(emp.id, 'basic_salary', e.target.value)}
                      className="w-full text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={emp.others_allowance}
                      onChange={(e) => handleInputChange(emp.id, 'others_allowance', e.target.value)}
                      className="w-full text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-semibold text-blue-700 bg-blue-50">
                    {calculateTotalSalary(emp).toLocaleString('en-BD')}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right text-gray-600">
                    {emp.loan_balance.toLocaleString('en-BD')}
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={emp.loan_deduction}
                      onChange={(e) => handleInputChange(emp.id, 'loan_deduction', e.target.value)}
                      className="w-full text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-300 px-2 py-2">
                    <input
                      type="number"
                      value={emp.net_deduction}
                      onChange={(e) => handleInputChange(emp.id, 'net_deduction', e.target.value)}
                      className="w-full text-right px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700 bg-green-50">
                    {calculateNetSalary(emp).toLocaleString('en-BD')}
                  </td>
                  <td className="border border-gray-300 px-3 py-2 text-center">
                    <button
                      onClick={() => handleDeleteRow(emp.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-full transition"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}

              {/* Grand Total Row */}
              <tr className="bg-gradient-to-r from-gray-700 to-gray-900 text-white font-bold">
                <td colSpan={2} className="border border-gray-600 px-3 py-3 text-center text-lg">
                  সর্বমোট
                </td>
                <td className="border border-gray-600 px-3 py-3 text-right">
                  {grandTotals.basic_salary.toLocaleString('en-BD')}
                </td>
                <td className="border border-gray-600 px-3 py-3 text-right">
                  {grandTotals.others_allowance.toLocaleString('en-BD')}
                </td>
                <td className="border border-gray-600 px-3 py-3 text-right bg-blue-800">
                  {grandTotals.total_salary.toLocaleString('en-BD')}
                </td>
                <td className="border border-gray-600 px-3 py-3 text-right">-</td>
                <td className="border border-gray-600 px-3 py-3 text-right">
                  {grandTotals.loan_deduction.toLocaleString('en-BD')}
                </td>
                <td className="border border-gray-600 px-3 py-3 text-right">
                  {grandTotals.net_deduction.toLocaleString('en-BD')}
                </td>
                <td className="border border-gray-600 px-3 py-3 text-right bg-green-800">
                  {grandTotals.net_salary.toLocaleString('en-BD')}
                </td>
                <td className="border border-gray-600"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-4 bg-gray-100 text-sm text-gray-600">
          <p>মোট কর্মচারী: <span className="font-semibold text-gray-800">{employees.length}</span> জন</p>
        </div>
      </div>
    </div>
  );
};

export default SalarySheetGenerate;