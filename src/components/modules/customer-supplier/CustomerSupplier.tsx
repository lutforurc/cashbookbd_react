import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiBook, FiCheckSquare, FiClock, FiEdit2, FiEye, FiList, FiPlus, FiPlusSquare, FiPrinter, FiRefreshCcw, FiSearch, FiSquare, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import HelmetTitle from "../../utils/others/HelmetTitle";
import SelectOption from "../../utils/utils-functions/SelectOption";
import DropdownCommon from "../../utils/utils-functions/DropdownCommon";
import { ClientType } from "../../utils/fields/DataConstant";
import SearchInput from "../../utils/fields/SearchInput";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import { ButtonLoading, PrintButton } from "../../../pages/UiElements/CustomButtons";
import Loader from "../../../common/Loader";
import Pagination from "../../utils/utils-functions/Pagination";
import Table from "../../utils/others/Table";
import { deleteCustomer, deleteCustomerOpening, getCustomer, updateCustomerFromUI } from "./customerSlice";
import InputElement from "../../utils/fields/InputElement";
import { toast } from "react-toastify";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import ConfirmModal from "../../utils/components/ConfirmModalProps";
import { hasPermission } from "../../utils/permissionChecker";
import httpService from "../../services/httpService";
import { API_CONTACT_DETAILS_LIST_URL, API_CUSTOMER_HISTORY_URL, API_CUSTOMER_PROFILE_PDF_URL } from "../../services/apiRoutes";
import routes from "../../services/appRoutes";
import { useReactToPrint } from "react-to-print";
import PrintFontInput from "../../utils/fields/PrintFontInput";
import PrintRowsInput from "../../utils/fields/PrintRowsInput";
import CustomerListPrint from "./CustomerListPrint";
import PartyLedgerModal from "./PartyLedgerModal";
import { formatMobile, useMobileFormat } from "../../utils/utils-functions/mobileFormat";
import { Button } from '../../../pages/UiElements/CustomButtons';
import { isBranchSettingOn } from "../../utils/userFeatureSettings";

/**
 * The classification filter, built from the same constant the Due List draws its
 * own from -- so the two screens offer the same four types, and a fifth added to
 * Add Customers appears on both without either being opened.
 *
 * ClientType's own blank entry says "Select Client Type", which reads as a
 * prompt on a form. Here the empty value means EVERY party, and it is worded
 * that way.
 */
const CUSTOMER_TYPE_FILTER = [
  { id: '', name: 'All Types' },
  ...ClientType.filter((entry) => entry.id !== ''),
];

/**
 * What the print toolbar starts on: thirty names to a sheet, set at ten point.
 * The desk can change both, and clearing either box falls back to these.
 */
const PRINT_ROWS_PER_SHEET = 30;
const PRINT_FONT_SIZE = 10;

