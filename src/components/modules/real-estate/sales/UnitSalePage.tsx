import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2, 
  FiArrowLeft,
  FiSave,
  FiLoader,
} from "react-icons/fi";

import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import BuildingUnitDropdown from "../../../utils/utils-functions/BuildingUnitDropdown";
import BuildingParkingDropdown from "../../../utils/utils-functions/BuildingParkingDropdown";
import BuildingUnitChargesDropdown from "../../../utils/utils-functions/BuildingUnitChargesDropdown";
import InputElement from "../../../utils/fields/InputElement";
import InputDatePicker from "../../../utils/fields/DatePicker";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchSaleForEdit,
  storeSalePricing,
  updateSalePricing,
} from "./unitSaleSlice";
import { SaleEditGuards } from "./types";
import routes from "../../../services/appRoutes";
import { unitDdl } from "../units/unitSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { UNIT_SALE_PAYMENT_MODES } from "../../../constant/constant/variables";
import httpService from "../../../services/httpService";
import { API_UNIT_SALE_CUSTOMER_NOMINEES_URL } from "../../../services/apiRoutes";

/* ================= TYPES ================= */

type ChargeType = "UNIT_PRICE" | "PARKING" | "CUSTOM";
type EditMode = "LOCKED" | "EDITABLE";

type LinkedTo =
  | { kind: "unit"; label: string; unitId: number }
  | { kind: "parking"; label: string; parkingId: number }
  | null;

type ChargeEffect = "+" | "-";

type PriceItem = {
  id: number;
  type: ChargeType;
  title: string;
  effect?: ChargeEffect;
  linkedTo: LinkedTo;
  amount: number;
  note?: string;
  editMode: EditMode;
};

/** One person on the buyer's nominee list, as the customer screen saved them. */
type CustomerNominee = {
  id: number;
  name: string;
  relation: string | null;
  mobile: string | null;
  national_id: string | null;
  /** The buyer's own default, offered here and overridable per property. */
  share_percentage: string | number | null;
  priority_order: number | null;
};

/** What this sale says about one of them: ticked, and for how much. */
type NomineePick = {
  checked: boolean;
  share: string;
};

/* ================= HELPERS ================= */

const formatAmount = (n: number) =>
  `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("en-US")}`;

const calculateTotal = (items: PriceItem[]) =>
  items.reduce((sum, it) => {
    if (it.effect === "-") return sum - Math.abs(it.amount);
    return sum + Math.abs(it.amount);
  }, 0);

const linkedToText = (l: LinkedTo) =>
  !l ? "-" : l.kind === "unit" ? `Unit: ${l.label}` : `Parking: ${l.label}`;

const safeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Size x rate rarely lands on a whole taka (1,229.6 sqft at 203.32 gives
 * 249,999.6). Money here is billed, receipted and reported in whole taka, so
 * the paisa is dropped at the point the figure is born rather than rounded away
 * later in each report -- that way the lines still add up to the total shown.
 */
const wholeTaka = (size: number, rate: number) => Math.floor(size * rate);

/**
 * "wife" reads as Wife, "grand father" as Grand Father. Relations are stored as
 * the dropdown's own lowercase values, which is right for a stored value and
 * wrong on a line somebody reads.
 */
