import React, { useMemo, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiSend,
  FiArrowLeft,
  FiSave,
  FiLoader,
} from "react-icons/fi";

import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import BuildingUnitDropdown from "../../../utils/utils-functions/BuildingUnitDropdown";
import BuildingParkingDropdown from "../../../utils/utils-functions/BuildingParkingDropdown";
import BuildingUnitChargesDropdown from "../../../utils/utils-functions/BuildingUnitChargesDropdown";
import InputElement from "../../../utils/fields/InputElement";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { useNavigate } from "react-router";
import { storeSalePricing } from "./unitSaleSlice";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { UNIT_SALE_PAYMENT_MODES } from "../../../constant/constant/variables";

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

/* ================= PAGE ================= */

export default function UnitSalePage() {
  const { loading } = useSelector((state: any) => state.unitSale ?? { loading: false });

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedParking, setSelectedParking] = useState<any>(null);

  const [items, setItems] = useState<PriceItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const [chargeType, setChargeType] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<string>("");

  // ✅ NEW: Booking money state (separate from chargeAmount)
  const [bookingMoney, setBookingMoney] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

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
    const amount = size * rate;

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
    const amount = size * rate;

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

    const amt = safeNumber(chargeAmount);
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
    const val = Number(draftValue);
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

  const apiPayload = {
    customer: selectedCustomer,
    unit: selectedUnit,
    parking: selectedParking,

    // ✅ NEW
    payment_mode: paymentMode,
    booking_amt: bookingAmt,
    note: note || null,

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

    const response: any = await dispatch(storeSalePricing(apiPayload) as any);
    

    if (storeSalePricing.fulfilled.match(response)) {
      toast.success(response?.payload?.message || "Unit sale transaction saved successfully");
      // console.log("Sale saved, ID:", response.payload?.sale_id);

      // ✅ clear only the table part + inputs
      setItems([]);
      setBookingMoney("");
      setChargeType(null);
      setChargeAmount("");
      setEditingId(null);
      setDraftValue("");
      setNote("");
    } else {
      toast.info(response?.payload || "Failed to save.");
    }
  };


  /* ================= UI ================= */

  return (
    <div className="mx-auto max-w-7xl">
      <HelmetTitle title="Unit Sales" />

      <div className="mb-2 flex justify-between">
        <div>
          <h1 className="text-md font-semibold text-gray-900 dark:text-white">
            Unit Sales Pricing Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unit & Parking with others calculation
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
            <div className="text-gray-700 dark:text-gray-200">
              Booking: <span className="font-semibold">{formatAmount(bookingAmt)}</span>
            </div>
            <div className="text-gray-700 dark:text-gray-200">
              Due: <span className="font-semibold">{formatAmount(due)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="lg:col-span-4 space-y-1">
          <div className="rounded  dark:bg-gray-800 py-3 px-4">
            <label className="text-sm font-semibold">Select Customer</label>
            <DdlMultiline onSelect={setSelectedCustomer} acType="" />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div>
                <label className="block mt-1 text-sm font-semibold">Select Unit</label>
                <BuildingUnitDropdown onSelect={onUnitSelect} />
              </div>
              <div>
                <label className="block mt-1 text-sm font-semibold">Select Parking</label>
                <BuildingParkingDropdown onSelect={onParkingSelect} />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 mt-2" >

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
              className="mt-2 inline-flex items-center gap-2  bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 transition dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              <FiPlus className="text-gray-900 dark:text-gray-100" />
              Add Charge
            </button>
          </div>
          <div className="rounded  bg-white dark:bg-gray-800 pt-2 px-4">

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              <div>
                <label className="block mt-1 text-sm ">Payment Mode</label>
                <DropdownCommon
                  id="payment_mode"
                  name="payment_mode"
                  label=""
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setPaymentMode(e.target.value)
                  }
                  // defaultValue={values.payment_mode}
                  className="w-60 font-medium text-sm p-1.5"
                  data={UNIT_SALE_PAYMENT_MODES}
                />
              </div>
              <div>
                <label className="block mt-1 text-sm font-semibold">Note</label>
                <InputElement
                  id="note"
                  name="note"
                  type="text"
                  label=""
                  placeholder="Enter note"
                  className="text-sm"
                  value={note}
                  onChange={(e: any) => setNote(e.target.value)}
                />
              </div>
            </div>

            {/* ✅ Booking Money (new) */}
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

            </div>
          </div>
          <div className="flex gap-2">
            <ButtonLoading
              onClick={submitToApi}
              label={"Save"}
              icon={loading ? <FiLoader className="animate-spin text-white text-lg ml-2 mr-2 hidden xl:block" /> : <FiSave className="text-white text-lg ml-2 mr-2 hidden xl:block" />}
              className="mt-2 p-2 flex-1"
              disabled={!items.length || loading}
            />
            <ButtonLoading
              onClick={() => navigate("../real-estate/unit/list")}
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

                        {/* ✅ Allow deleting Parking even if locked */}
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
                  <td className="py-2 px-4 text-center text-gray-500 dark:text-gray-400" colSpan={4}>
                    No pricing items yet. Select Unit to start.
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
