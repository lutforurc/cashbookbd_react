import React from "react";

const ChartCard = ({ title, children }) => {
  return (
    <div className="bg-[#fff] dark:bg-[#24303F80] p-4 rounded-xl shadow-lg mb-6">
      <h2 className="text-center mb-3 text-lg font-semibold text-gray-900 dark:text-gray-200">
        {title}
      </h2>
      {children}
    </div>
  );
};

export default ChartCard;
