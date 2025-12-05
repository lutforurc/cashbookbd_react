import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBook, FiEdit2, FiTrash2 } from "react-icons/fi";
import HelmetTitle from "../../utils/others/HelmetTitle";
import SelectOption from "../../utils/utils-functions/SelectOption";
import SearchInput from "../../utils/fields/SearchInput";
import { ButtonLoading } from "../../../pages/UiElements/CustomButtons";
import Loader from "../../../common/Loader";
import Pagination from "../../utils/utils-functions/Pagination";
import Table from "../../utils/others/Table";
import Link from "../../utils/others/Link";
import { getCustomer } from "./customerSlice";

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

  // 🔥 First API Call and on pagination change
  useEffect(() => {
    dispatch(getCustomer({ page, per_page:perPage, search }));
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
    dispatch(getCustomer({ page, per_page:perPage, search }));
  };

  // 🔥 Per Page Change
  const handleSelectChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  // 🔥 Page Change
  const handlePageChange = (newPage:number) => {
    setPage(newPage);
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
      key: "manual_address",
      header: "Address",
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (row) => {
        const m = row.mobile;
        if (/^01\d{9}$/.test(m)) {
          return `${m.slice(0, 5)}-${m.slice(5)}`;
        }
        return m || "N/A";
      },
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <div className="flex justify-center items-center">
          <button className="text-blue-500">
            <FiBook className="cursor-pointer" />
          </button>
          <button className="text-blue-500 ml-2">
            <FiEdit2 className="cursor-pointer" />
          </button>
          <button className="text-red-500 ml-2">
            <FiTrash2 className="cursor-pointer" />
          </button>
        </div>
      ),
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
    </div>
  );
};

export default CustomerSupplier;