const CustomerSupplier = () => {
  const customers = useSelector((state) => state.customers);
  const settings = useSelector((state: any) => state.settings);
  const mobileFormat = useMobileFormat();
  const dispatch = useDispatch();

  /**
   * Where the list is -- in the address bar, not only in this component.
   *
   * Editing a customer leaves this screen, and coming back built it again from
   * scratch: page 1, no search, ten rows. Somebody correcting the fortieth
   * name on page four was returned to the top of the list each time and had to
   * walk back down to where they had been.
   *
   * Held in the query string rather than in a variable that dies with the
   * component, so the browser's own Back restores it, a refresh keeps it, and
   * the address can be handed to somebody else as it is.
   */
  const [searchParams, setSearchParams] = useSearchParams();

  const readNumber = (key: string, fallback: number) => {
    const value = Number(searchParams.get(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  const search = searchParams.get("search") ?? "";
  const page = readNumber("page", 1);
  const perPage = readNumber("per_page", 10);
  // The classification rides in the address bar with the rest of the list's
  // position. Held in state alone it would be dropped the moment the reader
  // paged, searched or came back from an edit -- each of those rewrites the
  // query string, and only what is written there survives them.
  const partyTypeId = searchParams.get("party_type_id") ?? "";

  /**
   * What is IN the box, which is not the same as what has been searched for.
   *
   * The box used to write straight into the address bar, and the fetch effect
   * below reads `search` from there -- so every keystroke dispatched a request.
   * Typing "100" sent three of them, and the list under the desk flickered
   * through two answers to reach a third. The box now holds its own text and the
   * term is committed on Enter or on the Search button, which is when a search
   * was ever meant to happen.
   *
   * ⚠️ `search` STILL IS WHAT WAS SEARCHED FOR, and it changes from outside this
   * component too: the global search navigates here with a term already in it,
   * and Back rewrites the address. The effect further down copies those in, so
   * the box and the list never disagree about the last search.
   */
  const [searchText, setSearchText] = useState(search);

  /**
   * ⚠️ An Enter on the word already applied writes nothing new into the
   * address, and the fetch effect keyed on the address would stay quiet -- so
   * Search on a list somebody else has been editing since would appear to do
   * nothing. This still asks it once.
   */
  const [searchRun, setSearchRun] = useState(0);

  /** Writes one part of the list's position, leaving the others as they are. */
  const setListParams = (next: Record<string, string | number | null>) => {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);

        Object.entries(next).forEach(([key, value]) => {
          // An empty search or a first page is the default; leaving it out
          // keeps the address readable.
          if (value === null || value === "" || value === 0) {
            params.delete(key);
          } else {
            params.set(key, String(value));
          }
        });

        return params;
      },
      { replace: true },
    );
  };

  const setPage = (value: number) => setListParams({ page: value === 1 ? null : value });
  const setPerPage = (value: number) => setListParams({ per_page: value === 10 ? null : value, page: null });
  // A new classification is a new list, so the page goes back to the first:
  // page four of "every party" is not page four of the suppliers, and the
  // shorter list would open past its own end.
  const setPartyTypeId = (value: string) =>
    setListParams({ party_type_id: value, page: null });
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
  // The change log for one customer, loaded when the clock is clicked rather
  // than with the list: a page of ten customers would otherwise fetch ten
  // trails nobody asked to see.
  const [historyCustomer, setHistoryCustomer] = useState<any | null>(null);
  const [historyEvents, setHistoryEvents] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // The party whose recent transactions are open in the popup, or null.
  const [reportParty, setReportParty] = useState<any | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const customerPageData = customers?.customer || {};
  const tableData = Array.isArray(customerPageData?.data) ? customerPageData.data : [];
  const totalRecords = Number(customerPageData?.total || customers?.total || 0);
  const totalPages = Math.max(1, Number(customerPageData?.last_page || Math.ceil(totalRecords / perPage) || 1));
  // One reading of the branch's opening switch, so the two places below cannot
  // drift apart the way `settings?.data?.branch?.is_opening == 1` and
  // isBranchSettingOn() had on the Product list.
  const openingOn = isBranchSettingOn(settings, 'is_opening');
  // The customer form only asks for a National ID when the branch says so, so
  // where the switch is off the column would be a column of blanks.
  const needNationalId = isBranchSettingOn(settings, 'need_customer_national_id');
  const canEditCustomer = hasPermission(settings?.data?.permissions, 'cs.edit');
  const canDeleteCustomer = hasPermission(settings?.data?.permissions, 'cs.delete');
  // Deleting an opening balance deletes a voucher, so it answers to the voucher
  // permission -- the same one the API checks. Gating it on cs.delete instead
  // would offer a button that comes back 403.
  const canDeleteVoucher = hasPermission(settings?.data?.permissions, 'voucher.delete');
  // The popup reads the Ledger's own endpoint, so it asks for the permissions
  // that screen asks for -- the very same pair its route is guarded with.
  // Deliberately not `cs.ledger`: that key is in the menu list but no route or
  // component in the app reads it, so gating on it would hide the button from
  // everybody.
  const canViewLedger =
    hasPermission(settings?.data?.permissions, 'ledger.view') ||
    hasPermission(settings?.data?.permissions, 'ledger.customer');

  /**
   * Which row's action menu is open, and where its panel hangs.
   *
   * ⚠️ ONE panel for the whole table, not one per row. Ten rows would otherwise
   * be ten panels, ten sets of listeners, and ten chances to leave two of them
   * standing at once. The row the panel belongs to is this state; the items in
   * it are built from that.
   */
  const [rowMenuRow, setRowMenuRow] = useState<any | null>(null);
  const [rowMenuPos, setRowMenuPos] = useState<React.CSSProperties | null>(null);
  const rowMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const rowMenuPanelRef = useRef<HTMLDivElement | null>(null);

  /**
   * ⚠️ `fixed`, and that is what makes it work rather than a matter of taste:
   * the table sits inside two `overflow-x-auto` boxes, and an absolutely
   * positioned panel would be clipped by the first of them. A fixed one hangs
   * off the viewport instead -- the only thing that could pull it back in is a
   * transform on an ancestor, and this screen has none.
   *
   * Anchored on the RIGHT, so a row with seven actions grows leftwards into the
   * page instead of off the right edge. The threshold is one strip tall rather
   * than the 160px a column panel needs: below the last rows there is nothing
   * to hang into, so it flips up above the button.
   */
  const openRowMenu = (row: any, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    const GAP = 4;
    const below = window.innerHeight - rect.bottom - GAP - 8;
    const flip = below < 48;

    rowMenuButtonRef.current = button;

    setRowMenuPos({
      position: 'fixed',
      right: Math.max(8, window.innerWidth - rect.right),
      maxWidth: window.innerWidth - 16,
      ...(flip
        ? { bottom: window.innerHeight - rect.top + GAP }
        : { top: rect.bottom + GAP }),
    });
    setRowMenuRow(row);
  };

  const closeRowMenu = () => {
    setRowMenuRow(null);
    setRowMenuPos(null);
  };

  /**
   * The four ways the panel goes away -- and the one click that must not.
   *
   * ⚠️ The trigger is asked about alongside the panel because it is NOT inside
   * it. Without that, pressing the open row's own eye would close the panel on
   * mousedown and open it again on click, and the button would read as dead.
   * Table.tsx dodges the same trap by keeping its own trigger inside `menuRef`.
   */
  useEffect(() => {
    if (!rowMenuRow) return undefined;

    const inside = (target: Node) =>
      Boolean(
        rowMenuPanelRef.current?.contains(target) ||
        rowMenuButtonRef.current?.contains(target),
      );

    const onPointerDown = (event: MouseEvent) => {
      if (!inside(event.target as Node)) closeRowMenu();
    };

    // Escape puts the keyboard back on the button it came from rather than at
    // the top of the document.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeRowMenu();
      rowMenuButtonRef.current?.focus();
    };

    // On the way down, because the page scrolls in a box rather than on the
    // window. The panel's own scrollbar is not that, hence the exemption.
    const onScroll = (event: Event) => {
      if (rowMenuPanelRef.current?.contains(event.target as Node)) return;
      closeRowMenu();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', closeRowMenu);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', closeRowMenu);
    };
  }, [rowMenuRow]);

  /**
   * A refetch, a new page or the branch turning opening on can take the row the
   * panel was opened for out of the list -- and it would go on hanging there
   * describing a party that is no longer on the screen.
   */
  useEffect(() => {
    closeRowMenu();
  }, [openingOn, search, page, partyTypeId]);

  useEffect(() => {
    const state = location.state as any;
    const customerSearch = String(state?.customerSearch ?? "").trim();

    if (!state?.customerGlobalSearch || !customerSearch) {
      return;
    }

    // One navigate, not a setSearchValue followed by a navigate that drops the
    // query string it had just written. The term goes into the address, the
    // page is left out (absent means the first), and the one-shot state that
    // brought us here is cleared in the same step. The classification is
    // carried across -- arriving from the global search must not quietly widen
    // the list back to every party.
    const params = new URLSearchParams();
    params.set("search", customerSearch);

    if (partyTypeId) {
      params.set("party_type_id", partyTypeId);
    }

    navigate(`${location.pathname}?${params.toString()}`, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate, partyTypeId]);



  /**
   * The address bar is the other way in, and it does not go through the box --
   * so the box has to be told what the list has ended up showing. Keyed on
   * `search` alone: a change of page or of classification must not wipe what is
   * half-typed in the box.
   */
  useEffect(() => {
    setSearchText(search);
  }, [search]);

  // 🔥 First API Call and on pagination change
  useEffect(() => {
    dispatch(getCustomer({ page, per_page: perPage, search, partyTypeId }));
  }, [dispatch, page, perPage, search, partyTypeId, searchRun]);

  /**
   * Enter, or the Search button -- the two ways the term is committed.
   *
   * ⚠️ `page: null` is the reset to the first page, and it belongs here rather
   * than in the button: page four of the old word is not page four of the new
   * one, and a shorter list would open past its own end.
   */
  const submitSearch = () => {
    setListParams({ search: searchText, page: null });
    setSearchRun((n) => n + 1);
  };

  // 🔥 Search Button
  const handleSearchButton = () => {
    submitSearch();
  };

  /**
   * ⚠️ On the row, not on the box. SearchInput is on fifty screens and Enter is
   * this one screen's business -- the same reason the placeholder lives at this
   * call site. The guard keeps Enter on the per-page dropdown beside it out of
   * the search: that control is a <select>, so it is not the input we are after.
   *
   * ⚠️ The print toolbar's two boxes ARE inputs, and stand on this row. Left in,
   * Enter on a Rows figure typed and done with would search again -- and reset
   * the list to its first page under the desk.
   */
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || !(e.target instanceof HTMLInputElement)) return;
    if (e.target.id === "printRowsPerPage" || e.target.id === "printFontSize") return;
    e.preventDefault(); // Enter inside a form submits it -- this is a search
    submitSearch();
  };

  /**
   * Choosing a classification asks the server again at once.
   *
   * ⚠️ THE NARROWING IS THE SERVER'S, not a sift over the ten rows in hand.
   * Filtering here would answer one page of one type while the total and the
   * page count still described every type, and the pages past the first would
   * come back empty. The request goes out with the type, and the server cuts the
   * set before it pages it.
   */
  const handlePartyTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPartyTypeId(e.target.value);
  };




  // 🔥 Per Page Change
  /**
   * ⚠️ ONE setListParams CALL, NOT TWO.
   *
   * This used to be `setPerPage(...)` followed by `setPage(1)`, and the per-page
   * never took: react-router's `setSearchParams` builds the next address from
   * the search string of the LAST RENDER, so two calls in one handler do not
   * stack -- the second navigates from the params as they were before the
   * first, and the `per_page` the first had just written is not in them. Every
   * choice, 20 through 100, was written and dropped in the same tick while the
   * address bar briefly showed it.
   *
   * `setPerPage` above already sends `page: null` in its own call, which is the
   * reset to page one this line was trying to make, so there is nothing to do
   * here but hand it the number.
   */
  const handleSelectChange = (e) => {
    setPerPage(Number(e.target.value));
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
          dispatch(getCustomer({ page, per_page: perPage, search, partyTypeId }));
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
          dispatch(getCustomer({ page, per_page: perPage, search, partyTypeId }));
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
        dispatch(getCustomer({ page, per_page: perPage, search, partyTypeId }));
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
  /**
   * What has been done to this customer, and by whom.
   *
   * The trail is kept by PartyObserver on the API side, which records a row
   * every time a party is created, changed or deleted. Opened here because this
   * is where the question is asked -- somebody looks at a mobile number that is
   * not the one they typed and wants to know who changed it.
   */
  const handleShowHistory = async (row: any) => {
    setHistoryCustomer(row);
    setHistoryEvents([]);
    setHistoryLoading(true);

    try {
      const response = await httpService.get(`${API_CUSTOMER_HISTORY_URL}${row.id}`);
      const payload = response?.data?.data?.data ?? response?.data?.data ?? {};

      setHistoryEvents(Array.isArray(payload?.events) ? payload.events : []);
    } catch (error) {
      console.error(error);
      toast.error('Could not load the change log for this customer.');
      setHistoryCustomer(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  /** A stamp as a person reads it: 05/09/2026 02:14 PM. */
  const historyStamp = (value: any) => {
    if (!value) return '';

    const at = new Date(String(value).replace(' ', 'T'));

    if (Number.isNaN(at.getTime())) return String(value);

    const two = (n: number) => String(n).padStart(2, '0');
    const hour = at.getHours() % 12 || 12;

    return `${two(at.getDate())}/${two(at.getMonth() + 1)}/${at.getFullYear()} `
      + `${two(hour)}:${two(at.getMinutes())} ${at.getHours() < 12 ? 'AM' : 'PM'}`;
  };

  // An empty field reads as a dash rather than as nothing at all, so a value
  // that was cleared is visibly a change and not a rendering fault.
  const historyValue = (value: any) =>
    value === null || value === undefined || String(value).trim() === '' ? '—' : String(value);

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

  /**
   * The whole list on paper, not the page of it on screen.
   *
   * ⚠️ THE FETCH IS ITS OWN, DELIBERATELY. The server pages this list, so the
   * store holds ten rows -- printing from those would put ten customers on the
   * sheet however many the report has. The same endpoint is asked for every row
   * under the filters on screen, and the answer lands in this component's own
   * state rather than in the slice, so the desk stays on the page it was
   * reading: the address bar, the box and the table are all untouched.
   *
   * ponytail: every row in one request. A branch with several thousand parties
   * waits on a heavier answer; fetch it page by page when that day comes.
   */
  const [printRows, setPrintRows] = useState<any[]>([]);
  const [printFilterLine, setPrintFilterLine] = useState('');
  const [printPending, setPrintPending] = useState(false);
  const [printingList, setPrintingList] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  /**
   * The two numbers the print toolbar carries, and they are NOT the screen's
   * `per_page`.
   *
   * ⚠️ THAT NAME IS TAKEN, AND MEANS SOMETHING ELSE. `perPage` above is the
   * list's own paging, read out of the address bar -- chunking the sheet by it
   * would page a printed list ten rows at a time, whatever the desk asked the
   * screen for. These two belong to the paper: the font it is set in, and how
   * many rows go on a sheet. Both are read only by CustomerListPrint.
   *
   * Thirty rows rather than the "All" the other screens start on: this list is
   * thousands of names, and a sheet per thirty of them keeps a heading, a page
   * number and a footer on every sheet. Clearing the box falls back to it.
   */
  const [printRowsPerPage, setPrintRowsPerPage] = useState<number>(PRINT_ROWS_PER_SHEET);
  const [printFontSize, setPrintFontSize] = useState<number>(PRINT_FONT_SIZE);

  const handlePrintRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintRowsPerPage(Number.isFinite(value) && value > 0 ? value : PRINT_ROWS_PER_SHEET);
  };

  const handlePrintFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setPrintFontSize(Number.isFinite(value) && value > 0 ? value : PRINT_FONT_SIZE);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Customer List',
  });

  const handlePrintList = async () => {
    if (printingList) return;

    setPrintingList(true);

    try {
      const body: Record<string, any> = {
        // Never fewer than the screen's own page: a list that has not answered
        // yet reads total 0, and asking for nought rows would print nothing
        // rather than the row that is there.
        per_page: Math.max(totalRecords, perPage),
        page: 1,
        search,
      };

      if (partyTypeId) body.party_type_id = partyTypeId;

      const { data } = await httpService.post(API_CONTACT_DETAILS_LIST_URL, body);
      const rows = data?.data?.data?.data;

      if (!Array.isArray(rows) || !rows.length) {
        toast.info('There is nothing to print for this list.');
        return;
      }

      // The sheet says which list it is: an empty box and "All Types" are
      // choices too, and four hundred names with no heading look like every
      // customer the company has.
      const typeName =
        CUSTOMER_TYPE_FILTER.find((entry) => String(entry.id) === String(partyTypeId))?.name ||
        'All Types';

      setPrintRows(rows);
      setPrintFilterLine(
        [`Client Type: ${typeName}`, search.trim() ? `Search: ${search.trim()}` : null]
          .filter(Boolean)
          .join('  |  '),
      );
      setPrintPending(true);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load the list for printing.');
    } finally {
      setPrintingList(false);
    }
  };

  /**
   * ⚠️ ONE COMMIT LATER, or the sheet is blank. The rows above are state, and
   * the print clones the node as it stands -- called in the same tick it would
   * clone the sheet from before the fetch and print an empty page.
   */
  useEffect(() => {
    if (!printPending) return;

    setPrintPending(false);
    handlePrint();
  }, [printPending, handlePrint]);

  const handleDeleteConfirmed = () => {
    if (!deleteConfirmRow) return;

    setDeletingCustomerId(deleteConfirmRow.id);
    dispatch(deleteCustomer(deleteConfirmRow.id))
      .unwrap()
      .then((res) => {
        toast.success(res?.message || 'Customer deleted successfully');
        setDeleteConfirmRow(null);
        dispatch(getCustomer({ page, per_page: perPage, search, partyTypeId }));
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


  // The figure the branch is here to enter. It stands at the end of the row with
  // its own Save/Cancel/Delete next to it (`openingActionColumn` below), so the
  // eyes travel from the box to the button that saves it without crossing the
  // address and the mobile number.
  const openingFigureColumn = {
    key: 'openingbalance',
    header: 'Opening',
    headerClass: 'text-right w-40',
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
          <Button
            type="button"
            title={`Journal voucher ${row.opening_vr_no} — open ledger`}
            onClick={() => handleOpenLedger(row)}
            className="font-mono text-[10px] leading-tight text-blue-600 hover:underline dark:text-blue-400"
          >
            {row.opening_vr_no}
          </Button>
        )}
      </div>
    ),
  };

  /**
   * The Opening group's own Save/Cancel/Delete, headed "Action" and standing
   * last in the row like every other list's. It took the place of the two
   * columns that sat here before: the customer's own actions stand down while
   * opening is on (see the filter under `columns`), so one "Action" heading is
   * all the row ever carries.
   */
  const openingActionColumn = {
    key: 'opening_action',
    header: 'Action',
    headerClass: 'text-center',
    // The table lays out fixed and honours no `width` of its own, so a column
    // left without one takes an equal share of the page. Icons need far less
    // than three labelled buttons did; the rest goes back to the columns that
    // carry text.
    cellClass: 'text-center w-32',
    render: (row: any) => {
      const dirty = isRowDirty(row);

      // Icon alone, the word kept as a tooltip -- the Product list writes this
      // same trio that way. "Save", "Cancel" and "Delete" spelled out came to
      // some 220px, all of it taken off the customer's own name.
      return (
        <div className="flex items-center justify-center gap-1">
          <ButtonLoading
            icon={<FiCheckSquare />}
            title="Save"
            label=""
            className="py-1 px-2"
            type="button"
            disabled={!dirty}
            onClick={() => handleSaveRow(row)}
          />
          <ButtonLoading
            icon={<FiX />}
            title="Cancel"
            label=""
            className="py-1 px-2 mr-3"
            type="button"
            disabled={!editedRows[row.id]}
            onClick={() => handleCancelRow(row)}
          />

          {/* Only where there is a voucher to delete, but its slot is held
                either way so Save and Cancel do not slide sideways row by row.
                A row that never had an opening balance says so by the bin being
                absent, which reads faster than a greyed one. */}
          <div className="flex w-9 shrink-0 justify-center">
            {row.opening_vr_no && canDeleteVoucher ? (
              <ButtonLoading
                icon={<FiTrash2 />}
                title="Delete opening balance"
                label=""
                variant="danger"
                className="py-1 px-2 mr-2"
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
  };

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center w-20',
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
      // Grouped the way this branch asked for in its Customer Setup. What is
      // stored is untouched -- this is only how the column reads.
      render: (row: any) => formatMobile(row?.mobile, mobileFormat),
    },
    {
      key: 'balance',
      header: 'Balance',
      headerClass: 'text-right',
      cellClass: 'text-right',
      // The party's ledger, signed: a plain figure is what they owe, a leading
      // minus is an advance -- the same language the Ledger and the invoice
      // screens already speak. The server sends it with the row, so the column
      // can be read against the ledger the row opens.
      //
      // Grouped the way the branch's own decimal setting asks, through the same
      // helper the Ledger's running balance uses -- which is also what turns a
      // nought (or a row with no ledger at all) into a dash.
      render: (row: any) => thousandSeparator(Number(row?.balance ?? 0)),
    },
    {
      key: "action",
      header: "Action",
      headerClass: 'text-center',
      // ⚠️ One icon where seven slots used to stand. Left without a width the
      // column takes an equal share of the page -- the same ~188px Name and
      // Address get -- to hold a 16px eye. `w-20` is what the heading itself
      // needs ("ACTION" at text-xs plus the cell's own px-3); less than that
      // and the word leaves the cell.
      cellClass: 'text-center w-20',
      // The actions themselves are in the panel below, built from the row the
      // menu was opened for -- this is only the thing that opens it.
      render: (row: any) => (
        <Button
          title="Actions"
          aria-label="Actions"
          aria-haspopup="true"
          aria-expanded={rowMenuRow?.id === row.id}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-300"
          onClick={(e) =>
            rowMenuRow?.id === row.id
              ? closeRowMenu()
              : openRowMenu(row, e.currentTarget)
          }
        >
          <FiEye size={20} />
        </Button>
      ),
    },
    // ⚠️ Spread, never `openingOn && {...}`: a guard that fails leaves a `false`
    // in this array, and the table gives a false its own heading, cell and col.
    // The figure first, its buttons next: the two belong together at the end of
    // the row, after the name and the contacts the sheet is being filled in for.
    ...(openingOn ? [openingFigureColumn, openingActionColumn] : []),
  ]
    // While the branch is still in opening, the list is a work sheet: the name,
    // the figure, where they live and how to reach them. So the columns that
    // carry no opening work stand down -- National ID, the ledger page, and the
    // customer's own actions, which `openingActionColumn` above takes the place
    // of. The Product list drops its price/action group for the same reason
    // rather than head two groups "Action".
    .filter(
      (column: any) => {
        // The branch's National ID switch stands the column down on its own:
        // where the form never asks for it, every row here would be blank.
        if (column.key === 'national_id') return needNationalId && !openingOn;

        return !(openingOn && ['ledger_page', 'action'].includes(column.key));
      },
    );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="List Customers" screen="customer-supplier" />
      </div>

      {/* Top Search Panel */}
      <div className="flex overflow-x-auto justify-between mb-1">
        {/* Enter anywhere on this row is the same as pressing Search -- see
            handleSearchKeyDown, which ignores every control here but the box. */}
        <div className="flex items-end" onKeyDown={handleSearchKeyDown}>
          {/* The classification, drawn and wired exactly as the Due List draws
              its own: the same four values, the same field, the same wording on
              the empty one. */}
          <div className="mr-1 md:mr-2">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Client Type
            </label>
            <DropdownCommon
              id="party_type_id"
              name="party_type_id"
              value={partyTypeId}
              onChange={handlePartyTypeChange}
              className="font-medium text-sm"
              data={CUSTOMER_TYPE_FILTER}
            />
          </div>

          <SelectOption
            onChange={handleSelectChange}
            className="mr-1 md:mr-2"
          />

          {/* The box takes comparisons as well as a word -- "> 200" narrows to
              the parties whose Balance meets it, and "> 0 and < 500" narrows to
              a range; everything else is the search it has always been. The hint
              is here rather than inside SearchInput because that component is on
              fifty screens and this syntax belongs to one of them.

              ⚠️ `searchText`, not `search`. Handed the applied term, the box
              would be reset to it the moment the address was written -- and
              every keystroke would be gone before the next one arrived. */}
          <SearchInput
            search={searchText}
            setSearchValue={setSearchText}
            className="text-nowrap"
            placeholder="Search... or > 0 and < 500"
          />

          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            className="whitespace-nowrap"
            icon={<FiSearch size={15} />}
          />

          {/* Beside Search, in the same row: everything below it is the answer
              to what is above it, and the sheet it prints carries the same
              filters -- see printFilterLine.

              Rows and Font are the two boxes every print toolbar carries (the
              Cash Book draws the same pair); Print stands last. Both belong to
              the paper alone -- see the note over printRowsPerPage. */}
          <div className="ml-2">
            
            <PrintRowsInput
              id="printRowsPerPage"
              name="printRowsPerPage"
              label=""
              value={printRowsPerPage.toString()}
              onChange={handlePrintRowsChange}
              type="text"
              className="font-medium text-sm w-16! text-center"
            />
          </div>

          <div className="ml-2">
            
            <PrintFontInput
              id="printFontSize"
              name="printFontSize"
              label=""
              value={printFontSize.toString()}
              onChange={handlePrintFontSizeChange}
              type="text"
              className="font-medium text-sm w-16! text-center"
            />
          </div>

          <PrintButton
            onClick={handlePrintList}
            label="Print"
            className="ml-2 whitespace-nowrap"
            disabled={printingList}
          />
        </div>

        <ButtonLoading
          onClick={() => navigate('/customer-supplier/create')}
          buttonLoading={false}
          label="Add Customer"
          className="whitespace-nowrap text-center mr-0"
          icon={<FiPlus className="text-lg ml-2 mr-2" />}
        />
      </div>

      {/* Table Section */}
      <div className="relative overflow-x-auto overflow-y-hidden">
        {customers.loading && <Loader />}

        <Table
          columns={columns}
          data={tableData}
          // Named, so an empty table under a chosen classification says which
          // one it is empty for rather than looking like a branch with no
          // customers at all.
          noDataMessage={
            partyTypeId ? 'No records for the selected client type.' : undefined
          }
        />

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        )}
      </div>

      {/* The row's actions, one strip of the very icons the column used to hold
          -- same colours, same conditions, name on hover. It is built HERE
          rather than inside the column because it hangs off the viewport, not
          off the cell (see openRowMenu), and because there is only ever one of
          it while there are ten rows.

          ⚠️ Every item closes the panel before it does anything. Delete and the
          three popups raise an overlay of their own, and a panel left standing
          would go on hanging over it. */}
      {rowMenuRow && rowMenuPos ? (
        <div
          ref={rowMenuPanelRef}
          style={rowMenuPos}
          role="menu"
          className="z-50 flex w-max flex-nowrap items-center gap-2 overflow-x-auto rounded-sm border border-[rgb(var(--c-border))] bg-white px-2 py-1 shadow-lg dark:bg-[rgb(var(--c-boxdark))]"
        >
          {rowMenuRow.guarantors?.length > 0 && (
            <Button
              role="menuitem"
              title="View guarantors"
              aria-label="View guarantors"
              className="text-indigo-600 hover:text-indigo-800"
              onClick={() => {
                closeRowMenu();
                setSelectedGuarantors(rowMenuRow.guarantors);
                setShowGuarantorModal(true);
              }}
            >
              <FiUsers size={20} />
            </Button>
          )}

          {rowMenuRow.nominees?.length > 0 && (
            <Button
              role="menuitem"
              title="View nominees"
              aria-label="View nominees"
              className="text-emerald-600 hover:text-emerald-800"
              onClick={() => {
                closeRowMenu();
                setSelectedNominees(rowMenuRow.nominees);
                setShowNomineeModal(true);
              }}
            >
              <FiBook size={20} />
            </Button>
          )}

          <Button
            role="menuitem"
            title="Print profile (PDF)"
            aria-label="Print profile (PDF)"
            className="text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-white"
            disabled={printingCustomerId === rowMenuRow.id}
            onClick={() => {
              closeRowMenu();
              handlePrintRow(rowMenuRow);
            }}
          >
            <FiPrinter size={20} />
          </Button>

          <Button
            role="menuitem"
            title="Change log"
            aria-label="Change log"
            className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            onClick={() => {
              closeRowMenu();
              handleShowHistory(rowMenuRow);
            }}
          >
            <FiClock size={20} />
          </Button>

          {canViewLedger && (
            <Button
              role="menuitem"
              title="Recent transactions"
              aria-label="Recent transactions"
              className="text-teal-600 hover:text-teal-800"
              onClick={() => {
                closeRowMenu();
                setReportParty(rowMenuRow);
              }}
            >
              <FiList size={20} />
            </Button>
          )}

          {canEditCustomer && (
            <Button
              role="menuitem"
              title="Edit"
              aria-label="Edit"
              className="text-blue-600 hover:text-blue-800"
              onClick={() => {
                closeRowMenu();
                navigate(`/customer-supplier/edit/${rowMenuRow.id}`, {
                  // Where to come back to once the edit is saved. Cancel uses
                  // the browser's own Back and finds this address anyway;
                  // saving navigates forward, and needs telling.
                  state: { returnTo: `${location.pathname}${location.search}` },
                });
              }}
            >
              <FiEdit2 size={24} />
            </Button>
          )}

          {canDeleteCustomer && (
            <Button
              role="menuitem"
              title="Delete"
              aria-label="Delete"
              className="text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={deletingCustomerId === rowMenuRow.id}
              onClick={() => {
                closeRowMenu();
                handleDeleteRow(rowMenuRow);
              }}
            >
              <FiTrash2 size={18} />
            </Button>
          )}
        </div>
      ) : null}

      <ConfirmModal
        show={Boolean(deleteConfirmRow)}
        title="Confirm Deletion"
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>Are you sure you want to delete voucher</div>
            <div className="font-bold text-slate-800 dark:text-[rgb(var(--c-text))]">
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
            <div className="font-bold text-slate-800 dark:text-[rgb(var(--c-text))]">
              {openingDeleteRow?.name}
            </div>
            <div className="mt-2 text-sm">
              Amount{' '}
              <span className="font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
                {openingDeleteRow?.openingbalance}
              </span>
              {' · '}Voucher{' '}
              <span className="font-mono font-semibold text-slate-800 dark:text-[rgb(var(--c-text))]">
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

      {historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20">
          <div
            className="bg-white dark:bg-gray-800
 rounded-sm
 w-[900px] max-h-[85vh]
 overflow-hidden
 shadow-xl
 border border-[rgb(var(--c-border))]"
          >
            <div
              className="flex justify-between items-center
 px-4 py-3
 bg-gray-300 dark:bg-gray-700
 border-b border-[rgb(var(--c-border))]"
            >
              <h2 className="text-xs font-semibold uppercase text-gray-800 dark:text-gray-200">
                Change Log — {historyCustomer?.name}
              </h2>

              <Button
                onClick={() => setHistoryCustomer(null)}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500"
              >
                <FiX className="text-lg cursor-pointer" />
              </Button>
            </div>

            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-full text-sm text-left text-gray-700 dark:text-gray-300">
                <thead
                  className="text-xs uppercase
 bg-gray-200 dark:bg-gray-700
 text-gray-800 dark:text-gray-300
 border-b border-[rgb(var(--c-border))]"
                >
                  <tr>
                    <th className="px-3 py-2 w-44">When</th>
                    <th className="px-3 py-2 w-40">Who</th>
                    <th className="px-3 py-2 w-24">Action</th>
                    <th className="px-3 py-2">What changed</th>
                  </tr>
                </thead>

                <tbody
                  className="bg-[rgb(var(--c-table-body))]
 divide-y divide-gray-200 dark:divide-gray-700"
                >
                  {historyLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                        Loading…
                      </td>
                    </tr>
                  ) : historyEvents.length > 0 ? (
                    historyEvents.map((event: any) => (
                      <tr key={event.id} className="align-top">
                        <td className="px-3 py-2 whitespace-nowrap">{historyStamp(event.at)}</td>
                        <td className="px-3 py-2">{event.user || '—'}</td>
                        <td className="px-3 py-2 capitalize">{event.action}</td>
                        <td className="px-3 py-2">
                          {Array.isArray(event.changes) && event.changes.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {event.changes.map((change: any, index: number) => (
                                <div key={index} className="flex flex-wrap items-baseline gap-2">
                                  <span className="font-semibold">{change.field}:</span>
                                  {/* A create has nothing before it, so it prints
                                      the value alone rather than an arrow out of
                                      an empty dash. */}
                                  {event.action === 'update' ? (
                                    <>
                                      <span className="line-through opacity-70">
                                        {historyValue(change.old)}
                                      </span>
                                      <span>→</span>
                                      <span className="font-semibold">{historyValue(change.new)}</span>
                                    </>
                                  ) : (
                                    <span>{historyValue(change.new ?? change.old)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">
                        Nothing recorded for this customer yet. Changes made before the log was
                        switched on are not in it.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showGuarantorModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-50">

          {/* ===== Modal Box ===== */}
          <div
            className="bg-white dark:bg-gray-800
 rounded-sm
 w-[800px] max-h-[85vh]
 overflow-hidden
 shadow-xl
 border border-[rgb(var(--c-border))]"
          >

            {/* ===== Header ===== */}
            <div
              className="flex justify-between items-center
 px-4 py-3
 bg-gray-300 dark:bg-gray-700
 border-b border-[rgb(var(--c-border))]"
            >
              <h2 className="text-xs font-semibold uppercase text-gray-800 dark:text-gray-200">
                Guarantor Details
              </h2>

              <Button
                onClick={() => setShowGuarantorModal(false)}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500"
              >
                <FiX className="text-lg cursor-pointer" />
              </Button>
            </div>

            {/* ===== Body ===== */}
            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-full table-fixed text-sm text-left text-gray-700 dark:text-gray-300">

                {/* ===== Table Head ===== */}
                <thead
                  className="text-xs uppercase
 bg-gray-200 dark:bg-gray-700
 text-gray-800 dark:text-gray-300
 border-b border-[rgb(var(--c-border))]"
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
                  className="bg-[rgb(var(--c-table-body))] 
 divide-y divide-gray-200 dark:divide-gray-700"
                >
                  {selectedGuarantors.length > 0 ? (
                    selectedGuarantors.map((g, index) => (
                      <tr
                        key={index}
                        className="hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-2 truncate">{g.name}</td>
                        <td className="px-3 py-2 truncate">{g.father_name}</td>
                        <td className="px-3 py-2 text-center">{formatMobile(g.mobile, mobileFormat)}</td>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-50">
          <div
            className="bg-white dark:bg-gray-800
 rounded-sm
 w-[1100px] max-h-[85vh]
 overflow-hidden
 shadow-xl
 border border-[rgb(var(--c-border))]"
          >
            <div
              className="flex justify-between items-center
 px-4 py-3
 bg-gray-300 dark:bg-gray-700
 border-b border-[rgb(var(--c-border))]"
            >
              <h2 className="text-xs font-semibold uppercase text-gray-800 dark:text-gray-200">
                Nominee Details
              </h2>

              <Button
                onClick={() => setShowNomineeModal(false)}
                className="text-gray-600 dark:text-gray-300 hover:text-red-500"
              >
                <FiX className="text-lg cursor-pointer" />
              </Button>
            </div>

            <div className="overflow-auto max-h-[75vh]">
              <table className="min-w-full table-fixed text-sm text-left text-gray-700 dark:text-gray-300">
                <thead
                  className="text-xs uppercase
 bg-gray-200 dark:bg-gray-700
 text-gray-800 dark:text-gray-300
 border-b border-[rgb(var(--c-border))]"
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
                  className="bg-[rgb(var(--c-table-body))] 
 divide-y divide-gray-200 dark:divide-gray-700"
                >
                  {selectedNominees.length > 0 ? (
                    selectedNominees.map((n, index) => (
                      <tr
                        key={index}
                        className="hover:bg-emerald-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-2 truncate">{n.name}</td>
                        <td className="px-3 py-2 truncate">{n.relation.toUpperCase() || ''}</td>
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

      {/* The transactions popup: the party's last N days, N coming from Branch
          Setup, with the dates editable inside. */}
      {reportParty && (
        <PartyLedgerModal
          party={reportParty}
          onClose={() => setReportParty(null)}
        />
      )}

      {/* The sheet itself, drawn off-screen and cloned by react-to-print. ⚠️ The
          ref is on the print node and the hiding on this wrapper: a `hidden` on
          the node the ref points at is cloned with it and prints a blank page.
          The three column flags are the screen's own conditions, so paper and
          screen stand the same columns down. */}
      <div className="hidden">
        <CustomerListPrint
          ref={printRef}
          rows={printRows}
          filterLine={printFilterLine}
          rowsPerPage={printRowsPerPage}
          fontSize={printFontSize}
          showNationalId={needNationalId && !openingOn}
          showLedgerPage={!openingOn}
          showOpening={openingOn}
        />
      </div>

    </div>
  );
};

export default CustomerSupplier;
