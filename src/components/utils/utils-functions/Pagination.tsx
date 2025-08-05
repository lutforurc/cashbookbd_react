import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  handlePageChange,
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5; // How many page buttons to show at once

    if (totalPages <= maxPagesToShow) {
      // If the total pages are less than or equal to maxPagesToShow, show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        // Show first few pages and ellipsis
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage > totalPages - 3) {
        // Show last few pages and ellipsis
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show current, previous, next, and ellipses
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="pl-30 md:pl-0 flex items-center justify-end space-x-2 mt-4">
      {/* Previous Button */}
      <button
        className="px-3 py-1 bg-gray-700 rounded-xs hover:bg-blue-500 hover:text-white disabled:bg-gray-400 text-white disabled:text-black"
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
      >
        Previous
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={index}
            className={`px-3 py-1 rounded-xs text-white ${currentPage === page ? 'bg-blue-500' : 'bg-gray-700 hover:bg-blue-500 '}`}
            onClick={() => handlePageChange(page)}
          >
            {page}
          </button>
        ) : (
          <span key={index} className="px-3 py-1">
            ...
          </span>
        ),
      )}

      {/* Next Button */}
      <button
        className="px-3 py-1 bg-gray-700 rounded-xs hover:bg-blue-500 hover:text-white disabled:bg-gray-400 text-white"
        disabled={currentPage === totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
