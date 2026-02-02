import React, { useMemo, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiSend,
} from "react-icons/fi";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import BuildingUnitDropdown from "../../../utils/utils-functions/BuildingUnitDropdown";
import BuildingParkingDropdown from "../../../utils/utils-functions/BuildingParkingDropdown";
import HelmetTitle from "../../../utils/others/HelmetTitle";

/* ================= TYPES ================= */

type ChargeType = "BASE_PRICE" | "PARKING" | "DISCOUNT" | "CUSTOM";
type EditMode = "LOCKED" | "EDITABLE";

type LinkedTo =
  | { kind: "unit"; label: string; unitId: number }
  | { kind: "parking"; label: string; parkingId: number }
  | null;

type PriceItem = {
  id: number;
  type: ChargeType;
  title: string;
  linkedTo: LinkedTo;
  amount: number;
  note?: string;
  editMode: EditMode;
};

/* ================= HELPERS ================= */

const formatAmount = (n: number) =>
  `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("en-US")}`;

const sumTotal = (items: PriceItem[]) =>
  items.reduce((a, b) => a + Number(b.amount || 0), 0);

const linkedToText = (l: LinkedTo) =>
  !l ? "-" : l.kind === "unit" ? `Unit: ${l.label}` : `Slot: ${l.label}`;

/* ================= PAGE ================= */

export default function SalePricingPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedParking, setSelectedParking] = useState<any>(null);

  const [items, setItems] = useState<PriceItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const [newChargeTitle, setNewChargeTitle] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("0");
  const [newChargeNote, setNewChargeNote] = useState("");

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
    const basePrice = size * rate;

    setItems((prev) => {
      const exists = prev.find((x) => x.type === "BASE_PRICE");

      if (exists) {
        return prev.map((x) =>
          x.type === "BASE_PRICE"
            ? {
                ...x,
                linkedTo: {
                  kind: "unit",
                  label: option.label,
                  unitId: option.value,
                },
                amount: basePrice,
                note: `Auto: ${size} × ${rate}`,
              }
            : x
        );
      }

      return [
        {
          id: Date.now(),
          type: "BASE_PRICE",
          title: "Base Price",
          linkedTo: {
            kind: "unit",
            label: option.label,
            unitId: option.value,
          },
          amount: basePrice,
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
    const basePrice = size * rate;

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
                amount: basePrice,
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
          linkedTo: {
            kind: "parking",
            label: option.label,
            parkingId: option.value,
          },
          amount: basePrice,
          note: `Auto: ${size} × ${rate}`,
          editMode: "LOCKED",
        },
      ];
    });
  };

  /* ================= EDIT ================= */

  const startEdit = (it: PriceItem) => {
    if (it.editMode !== "EDITABLE") return;
    setEditingId(it.id);
    setDraftValue(String(it.amount));
  };

  const saveEdit = (it: PriceItem) => {
    const val = Number(draftValue);
    if (Number.isNaN(val)) return;

    setItems((p) =>
      p.map((x) => (x.id === it.id ? { ...x, amount: val } : x))
    );
    setEditingId(null);
  };

  /* ================= CUSTOM ================= */

  const addCustom = () => {
    if (!newChargeTitle.trim()) return;

    setItems((p) => [
      ...p,
      {
        id: Date.now(),
        type: "CUSTOM",
        title: newChargeTitle,
        linkedTo: null,
        amount: Number(newChargeAmount),
        note: newChargeNote,
        editMode: "EDITABLE",
      },
    ]);

    setNewChargeTitle("");
    setNewChargeAmount("0");
    setNewChargeNote("");
  };

  const total = useMemo(() => sumTotal(items), [items]);

  /* ================= API ================= */

  const apiPayload = {
    customer: selectedCustomer
      ? { id: selectedCustomer.value, name: selectedCustomer.label }
      : null,

    unit: selectedUnit
      ? { id: selectedUnit.value, label: selectedUnit.label }
      : null,

    parking: selectedParking
      ? { id: selectedParking.value, label: selectedParking.label }
      : null,

    items,
    total,
  };

  const submitToApi = () => {
    console.log("API PAYLOAD =>", apiPayload);
  };

  /* ================= UI ================= */

  return (
    <div className="mx-auto max-w-7xl">
      <HelmetTitle title="Unit Sales" />

      <div className="mb-4 flex justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sales Pricing Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unit + Parking auto calculation
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Grand Total
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatAmount(total)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
            <label className="text-sm font-semibold">Customer</label>
            <DdlMultiline onSelect={setSelectedCustomer} acType="" />

            <label className="block mt-3 text-sm font-semibold">Select Unit</label>
            <BuildingUnitDropdown onSelect={onUnitSelect} />

            <label className="block mt-3 text-sm font-semibold">
              Select Parking
            </label>
            <BuildingParkingDropdown onSelect={onParkingSelect} />
          </div>

          <div className="rounded border bg-white dark:bg-gray-800 dark:border-gray-700 p-4">
            <label className="text-sm font-semibold">Add Custom Charge</label>
            <input
              className="mt-2 w-full border rounded p-2 dark:bg-gray-700"
              placeholder="Title"
              value={newChargeTitle}
              onChange={(e) => setNewChargeTitle(e.target.value)}
            />
            <input
              className="mt-2 w-full border rounded p-2 dark:bg-gray-700"
              placeholder="Amount"
              value={newChargeAmount}
              onChange={(e) => setNewChargeAmount(e.target.value)}
            />
            <button
              onClick={addCustom}
              className="mt-2 flex items-center gap-2 text-sm"
            >
              <FiPlus /> Add
            </button>
          </div>

          <button
            onClick={submitToApi}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded bg-blue-600 text-white py-2"
          >
            <FiSend /> Save
          </button>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-8">
          <table className="w-full text-sm bg-white dark:bg-gray-800 border dark:border-gray-700">
            <thead className="bg-gray-300 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2">Linked</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-center w-24">Action</th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t dark:border-gray-700">
                  <td className="p-2">{it.title}</td>
                  <td className="p-2">{linkedToText(it.linkedTo)}</td>
                  <td className="p-2 text-right">
                    {editingId === it.id ? (
                      <div className="flex justify-end gap-1">
                        <input
                          value={draftValue}
                          onChange={(e) => setDraftValue(e.target.value)}
                          className="w-24 border rounded px-1"
                        />
                        <FiCheck onClick={() => saveEdit(it)} />
                        <FiX onClick={() => setEditingId(null)} />
                      </div>
                    ) : (
                      formatAmount(it.amount)
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {it.editMode === "LOCKED" ? (
                      <FiLock />
                    ) : (
                      <>
                        <FiEdit2
                          className="cursor-pointer text-blue-500"
                          onClick={() => startEdit(it)}
                        />
                        <FiTrash2
                          className="ml-2 cursor-pointer text-red-500"
                          onClick={() =>
                            setItems((p) => p.filter((x) => x.id !== it.id))
                          }
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
