import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBook, FiEdit2, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import HelmetTitle from "../../utils/others/HelmetTitle";
import SelectOption from "../../utils/utils-functions/SelectOption";
import SearchInput from "../../utils/fields/SearchInput";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import Loader from "../../../common/Loader";
import Pagination from "../../utils/utils-functions/Pagination";
import Table from "../../utils/others/Table";
import Link from "../../utils/others/Link";
import { getCustomer, updateCustomerFromUI } from "./customerSlice";
import InputElement from "../../utils/fields/InputElement";
import { toast } from "react-toastify";

const CustomerSupplier = () => {
  const customers = useSelector((state) => state.customers);
  const dispatch = useDispatch();

  const [search, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [tableData, setTableData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showGuarantorModal, setShowGuarantorModal] = useState(false);
  const [selectedGuarantors, setSelectedGuarantors] = useState<any[]>([]);

  // 🔥 First API Call and on pagination change
  useEffect(() => {
    dispatch(getCustomer({ page, per_page: perPage, search }));
  }, [page, perPage]);

  // 🔥 Update table when redux updates
  useEffect(() => {
    if (customers.customer?.data) {
      setTableData(customers.customer.data);
      setTotalPages(customers.customer.last_page || 1);
    }
  }, [customers.customer]);

  // 🔥 Search Button
  const handleSearchButton = () => {
    setCurrentPage(1);
    setPage(1);
    dispatch(getCustomer({ page, per_page: perPage, search }));
  };




  // 🔥 Per Page Change
  const handleSelectChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  // 🔥 Page Change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };


  const handleInputChange = (id: number, field: string, value: string) => {
    setTableData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row)
    );
  };


  const handleInputBlur = (row: any, field: string) => {


    dispatch(
      updateCustomerFromUI({
        id: row.id,
        data: { [field]: row[field] },
      })
    )
      .unwrap()
      .then((res) => {
        if (res?.message && res?.success) {
          toast.success(res.message); // ✅ SUCCESS MESSAGE
        } else {
          toast.info(res.message); // ✅ SUCCESS MESSAGE

        }
      })
      .catch((err) => {
        toast.error(err?.message || 'Update failed');
      });
  };

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: "name",
      header: "Name",
    },
    {
      key: "national_id",
      header: "National ID",
      render: (row: any) => (
        <>
          { row.national_id == 0 ? '' : row.national_id }
        </>
      )
    },
    {
      key: 'openingbalance',
      header: 'Opening',
      headerClass: 'text-center',
      cellClass: 'text-right',
      render: (row: any) => (
        <InputElement
          type="number"   // 🔥 FIX HERE
          placeholder="Opening"
          value={row.openingbalance ?? ""}
          className="text-right w-20"
          onChange={(e) =>
            handleInputChange(row.id, "openingbalance", e.target.value)
          }
          onBlur={() => handleInputBlur(row, "openingbalance")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      ),
    },


    {
      key: "manual_address",
      header: "Address",
    },
    {
      key: 'ledger_page',
      header: 'Ledger Page',
      render: (row: any) => (
        <InputElement
          type="text"   // 🔥 FIX HERE
          placeholder="Ledger Page"
          value={row.ledger_page ?? ""}
          className="text-center w-35"
          onChange={(e) =>
            handleInputChange(row.id, "ledger_page", e.target.value)
          }
          onBlur={() => handleInputBlur(row, "ledger_page")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
        />
      ),
    },

    {
      key: 'mobile',
      header: 'Mobile',
      render: (row: any) => (
        <>
          <InputElement
            type="number"
            placeholder="Mobile Number"
            value={row.mobile ?? ""}
            className="text-center w-35"
            onChange={(e) =>
              handleInputChange(
                row.id,
                "mobile",
                e.target.value
              )
            }
            onBlur={() =>
              handleInputBlur(
                row,
                "mobile"
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur(); // 🔥 Enter = Save
              }
            }}
          />
        </>
      ),
    },

    {
      key: "action",
      header: "Action",
      render: (row: any) => (
        <div className="flex justify-center items-center gap-2">

          {/* ===== Guarantor Slot (fixed) ===== */}
          <div className="w-4 flex justify-center">
            {row.guarantors?.length > 0 && (
              <button
                title="View guarantors"
                onClick={() => {
                  setSelectedGuarantors(row.guarantors);
                  setShowGuarantorModal(true);
                }}
                className="text-indigo-600 hover:text-indigo-800"
              >
                <FiUsers size={16} />
              </button>
            )}
          </div>

          {/* ===== Edit Slot ===== */}
          <div className="w-4 flex justify-center">
            <button
              title="Edit"
              className="text-blue-600 hover:text-blue-800"
            >
              <FiEdit2 size={15} />
            </button>
          </div>

          {/* ===== Delete Slot ===== */}
          <div className="w-4 flex justify-center">
            <button
              title="Delete"
              className="text-red-600 hover:text-red-800"
            >
              <FiTrash2 size={15} />
            </button>
          </div>

        </div>
      )
    },
  ];

  return (
    <div>
      <HelmetTitle title="List Customers" />

      {/* Top Search Panel */}
      <div className="flex overflow-x-auto justify-between mb-1">
        <div className="flex">
          <SelectOption
            onChange={handleSelectChange}
            className="mr-1 md:mr-2"
          />

          <SearchInput
            search={search}
            setSearchValue={setSearchValue}
            className="text-nowrap"
          />

          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
          />
        </div>

        <Link to="/customer-supplier/create" className="text-nowrap">
          New Customer
        </Link>
      </div>

      {/* Table Section */}
      <div className="relative overflow-x-auto overflow-y-hidden">
        {customers.loading && <Loader />}

        <Table columns={columns} data={tableData} />

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>

      {showGuarantorModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 pt-50">

          {/* ===== Modal Box ===== */}
          <div
            className="
        bg-white dark:bg-gray-800
        rounded-sm
        w-[800px] max-h-[85vh]
        overflow-hidden
        shadow-xl
        border border-gray-300 dark:border-gray-600
      "
          >

            {/* ===== Header ===== */}
            <div
              className="
          flex justify-between items-center
          px-4 py-3
          bg-gray-300 dark:bg-gray-700
          border-b border-gray-300 dark:border-gray-600
        "
            >
              <h2 className="text-xs font-semibold uppercase text-gray-800 dark:text-gray-200">
                Guarantor Details
              </h2>

              <button
                onClick={() => setShowGuarantorModal(false)}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500"
              >
                <FiX className="text-lg cursor-pointer" />
              </button>
            </div>

            {/* ===== Body ===== */}
            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-full table-fixed text-sm text-left text-gray-700 dark:text-gray-300">

                {/* ===== Table Head ===== */}
                <thead
                  className="
              text-xs uppercase
              bg-gray-200 dark:bg-gray-700
              text-gray-800 dark:text-gray-300
              border-b border-gray-300 dark:border-gray-600
            "
                >
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Father</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">National ID</th>
                  </tr>
                </thead>

                {/* ===== Table Body ===== */}
                <tbody
                  className="
              bg-white dark:bg-gray-800
              divide-y divide-gray-200 dark:divide-gray-700
            "
                >
                  {selectedGuarantors.length > 0 ? (
                    selectedGuarantors.map((g, index) => (
                      <tr
                        key={index}
                        className="hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-2 truncate">{g.name}</td>
                        <td className="px-3 py-2 truncate">{g.father_name}</td>
                        <td className="px-3 py-2">{g.mobile}</td>
                        <td className="px-3 py-2 truncate">{g.address}</td>
                        <td className="px-3 py-2">{g.national_id == 0 ? '' : g.national_id}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-4 text-gray-500 dark:text-gray-400"
                      >
                        No guarantor found
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>

          </div>
        </div>
      )}


    </div>
  );
};

export default CustomerSupplier;