const titleCase = (value?: string | null) =>
  (value ?? "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * The date as the server takes it.
 *
 * Built from the local parts rather than toISOString(), which converts to UTC
 * first and hands back yesterday for anything before 6am here.
 */
const isoDate = (date: Date | null) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`
    : null;

/** "2026-01-20" from the server, as a Date the picker can hold. */
const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/* ================= PAGE ================= */

/**
 * Pricing a flat, and correcting one already priced.
 *
 * The same screen does both: an edit is the same set of charges being typed
 * again, and a second screen for it would drift from this one the first time a
 * charge type changed. What differs is what is allowed to move. The buyer and
 * the flat are printed on papers the buyer already holds -- the allotment
 * letter, the booking form, the money receipt -- so in edit mode they are shown
 * and not touched, and correcting either is a cancellation rather than an edit.
 * The money taken so far is not touched here either; that lives on the payment
 * screens, and this one only says how much has come in so the total is not set
 * below it.
 */
export default function UnitSalePage() {
  const { loading } = useSelector((state: any) => state.unitSale ?? { loading: false });

  // A sale id in the path is what puts this screen into edit mode. Reached from
  // the sold-units report, which is where a wrong figure is noticed.
  const { id } = useParams();
  const saleId = Number(id) || 0;
  const isEdit = saleId > 0;

  const [saleLoading, setSaleLoading] = useState(false);
  const [guards, setGuards] = useState<SaleEditGuards | null>(null);
  const [saleDate, setSaleDate] = useState<Date | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedParking, setSelectedParking] = useState<any>(null);

  const [items, setItems] = useState<PriceItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const [chargeType, setChargeType] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [checkNumber, setCheckNumber] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [branchName, setBranchName] = useState<string>("");
  const [moneyReceipt, setMoneyReceipt] = useState<string>("");

  // ✅ NEW: Booking money state (separate from chargeAmount)
  const [bookingMoney, setBookingMoney] = useState<string>("");
  const [note, setNote] = useState<string>("");

  /* ================= NOMINEES =================
     Who the buyer leaves THIS property to. The list of people comes off the
     customer, but the choice is made per sale: one buyer holding three flats
     may leave each of them to somebody different. */
  const [customerNominees, setCustomerNominees] = useState<CustomerNominee[]>([]);
  const [nomineePicks, setNomineePicks] = useState<Record<number, NomineePick>>({});
  const [nomineesLoading, setNomineesLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  /**
   * Fills the screen from the sale being corrected.
   *
   * The customer, unit and parking come back as the dropdown options they were
   * picked from, so they drop straight into the state a fresh selection would
   * have set — which is how the read-only boxes print their labels without a
   * second lookup, and how the parking dropdown opens showing what is on the
   * sale today.
   */
  useEffect(() => {
    if (!isEdit) return;

    let cancelled = false;
    setSaleLoading(true);

    (dispatch as any)(fetchSaleForEdit(saleId))
      .unwrap()
      .then((data: any) => {
        if (cancelled) return;

        const sale = data?.sale ?? {};

        setSelectedCustomer(sale.customer ?? null);
        setSelectedUnit(sale.unit ?? null);
        setSelectedParking(sale.parking ?? null);
        setNote(sale.note ?? "");
        setSaleDate(parseDate(sale.sale_date));
        setGuards(data?.guards ?? null);

        setItems(
          (Array.isArray(sale.items) ? sale.items : []).map((item: any) => ({
            ...item,
            // Decimal columns come back as strings, and the total is added up
            // from these.
            amount: safeNumber(item.amount),
          })),
        );
      })
      .catch((message: string) =>
        cancelled ? null : toast.error(message || "Could not load this sale."),
      )
      .finally(() => {
        if (!cancelled) setSaleLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isEdit, saleId]);

  /**
   * Loads the buyer's nominee list whenever the buyer changes.
   *
   * Nothing is ticked to begin with. The customer screen's list is an address
   * book, not a decision about this property, and pre-ticking it would put
   * people on a booking form nobody chose to put there.
   */
  useEffect(() => {
    // Not part of an edit. Who a flat is left to is named against the property
    // from the sold-units report, which is also where it is changed afterwards
    // -- and most buyers decide long after the booking money is taken.
    if (isEdit) return;

    const coa4Id = selectedCustomer?.value;

    setNomineePicks({});

    if (!coa4Id) {
      setCustomerNominees([]);
      return;
    }

    let cancelled = false;
    setNomineesLoading(true);

    (async () => {
      try {
        const response = await httpService.get(
          `${API_UNIT_SALE_CUSTOMER_NOMINEES_URL}${coa4Id}/nominees`,
        );
        // foundData() wraps twice: { data: { data: <payload> } }.
        const list = response?.data?.data?.data?.available ?? [];
        if (!cancelled) setCustomerNominees(Array.isArray(list) ? list : []);
      } catch {
        // A customer with no nominees answers 404, and so does one whose branch
        // never captures them. Neither is an error worth a toast on a screen
        // whose job is the pricing.
        if (!cancelled) setCustomerNominees([]);
      } finally {
        if (!cancelled) setNomineesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomer?.value]);

  const toggleNominee = (id: number, nominee: CustomerNominee) =>
    setNomineePicks((prev) => {
      const next = { ...prev };

      if (next[id]?.checked) {
        delete next[id];
        return next;
      }

      next[id] = {
        checked: true,
        // The customer-level share as the starting point; the buyer decides
        // per property, and most of the time it is the same figure.
        share:
          nominee.share_percentage === null || nominee.share_percentage === ""
            ? ""
            : String(nominee.share_percentage),
      };

      return next;
    });

  const setNomineeShare = (id: number, share: string) =>
    setNomineePicks((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], share } } : prev
    );

  const pickedNominees = useMemo(
    () =>
      customerNominees
        .filter((n) => nomineePicks[n.id]?.checked)
        .map((n, index) => ({
          nominee_id: n.id,
          share_percentage: nomineePicks[n.id]?.share?.trim()
            ? Number(nomineePicks[n.id].share)
            : null,
          // The order they are ticked in on screen is the order they print in.
          priority_order: index + 1,
        })),
    [customerNominees, nomineePicks]
  );

  /** Only the shares actually filled in; a blank is a nomination, not a zero. */
  const shareTotal = useMemo(
    () =>
      pickedNominees.reduce(
        (sum, n) => sum + (n.share_percentage === null ? 0 : n.share_percentage),
        0
      ),
    [pickedNominees]
  );

  /* ================= UNIT ================= */

  const onUnitSelect = (option: any | null) => {
    if (!option) {
      setSelectedUnit(null);
      setItems([]);
      return;
    }

    setSelectedUnit(option);

    const size = Number(option.label_0 || 0);
    const rate = Number(option.label_1 || 0);
    const amount = wholeTaka(size, rate);

    setItems((prev) => {
      const exists = prev.find((x) => x.type === "UNIT_PRICE");

      if (exists) {
        return prev.map((x) =>
          x.type === "UNIT_PRICE"
            ? {
              ...x,
              linkedTo: {
                kind: "unit",
                label: option.label,
                unitId: option.value,
              },
              amount,
              note: `Size: ${size} × ${rate}`,
            }
            : x
        );
      }

      return [
        {
          id: Date.now(),
          type: "UNIT_PRICE",
          title: "Unit Price",
          effect: "+",
          linkedTo: {
            kind: "unit",
            label: option.label,
            unitId: option.value,
          },
          amount,
          note: `Auto: ${size} × ${rate}`,
          editMode: "LOCKED",
        },
      ];
    });
  };

  /* ============ PRESELECT UNIT (from Flat Layout → Sale / Booking) ============
     FlatLayout navigates here with { unitId, unitNo } in the router state. The
     unit dropdown loads options by search, and the price row needs the option's
     size/rate — so look the unit up by its number and select the full option. */

  const preselectedUnitId = (location.state as any)?.unitId;
  const preselectedUnitNo = (location.state as any)?.unitNo;
  const preselectHandled = useRef(false);

  useEffect(() => {
    if (preselectHandled.current || !preselectedUnitId) return;
    preselectHandled.current = true;

    (async () => {
      try {
        const response = await (dispatch as any)(
          unitDdl(String(preselectedUnitNo ?? "")),
        ).unwrap();

        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        const match =
          list.find((o: any) => String(o.value) === String(preselectedUnitId)) ??
          list.find((o: any) => String(o.label) === String(preselectedUnitNo));

        if (match) onUnitSelect(match);
      } catch {
        // Leave the dropdown empty — the user can still pick the unit manually.
      }
    })();
  }, [preselectedUnitId, preselectedUnitNo]);

  /* ================= PARKING ================= */

  const onParkingSelect = (option: any | null) => {
    if (!option) {
      setSelectedParking(null);
      setItems((p) => p.filter((x) => x.type !== "PARKING"));
      return;
    }

    setSelectedParking(option);

    const size = Number(option.label_0 || 0);
    const rate = Number(option.label_1 || 0);
    const amount = wholeTaka(size, rate);

    setItems((prev) => {
      const exists = prev.find((x) => x.type === "PARKING");

      if (exists) {
        return prev.map((x) =>
          x.type === "PARKING"
            ? {
              ...x,
              linkedTo: {
                kind: "parking",
                label: option.label,
                parkingId: option.value,
              },
              amount,
              note: `Auto: ${size} × ${rate}`,
            }
            : x
        );
      }

      return [
        ...prev,
        {
          id: Date.now() + 1,
          type: "PARKING",
          title: "Parking",
          effect: "+",
          linkedTo: {
            kind: "parking",
            label: option.label,
            parkingId: option.value,
          },
          amount,
          note: `Auto: ${size} × ${rate}`,
          editMode: "LOCKED",
        },
      ];
    });
  };
  const removeParking = () => {
    setSelectedParking(null);
    setItems((p) => p.filter((x) => x.type !== "PARKING"));
  };
  /* ================= CUSTOM CHARGE ================= */

  const addCustomCharge = () => {
    if (!chargeType) {
      toast.info("Please select a charge type.");
      return;
    }

    if (!chargeAmount) {
      toast.info("Please enter amount.");
      return;
    }

    // Whole taka only, here as everywhere else on this page: 100.99 is 100.
    const amt = Math.floor(safeNumber(chargeAmount));
    if (amt <= 0) {
      toast.info("Amount must be greater than 0.");
      return;
    }

    setItems((prev) => {
      const exists = prev.find(
        (x) => x.type === "CUSTOM" && x.title === chargeType.label
      );

      // If already exists → update
      if (exists) {
        return prev.map((x) =>
          x.id === exists.id
            ? {
              ...x,
              amount: Math.abs(amt),
              effect: chargeType.label_2 === "-" ? "-" : "+",
            }
            : x
        );
      }

      // Else add new
      return [
        ...prev,
        {
          id: Date.now(),
          type: "CUSTOM",
          title: chargeType.label,
          effect: chargeType.label_2 === "-" ? "-" : "+",
          linkedTo: null,
          amount: Math.abs(amt),
          editMode: "EDITABLE",
        },
      ];
    });

    setChargeType(null);
    setChargeAmount("");
  };

  /* ================= INLINE EDIT ================= */

  const startEdit = (it: PriceItem) => {
    if (it.editMode !== "EDITABLE") return;
    setEditingId(it.id);
    setDraftValue(String(it.amount));
  };

  const saveEdit = (it: PriceItem) => {
    const val = Math.floor(Number(draftValue));
    if (Number.isNaN(val) || val <= 0) return;

    setItems((p) => p.map((x) => (x.id === it.id ? { ...x, amount: Math.abs(val) } : x)));
    setEditingId(null);
  };

  /* ================= TOTAL / DUE ================= */

  const total = useMemo(() => calculateTotal(items), [items]);

  const bookingAmt = useMemo(() => {
    const n = safeNumber(bookingMoney);
    return n < 0 ? 0 : Math.floor(n); // INT field in DB
  }, [bookingMoney]);

  const due = useMemo(() => Math.max(total - bookingAmt, 0), [total, bookingAmt]);

  /* ================= API ================= */
  const showBankFields = paymentMode === "CHEQUE" || paymentMode === "BANK_TRANSFER";

  const apiPayload = {
    customer: selectedCustomer,
    unit: selectedUnit,
    parking: selectedParking,

    // ✅ NEW
    payment_mode: paymentMode,
    receipt_no: moneyReceipt || null,
    booking_amt: bookingAmt,
    note: note || null,

    // ✅ only if cheque
    reference_no: showBankFields ? checkNumber : null,
    bank_name: showBankFields ? bankName : null,
    branch_name: showBankFields ? branchName : null,

    // Who inherits this property. Empty is allowed: plenty of bookings are
    // signed before the buyer has settled on a nominee, and the sold-units
    // report is where one is added afterwards.
    nominees: pickedNominees,

    items: items.map((it) => ({
      id: it.id,
      type: it.type,
      title: it.title,
      effect: it.effect,
      linkedTo: it.linkedTo,
      amount: it.amount,
      note: it.note ?? null,
      editMode: it.editMode,
    })),

    total,
    due, // optional (frontend convenience)
  };

  /**
   * Sends back only what an edit is allowed to move.
   *
   * The buyer and the flat are deliberately absent from the payload: the server
   * reads both off the sale, so a screen holding the wrong ones cannot put them
   * on the books. Booking money is absent for the same reason from the other
   * side -- money that changed hands is corrected where it was taken.
   */
  const submitEdit = async () => {
    if (loading) return;

    if (!items.length) {
      toast.info("A sale needs at least one charge line.");
      return;
    }

    const received = guards?.received ?? 0;

    // Said here as well as on the server: the clerk should learn it while the
    // figure is still in front of them, not after the save is attempted.
    if (received > 0 && total < received) {
      toast.info(
        `Tk. ${formatAmount(received)} has already been received against this sale, so the total cannot be less than that.`,
      );
      return;
    }

    const response: any = await dispatch(
      updateSalePricing({
        saleId,
        payload: {
          parking: selectedParking,
          items: items.map((it) => ({
            id: it.id,
            type: it.type,
            title: it.title,
            effect: it.effect,
            linkedTo: it.linkedTo,
            amount: it.amount,
            note: it.note ?? null,
            editMode: it.editMode,
          })),
          total,
          sale_date: isoDate(saleDate),
          note: note || null,
        },
      }) as any,
    );

    if (updateSalePricing.fulfilled.match(response)) {
      toast.success(response?.payload?.message || "Sale updated.");
      // Back to where the wrong figure was spotted, with the corrected one on it.
      navigate(routes.real_estate_sold_units);
    } else {
      toast.error(response?.payload || "Could not update the sale.");
    }
  };

  const submitToApi = async () => {
    if (loading) return; // ✅ block double click

    if (!selectedCustomer || !selectedUnit) {
      toast.info("Please select customer and unit before saving.");
      return;
    }

    if (!bookingAmt || bookingAmt < 0 || Number.isNaN(bookingAmt)) {
      toast.info("Booking money cannot be zero or negative.");
      return;
    }

    if (bookingAmt > total) {
      toast.info("Booking money cannot be greater than grand total.");
      return;
    }

    // The same two rules the server enforces, said here so the clerk is not
    // told after the voucher has been attempted. A share left blank is a
    // nomination whose division is left to law, which is allowed.
    const shared = pickedNominees.filter((n) => n.share_percentage !== null);
    if (shared.length && shareTotal > 100) {
      toast.info(`Nominee shares add up to ${shareTotal}%, which is more than the property.`);
      return;
    }
    if (shared.length && shared.length === pickedNominees.length && Math.abs(shareTotal - 100) > 0.01) {
      toast.info(
        `Every nominee carries a share, so they must add up to 100% — they add up to ${shareTotal}%.`,
      );
      return;
    }

    const response: any = await dispatch(storeSalePricing(apiPayload) as any);


    if (storeSalePricing.fulfilled.match(response)) {
      // Prefer the structured vr_no over the message text, which is only a
      // sentence the API happens to phrase this way today.
      const vrNo = response?.payload?.data?.data?.vr_no;
      toast.success(
        vrNo
          ? `Vr. No. ${vrNo}`
          : response?.payload?.message || "Unit sale transaction saved successfully",
      );

      // ✅ clear only the table part + inputs
      setItems([]);
      // The customer stays selected for the next flat, so their nominee list
      // stays loaded -- but the ticks do not: the next sale is a fresh decision.
      setNomineePicks({});
      setBookingMoney("");
      setChargeType(null);
      setChargeAmount("");
      setEditingId(null);
      setDraftValue("");
      setNote("");
      setMoneyReceipt("");
      setPaymentMode("CASH");
      setCheckNumber("");
      setBankName("");
      setBranchName("");
    } else {
      // A failed save is an error, not a notice: toast.info renders it in the
      // same blue style as a success.
      toast.error(response?.payload || "Failed to save.");
    }
  };

  const onPaymentModeChange = (v: string) => {
    setPaymentMode(v);

    if (v !== "CHEQUE" && v !== "BANK_TRANSFER") {
      setCheckNumber("");
      setBankName("");
      setBranchName("");
    }
  };


  /* ================= UI ================= */

  return (
    <div className="mx-auto">
      <HelmetTitle title={isEdit ? "Edit Unit Sale" : "Unit Sales"} />

      <div className="mb-2 flex justify-between">
        <div>
          <h1 className="text-md font-semibold text-gray-900 dark:text-white">
            {isEdit ? "Edit Unit Sale" : "Unit Sales Pricing Builder"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isEdit
              ? `Charges, parking and date${
                  guards?.vr_no ? ` · Vr. No. ${guards.vr_no}` : ""
                }`
              : "Unit & Parking with others calculation"}
          </p>
        </div>

        <div className="text-right space-y-1 text-sm">
          <div className="text-gray-900 dark:text-white">
            <span className="text-gray-700 dark:text-gray-200">Grand Total:</span>{" "}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatAmount(total)}
            </span>
          </div>

          <div className="flex justify-end gap-4">
            {/* On an edit the money is history, not something being typed: what
                matters is what has come in and what is still owed on the
                corrected figure. */}
            <div className="text-gray-700 dark:text-gray-200">
              {isEdit ? "Received: " : "Booking: "}
              <span className="font-semibold">
                {formatAmount(isEdit ? guards?.received ?? 0 : bookingAmt)}
              </span>
            </div>
            <div className="text-gray-700 dark:text-gray-200">
              Due:{" "}
              <span className="font-semibold">
                {formatAmount(
                  isEdit ? Math.max(total - (guards?.received ?? 0), 0) : due,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="lg:col-span-4 space-y-1">
          <div className="rounded  dark:bg-gray-800 py-3 px-4">
            {/* Both are on papers the buyer already holds, so an edit shows them
                and leaves them alone. Getting either wrong is a cancellation,
                not a correction. */}
            <label className="text-sm font-semibold">
              {isEdit ? "Customer" : "Select Customer"}
            </label>
            {isEdit ? (
              <div className="mb-1 rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-200">
                {selectedCustomer?.label || "—"}
              </div>
            ) : (
              <DdlMultiline onSelect={setSelectedCustomer} acType="" />
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div>
                <label className="block mt-1 text-sm font-semibold">
                  {isEdit ? "Unit" : "Select Unit"}
                </label>
                {isEdit ? (
                  <div className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-700/40 dark:text-gray-200">
                    {selectedUnit?.label || "—"}
                  </div>
                ) : (
                  <BuildingUnitDropdown onSelect={onUnitSelect} value={selectedUnit} />
                )}
              </div>
              <div>
                <label className="block mt-1 text-sm font-semibold">
                  Select Parking
                </label>
                {/* Editable in both modes: a parking added, dropped or swapped
                    is the correction this screen is most often opened for. */}
                <BuildingParkingDropdown
                  onSelect={onParkingSelect}
                  value={selectedParking}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 mt-2">
              <div>
                <label className="text-sm font-semibold">Charge Type</label>
                <BuildingUnitChargesDropdown onSelect={setChargeType} />
              </div>

              <div className="">
                <label className="text-sm font-semibold">Amount (Tk.)</label>
                <InputElement
                  id="amount"
                  name="amount"
                  type="number"
                  label=""
                  className="text-sm h-9.5"
                  value={chargeAmount}
                  onChange={(e: any) => setChargeAmount(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={addCustomCharge}
              className="mt-2 inline-flex items-center gap-2  bg-gray-300 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-400 transition dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <FiPlus className="text-gray-900 dark:text-gray-100" />
              Add Charge
            </button>

            {/* Who this property is left to. Only shown once a buyer is chosen:
                the list is theirs, and an empty box before that explains
                nothing. People are added on the customer screen -- this screen
                only decides which of them stand against THIS property. */}
            {!isEdit && selectedCustomer && (
              <div className="mt-3 border-t border-gray-300 pt-2 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Nominee for this property</label>
                  {pickedNominees.length > 0 && (
                    <span
                      className={`text-xs ${
                        shareTotal > 100 ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {pickedNominees.length} selected
                      {shareTotal > 0 ? ` · ${shareTotal}%` : ""}
                    </span>
                  )}
                </div>

                {nomineesLoading ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading…</p>
                ) : customerNominees.length === 0 ? (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This customer has no nominee on file. Add them on the customer
                    screen, then they can be named here.
                  </p>
                ) : (
                  <div className="mt-1 max-h-44 space-y-1 overflow-y-auto pr-1">
                    {customerNominees.map((nominee) => {
                      const pick = nomineePicks[nominee.id];

                      return (
                        <div
                          key={nominee.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            id={`nominee-${nominee.id}`}
                            checked={Boolean(pick?.checked)}
                            onChange={() => toggleNominee(nominee.id, nominee)}
                            className="h-4 w-4 shrink-0"
                          />
                          <label
                            htmlFor={`nominee-${nominee.id}`}
                            className="flex-1 cursor-pointer truncate"
                            title={[nominee.name, nominee.relation, nominee.mobile]
                              .filter(Boolean)
                              .join(" · ")}
                          >
                            {nominee.name}
                            {nominee.relation ? (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {" "}
                                ({titleCase(nominee.relation)})
                              </span>
                            ) : null}
                          </label>

                          {/* Only for the ticked ones: a share against somebody
                              who is not a nominee of this flat means nothing. */}
                          {pick?.checked && (
                            <div className="flex items-center gap-1">
                              <InputElement
                                id={`nominee-share-${nominee.id}`}
                                name={`nominee-share-${nominee.id}`}
                                type="number"
                                label=""
                                placeholder="%"
                                className="h-7 w-16 text-right text-xs"
                                value={pick.share}
                                onChange={(e: any) =>
                                  setNomineeShare(nominee.id, e.target.value)
                                }
                              />
                              <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pickedNominees.length > 1 && shareTotal === 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Shares left blank — the property is left to them jointly.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Correcting a sale asks for none of the payment boxes: the booking
              money is a receipt with its own number, already in the buyer's
              hands and on the cash book. What an edit needs instead is the date
              the sale is dated, a note, and the plain facts that decide whether
              the figure below may move at all. */}
          {isEdit ? (
            <div className="rounded bg-white dark:bg-gray-800 pt-1 py-2 px-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                <div>
                  <label className="block mt-1 text-sm font-semibold">Sale Date</label>
                  <InputDatePicker
                    id="sale_date"
                    name="sale_date"
                    selectedDate={saleDate}
                    setSelectedDate={setSaleDate}
                    setCurrentDate={setSaleDate}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block mt-1 text-sm font-semibold">Note</label>
                  <InputElement
                    id="note"
                    name="note"
                    type="text"
                    label=""
                    placeholder="Why this was corrected"
                    className="text-sm"
                    value={note}
                    onChange={(e: any) => setNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-2 space-y-1 border-t border-gray-300 pt-2 text-xs dark:border-gray-700">
                <p className="text-gray-600 dark:text-gray-300">
                  Received so far:{" "}
                  <span className="font-semibold">
                    {formatAmount(guards?.received ?? 0)}
                  </span>{" "}
                  — the total cannot go below it. Money itself is corrected from
                  the payment screens.
                </p>

                {guards?.is_approved ? (
                  <p className="text-red-500">
                    This sale sits on an approved voucher. Remove the approval
                    before saving, or the save will be refused.
                  </p>
                ) : null}

                {(guards?.letter_count ?? 0) > 0 ||
                (guards?.booking_form_count ?? 0) > 0 ? (
                  <p className="text-amber-600 dark:text-amber-500">
                    {guards?.letter_count
                      ? `${guards.letter_count} allotment letter${
                          guards.letter_count > 1 ? "s" : ""
                        }`
                      : ""}
                    {guards?.letter_count && guards?.booking_form_count ? " and " : ""}
                    {guards?.booking_form_count
                      ? `${guards.booking_form_count} booking form${
                          guards.booking_form_count > 1 ? "s" : ""
                        }`
                      : ""}{" "}
                    already issued. Changing the amount leaves them out of date —
                    withdraw and reissue afterwards.
                  </p>
                ) : null}

                {(guards?.installment_count ?? 0) > 0 ? (
                  <p className="text-amber-600 dark:text-amber-500">
                    {guards?.installment_count} installments are scheduled against
                    this sale. Check the schedule after changing the total.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
          <div className="rounded  bg-white dark:bg-gray-800 pt-1 py-2 px-4">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div>
                <label className="block mt-1 text-sm ">Payment Mode</label>
                <DropdownCommon
                  id="payment_mode"
                  name="payment_mode"
                  label=""
                  value={paymentMode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onPaymentModeChange(e.target.value)
                  }
                  className="w-60 font-medium text-sm p-1.5"
                  data={UNIT_SALE_PAYMENT_MODES}
                />
              </div>
              <div>
                <label className="block mt-1 text-sm font-semibold">Money Receipt No.</label>
                <InputElement
                  id="receipt_no"
                  name="receipt_no"
                  type="text"
                  label=""
                  placeholder="Enter money receipt number"
                  className="text-sm h-8"
                  value={moneyReceipt}
                  onChange={(e: any) => setMoneyReceipt(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ Booking Money (always visible) */}
            <div className="mt-1 grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div>
                <label className="block mt-1 text-sm font-semibold">Booking Tk.</label>
                <InputElement
                  id="bookingMoney"
                  name="bookingMoney"
                  type="number"
                  placeholder="Enter booking money"
                  label=""
                  className="text-sm"
                  value={bookingMoney}
                  onChange={(e: any) => setBookingMoney(e.target.value)}
                />
              </div>
              {showBankFields && (
                <div className="">
                  <div>
                    <label className="block mt-1 text-sm font-semibold">
                      Check/Ref. Number
                    </label>
                    <InputElement
                      id="checkNumber"
                      name="checkNumber"
                      type="text"
                      placeholder="Enter check number"
                      label=""
                      className="text-sm"
                      value={checkNumber}
                      onChange={(e: any) => setCheckNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            {showBankFields && (
              <>
                <div className="mt-1 grid grid-cols-1 xl:grid-cols-2 gap-2">
                  <div>
                    <label className="block mt-1 text-sm font-semibold">
                      Bank Name
                    </label>
                    <InputElement
                      id="bankName"
                      name="bankName"
                      type="text"
                      placeholder="Enter bank name"
                      label=""
                      className="text-sm"
                      value={bankName}
                      onChange={(e: any) => setBankName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block mt-1 text-sm font-semibold">
                      Branch Name
                    </label>
                    <InputElement
                      id="branchName"
                      name="branchName"
                      type="text"
                      placeholder="Enter branch name"
                      label=""
                      className="text-sm"
                      value={branchName}
                      onChange={(e: any) => setBranchName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          )}

          <div className="flex gap-2">
            <ButtonLoading
              onClick={isEdit ? submitEdit : submitToApi}
              label={isEdit ? "Update" : "Save"}
              icon={
                loading ? (
                  <FiLoader className="animate-spin text-white text-lg ml-2 mr-2 " />
                ) : (
                  <FiSave className="text-white text-lg ml-2 mr-2 " />
                )
              }
              className="mt-2 p-2 flex-1"
              disabled={!items.length || loading || saleLoading}
            />

            <ButtonLoading
              onClick={() =>
                navigate(
                  // Back where it was opened from: the report a wrong figure is
                  // noticed on, or the unit list a sale is started from.
                  isEdit ? routes.real_estate_sold_units : "../real-estate/unit/list",
                )
              }
              label="Back"
              icon={<FiArrowLeft className="mr-3" />}
              className="mt-2 p-2 flex-1"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-8">
          <table className="w-full text-sm  bg-white dark:bg-gray-800">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Linked</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-center w-24">Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="">
                  <td className="p-2">{it.title}</td>
                  <td className="p-2">{linkedToText(it.linkedTo)}</td>

                  <td className="p-2 text-right">
                    {editingId === it.id ? (
                      <div className="flex justify-end gap-1 items-center">
                        <InputElement
                          className="w-24 text-right"
                          type="number"
                          value={draftValue}
                          onChange={(e: any) => setDraftValue(e.target.value)}
                        />
                        <FiCheck className="cursor-pointer" onClick={() => saveEdit(it)} />
                        <FiX className="cursor-pointer" onClick={() => setEditingId(null)} />
                      </div>
                    ) : (
                      <div className="flex justify-end items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-300">
                          {it.effect === "-" ? "(-)" : "(+)"}
                        </span>
                        <span className="font-medium">{formatAmount(it.amount)}</span>
                      </div>
                    )}
                  </td>

                  <td className="p-2">
                    {it.editMode === "LOCKED" ? (
                      <div className="flex items-center justify-center gap-3">
                        <FiLock />

                        {it.type === "PARKING" && (
                          <FiTrash2
                            className="cursor-pointer text-red-500"
                            title="Remove Parking"
                            onClick={() => {
                              if (confirm("Remove parking from this sale?")) {
                                removeParking();
                              }
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <FiEdit2
                          className="cursor-pointer text-blue-500"
                          onClick={() => startEdit(it)}
                        />
                        <FiTrash2
                          className="cursor-pointer text-red-500"
                          onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td
                    className="py-2 px-4 text-center text-gray-500 dark:text-gray-400"
                    colSpan={4}
                  >
                    {saleLoading
                      ? "Loading this sale…"
                      : "No pricing items yet. Select Unit to start."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

  );
}
