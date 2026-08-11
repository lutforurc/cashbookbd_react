import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBook, FiCheckSquare, FiEdit2, FiPlus, FiPlusSquare, FiPrinter, FiRefreshCcw, FiSearch, FiSquare, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import HelmetTitle from "../../utils/others/HelmetTitle";
import SelectOption from "../../utils/utils-functions/SelectOption";
import SearchInput from "../../utils/fields/SearchInput";
import { ButtonLoading, ROW_ACTION_BUTTON_CLASS } from "../../../pages/UiElements/CustomButtons";
import Loader from "../../../common/Loader";
import Pagination from "../../utils/utils-functions/Pagination";
import Table from "../../utils/others/Table";
import Link from "../../utils/others/Link";
import { deleteCustomer, deleteCustomerOpening, getCustomer, updateCustomerFromUI } from "./customerSlice";
import InputElement from "../../utils/fields/InputElement";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import ConfirmModal from "../../utils/components/ConfirmModalProps";
import { hasPermission } from "../../utils/permissionChecker";
import httpService from "../../services/httpService";
import { API_CUSTOMER_PROFILE_PDF_URL } from "../../services/apiRoutes";
import routes from "../../services/appRoutes";

const CustomerSupplier = () => {
  const customers = useSelector((state) => state.customers);
  const settings = useSelector((state: any) => state.settings);
  const dispatch = useDispatch();

  const [search, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [editedRows, setEditedRows] = useState<Record<number, any>>({});
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showGuarantorModal, setShowGuarantorModal] = useState(false);
  const [selectedGuarantors, setSelectedGuarantors] = useState<any[]>([]);
  const [showNomineeModal, setShowNomineeModal] = useState(false);
  const [selectedNominees, setSelectedNominees] = useState<any[]>([]);
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<any | null>(null);
  const [openingDeleteRow, setOpeningDeleteRow] = useState<any | null>(null);
  const [deletingOpeningId, setDeletingOpeningId] = useState<number | null>(null);
  const [printingCustomerId, setPrintingCustomerId] = useState<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const customerPageData = customers?.customer || {};
  const tableData = Array.isArray(customerPageData?.data) ? customerPageData.data : [];
		  const totalRecords = Number(customerPageData?.total || customers?.total || 0);
		  const totalPages = Math.max(1, Number(customerPageData?.last_page || Math.ceil(totalRecords / perPage) || 1));
		  const isOpeningEnabled = settings?.data?.branch?.is_opening == 1;
  const canEditCustomer = hasPermission(settings?.data?.permissions, 'cs.edit');
  const canDeleteCustomer = hasPermission(settings?.data?.permissions, 'cs.delete');
  // Deleting an opening balance deletes a voucher, so it answers to the voucher
  // permission -- the same one the API checks. Gating it on cs.delete instead
  // would offer a button that comes back 403.
  const canDeleteVoucher = hasPermission(settings?.data?.permissions, 'voucher.delete');

  useEffect(() => {
    const state = location.state as any;
    const customerSearch = String(state?.customerSearch ?? "").trim();

    if (!state?.customerGlobalSearch || !customerSearch) {
      return;
    }

    setSearchValue(customerSearch);
    setPage(1);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);



  // 🔥 First API Call and on pagination change
  useEffect(() => {
    dispatch(getCustomer({ page, per_page: perPage, search }));
  }, [dispatch, page, perPage, search]);

  // 🔥 Search Button
  const handleSearchButton = () => {
    setPage(1);
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
    setEditedRows((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const isRowDirty = (row: any) => {
    const edited = editedRows[row.id];
    if (!edited) return false;

    const opening0 = row.openingbalance ?? "";
    const ledger0 = row.ledger_page ?? "";
    const opening1 = edited.openingbalance ?? opening0;
    const ledger1 = edited.ledger_page ?? ledger0;

    return (
      String(opening1 ?? "") !== String(opening0 ?? "") ||
      String(ledger1 ?? "") !== String(ledger0 ?? "")
    );
  };

  const handleSaveRow = (row: any) => {
    const edited = editedRows[row.id];
    if (!edited) return;

    const payload = {
      openingbalance: edited.openingbalance ?? row.openingbalance ?? "",
      ledger_page: edited.ledger_page ?? row.ledger_page ?? "",
    };

    dispatch(
      updateCustomerFromUI({
        id: row.id,
        data: payload,
      })
    )
        .unwrap()
      .then((res) => {
        if (res?.message && res?.success) {
          setEditedRows((prev) => {
            const copy = { ...prev };
            delete copy[row.id];
            return copy;
          });
          dispatch(getCustomer({ page, per_page: perPage, search }));
          toast.success(res.message);
        } else {
          toast.info(res.message);
        }
      })
      .catch((err) => {
        toast.error(err?.message || "Update failed");
      });
  };

  const handleCancelRow = (row: any) => {
    setEditedRows((prev) => {
      const copy = { ...prev };
      delete copy[row.id];
      return copy;
    });
  };

  const handleLedgerPageBlur = (row: any) => {
    const nextLedgerPage = editedRows[row.id]?.ledger_page ?? row.ledger_page ?? "";
    const currentLedgerPage = row.ledger_page ?? "";

    if (String(nextLedgerPage ?? "") === String(currentLedgerPage ?? "")) return;

    dispatch(
      updateCustomerFromUI({
        id: row.id,
        data: { ledger_page: nextLedgerPage },
      })
    )
      .unwrap()
      .then((res) => {
        if (res?.message && res?.success) {
          setEditedRows((prev) => {
            const copy = { ...prev };
            if (copy[row.id]) {
              delete copy[row.id].ledger_page;
              if (!Object.keys(copy[row.id]).length) delete copy[row.id];
            }
            return copy;
          });
          dispatch(getCustomer({ page, per_page: perPage, search }));
          toast.success(res.message);
        } else {
          toast.info(res?.message || "No changes were made.");
        }
      })
      .catch((err) => {
        toast.error(err?.message || err || "Ledger Page update failed");
      });
  };

  const handleDeleteRow = (row: any) => {
    if (!canDeleteCustomer) return;
    setDeleteConfirmRow(row);
  };

  const handleOpeningDeleteConfirmed = () => {
    if (!openingDeleteRow) return;

    setDeletingOpeningId(openingDeleteRow.id);
    dispatch(deleteCustomerOpening(openingDeleteRow.id))
      .unwrap()
      .then((res) => {
        toast.success(res?.message || 'Opening balance deleted');
        setOpeningDeleteRow(null);
        // The typed-but-unsaved figure would otherwise sit in the box looking
        // like the balance survived.
        handleCancelRow(openingDeleteRow);
        dispatch(getCustomer({ page, per_page: perPage, search }));
      })
      .catch((err) => {
        toast.error(err || 'Opening balance could not be deleted');
        setOpeningDeleteRow(null);
      })
      .finally(() => {
        setDeletingOpeningId(null);
      });
  };

  /**
   * The voucher number is the thread back to the ledger. Rather than only
   * printing it, clicking it opens the customer's ledger already pointed at
   * their account, which is where an opening balance gets checked against
   * everything that came after it.
   */
  const handleOpenLedger = (row: any) => {
    if (!row?.coa4_id) return;

    navigate(routes.report_ledger, {
      state: {
        ledgerAccount: {
          ledgerId: row.coa4_id,
          label: row.name,
        },
      },
    });
  };

  /**
   * The PDF is fetched with the auth header rather than linked to, so it comes
   * back as a blob. The tab is opened on the click itself — opening it after the
   * request returns gets caught by the popup blocker — and falls back to a plain
   * download when the blocker takes it anyway.
   */
  const handlePrintRow = async (row: any) => {
    if (printingCustomerId) return;

    const printTab = window.open('', '_blank');
    setPrintingCustomerId(row.id);

    try {
      const response = await httpService.get(`${API_CUSTOMER_PROFILE_PDF_URL}${row.id}`, {
        responseType: 'blob',
      });

      const fileUrl = URL.createObjectURL(
        new Blob([response.data], { type: 'application/pdf' }),
      );

      if (printTab) {
        printTab.location.href = fileUrl;
      } else {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = `customer-${row.id}.pdf`;
        link.click();
      }

      // Give the viewer time to load before dropping the blob.
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error: any) {
      printTab?.close();
      toast.error(error?.response?.data?.message || error?.message || 'Failed to build the PDF');
    } finally {
      setPrintingCustomerId(null);
    }
  };

  const handleDeleteConfirmed = () => {
    if (!deleteConfirmRow) return;

    setDeletingCustomerId(deleteConfirmRow.id);
    dispatch(deleteCustomer(deleteConfirmRow.id))
      .unwrap()
      .then((res) => {
        toast.success(res?.message || 'Customer deleted successfully');
        setDeleteConfirmRow(null);
        dispatch(getCustomer({ page, per_page: perPage, search }));
      })
      .catch((err) => {
        toast.error(err || 'Customer delete failed');
        setDeleteConfirmRow(null);
      })
      .finally(() => {
        setDeletingCustomerId(null);
      });
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


  const isOpeningColumns = [
      {
      key: 'openingbalance',
      header: 'Opening',
      headerClass: 'text-left',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex flex-col items-end gap-0.5">
          <InputElement
            type="number"   // 🔥 FIX HERE
            placeholder="Opening"
            value={editedRows[row.id]?.openingbalance ?? row.openingbalance ?? ""}
            className="text-right w-20"
            onChange={(e) =>
              handleInputChange(row.id, "openingbalance", e.target.value)
            }
          />

          {/* The voucher this figure sits on. Without it the balance is a
              number nobody can trace; with it the ledger is one click away. */}
          {row.opening_vr_no && (
            <button
              type="button"
              title={`Journal voucher ${row.opening_vr_no} — open ledger`}
              onClick={() => handleOpenLedger(row)}
              className="font-mono text-[10px] leading-tight text-blue-600 hover:underline dark:text-blue-400"
            >
              {row.opening_vr_no}
            </button>
          )}
        </div>
      ),
    },
    {
      // Beside the field they act on. At the far right of the row the clerk had
      // to cross every other column to save the figure just typed, and on a
      // narrow screen scroll to reach it at all.
      key: 'opening_action',
      header: '',
      headerClass: 'text-center',
      // The table lays out fixed and honours no `width` of its own, so a column
      // left without one takes an equal share of the page. Held to what the
      // three buttons need, the rest goes back to the columns that carry text.
      cellClass: 'text-center w-72',
      render: (row: any) => {
        const dirty = isRowDirty(row);

        return (
          // Three slots of equal width, always three. Delete comes and goes as
          // opening balances are saved and removed; were its slot to go with
          // it, the other two would slide sideways row by row.
          <div className="grid grid-cols-3 items-center gap-1.5">
            <ButtonLoading
              className={ROW_ACTION_BUTTON_CLASS}
              size="sm"
              label="Save"
              type="button"
              disabled={!dirty}
              onClick={() => handleSaveRow(row)}
              icon={<FiCheckSquare size={14} />}
            />
            <ButtonLoading
              icon={<FiX size={14} />}
              className={ROW_ACTION_BUTTON_CLASS}
              size="sm"
              label="Cancel"
              type="button"
              disabled={!editedRows[row.id]}
              onClick={() => handleCancelRow(row)}
            />

            {/* Only where there is a voucher to delete. A row that never had an
                opening balance has nothing to offer here, and saying so by
                leaving the button out reads faster than grey-ing it. */}
            <div>
              {row.opening_vr_no && canDeleteVoucher ? (
                <ButtonLoading
                  icon={<FiTrash2 size={14} />}
                  className={`${ROW_ACTION_BUTTON_CLASS} bg-red-600 hover:bg-red-700`}
                  size="sm"
                  label="Delete"
                  type="button"
                  buttonLoading={deletingOpeningId === row.id}
                  disabled={deletingOpeningId === row.id}
                  onClick={() => setOpeningDeleteRow(row)}
                />
              ) : null}
            </div>
          </div>
        );
      },
    },
  ]

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
          {row.national_id && row.national_id !== "0" ? row.national_id : ""}
        </>
      )
    },
  
	    ...(isOpeningEnabled ? isOpeningColumns : []),

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
          value={editedRows[row.id]?.ledger_page ?? row.ledger_page ?? ""}
          className="text-center w-35"
          onChange={(e) =>
            handleInputChange(row.id, "ledger_page", e.target.value)
          }
          onBlur={() => handleLedgerPageBlur(row)}
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
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: "action",
      header: "Action",
      headerClass: 'text-center', 
      render: (row: any) => {
	        return (
	        <div className="flex justify-center items-center gap-2">
	          {/* Save and Cancel used to sit here; they now travel with the
	              Opening column, next to the field they belong to. */}

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

          <div className="w-4 flex justify-center">
            {row.nominees?.length > 0 && (
              <button
                title="View nominees"
                onClick={() => {
                  setSelectedNominees(row.nominees);
                  setShowNomineeModal(true);
                }}
                className="text-emerald-600 hover:text-emerald-800"
              >
                <FiBook size={16} />
              </button>
            )}
          </div>

          {/* ===== Print Slot ===== */}
          <div className="w-4 flex justify-center">
            <button
              title="Print profile (PDF)"
              className="text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-white"
              disabled={printingCustomerId === row.id}
              onClick={() => handlePrintRow(row)}
            >
              <FiPrinter size={15} />
            </button>
          </div>

          {/* ===== Edit Slot ===== */}
          {canEditCustomer && (
            <div className="w-4 flex justify-center">
              <button
                title="Edit"
                className="text-blue-600 hover:text-blue-800"
                onClick={() => navigate(`/customer-supplier/edit/${row.id}`)}
              >
                <FiEdit2 size={15} />
              </button>
            </div>
          )}

          {/* ===== Delete Slot ===== */}
          {canDeleteCustomer && (
            <div className="w-4 flex justify-center">
              <button
                title="Delete"
                className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deletingCustomerId === row.id}
                onClick={() => handleDeleteRow(row)}
              >
                <FiTrash2 size={15} />
              </button>
            </div>
          )}

        </div>
      )},
    },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="List Customers" screen="customer-supplier" />
      </div>

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
             icon={<FiSearch size={15} />}
          />
        </div>

        <Link to="/customer-supplier/create" className="text-nowrap">
          { <FiPlus className="inline mr-1" /> }
          Add Customer
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

      <ConfirmModal
        show={Boolean(deleteConfirmRow)}
        title="Confirm Deletion"
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>Are you sure you want to delete voucher</div>
            <div className="font-bold text-slate-800 dark:text-white">
              {deleteConfirmRow?.name || 'this customer'} ?
            </div>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm"
        className="bg-red-600 hover:bg-red-700 min-w-[128px]"
        loading={deletingCustomerId === deleteConfirmRow?.id}
        onCancel={() => setDeleteConfirmRow(null)}
        onConfirm={handleDeleteConfirmed}
      />

      {/* Naming the voucher and the amount, not just "are you sure": the clerk
          is about to remove a ledger entry, and this is the last place they can
          check it is the right one. */}
      <ConfirmModal
        show={Boolean(openingDeleteRow)}
        title="Delete Opening Balance"
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>Delete the opening balance of</div>
            <div className="font-bold text-slate-800 dark:text-white">
              {openingDeleteRow?.name}
            </div>
            <div className="mt-2 text-sm">
              Amount{' '}
              <span className="font-semibold text-slate-800 dark:text-white">
                {openingDeleteRow?.openingbalance}
              </span>
              {' · '}Voucher{' '}
              <span className="font-mono font-semibold text-slate-800 dark:text-white">
                {openingDeleteRow?.opening_vr_no}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              The voucher goes to the trash, not away for good. The customer is
              not deleted.
            </div>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        className="bg-red-600 hover:bg-red-700 min-w-[128px]"
        loading={deletingOpeningId === openingDeleteRow?.id}
        onCancel={() => setOpeningDeleteRow(null)}
        onConfirm={handleOpeningDeleteConfirmed}
      />

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
                    <th className="px-3 py-2 text-center">Mobile</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2 text-center">National ID</th>
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
                        <td className="px-3 py-2 text-center">{g.mobile}</td>
                        <td className="px-3 py-2 truncate">{g.address}</td>
                        <td className="px-3 py-2 text-center">{g.national_id == 0 ? '' : g.national_id}</td>
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

      {showNomineeModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-40 pt-50">
          <div
            className="
        bg-white dark:bg-gray-800
        rounded-sm
        w-[1100px] max-h-[85vh]
        overflow-hidden
        shadow-xl
        border border-gray-300 dark:border-gray-600
      "
          >
            <div
              className="
          flex justify-between items-center
          px-4 py-3
          bg-gray-300 dark:bg-gray-700
          border-b border-gray-300 dark:border-gray-600
        "
            >
              <h2 className="text-xs font-semibold uppercase text-gray-800 dark:text-gray-200">
                Nominee Details
              </h2>

              <button
                onClick={() => setShowNomineeModal(false)}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500"
              >
                <FiX className="text-lg cursor-pointer" />
              </button>
            </div>

            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-full table-fixed text-sm text-left text-gray-700 dark:text-gray-300">
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
                    <th className="px-3 py-2">Relation</th>
                    <th className="px-3 py-2">Mobile</th>
                    <th className="px-3 py-2 text-center">Share %</th>
                    <th className="px-3 py-2 text-center">Priority</th>
                    <th className="px-3 py-2 text-center">Minor</th>
                    <th className="px-3 py-2">Guardian</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>

                <tbody
                  className="
              bg-white dark:bg-gray-800
              divide-y divide-gray-200 dark:divide-gray-700
            "
                >
                  {selectedNominees.length > 0 ? (
                    selectedNominees.map((n, index) => (
                      <tr
                        key={index}
                        className="hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-2 truncate">{n.name}</td>
                        <td className="px-3 py-2 truncate">{n.relation || ''}</td>
                        <td className="px-3 py-2">{n.mobile || ''}</td>
                        <td className="px-3 py-2 text-center">{n.share_percentage || ''}</td>
                        <td className="px-3 py-2 text-center">{n.priority_order || ''}</td>
                        <td className="px-3 py-2 text-center">{Number(n.is_minor) === 1 ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 truncate">{n.guardian_name || ''}</td>
                        <td className="px-3 py-2 text-center">{n.status || 'active'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-center py-4 text-gray-500 dark:text-gray-400"
                      >
                        No nominee found
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
