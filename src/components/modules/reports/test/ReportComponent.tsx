import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

const ReportComponent: React.FC = () => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => {
      if (!componentRef.current) {
        // alert("Nothing to print: Ref not ready");
        return null;
      }
      return componentRef.current;
    },
    documentTitle: 'Due Report',
    // onAfterPrint: () => alert('Printed successfully!'),
    removeAfterPrint: true,
  });

  return (
    <div className="p-4">
      <button
        onClick={handlePrint}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        🖨️ Print Report
      </button>
      <div ref={componentRef}>
        <div className='flex justify-center mt-10'>NIBIR NIRMAN</div>
        <div className="p-6 shadow rounded text-xs">
          <h2 className="text-xs font-bold mb-4 ">Due Reports</h2>
          <table className="table-auto w-full bg-white border pl-10 pr-10 text-black-2">
            <thead>
              <tr>
                <th className="border px-4 py-2">Customer</th>
                <th className="border px-4 py-2">Amount</th>
                <th className="border px-4 py-2">Due Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
              <tr>
                <td className="border px-4 py-2">Rakib</td>
                <td className="border px-4 py-2">৳1500</td>
                <td className="border px-4 py-2">2025-06-30</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportComponent;
