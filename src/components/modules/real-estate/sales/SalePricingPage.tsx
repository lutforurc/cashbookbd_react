import React, { useMemo, useState } from "react";
import { FiLock, FiEdit2, FiCheck, FiX, FiPlus, FiTrash2 } from "react-icons/fi";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import BuildingUnitDropdown from "../../../utils/utils-functions/BuildingUnitDropdown";

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

function formatAmount(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toLocaleString("en-US")}`;
}

function sumTotal(items: PriceItem[]) {
  return items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
}

function linkedToText(linkedTo: LinkedTo) {
  if (!linkedTo) return "-";
  return linkedTo.kind === "unit"
    ? `Unit: ${linkedTo.label}`
    : `Slot: ${linkedTo.label}`;
}

/* ================= PAGE ================= */

export default function SalesPricingBuilderPage() {
  /* -------- Selected -------- */
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedParkingId, setSelectedParkingId] = useState<number | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: number;
    name: string;
  } | null>(null);

  /* -------- Pricing Rows -------- */
  const [items, setItems] = useState<PriceItem[]>([]);

  /* -------- Inline Edit -------- */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  /* -------- Add Custom -------- */
  const [newChargeTitle, setNewChargeTitle] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("0");
  const [newChargeNote, setNewChargeNote] = useState("");

  /* ================= HANDLERS ================= */

  /** Unit select → Base Price add/update */
  const onUnitSelect = (option: any | null) => {
    if (!option) {
      setSelectedUnitId(null);
      setItems([]);
      return;
    }

    setSelectedUnitId(option.value);

    const size = Number(option.label_0 || 0);
    const rate = Number(option.label_1 || 0);
    const basePrice = size * rate;

    setItems((prev) => {
      const hasBase = prev.some((x) => x.type === "BASE_PRICE");

      if (hasBase) {
        return prev.map((it) =>
          it.type === "BASE_PRICE"
            ? {
                ...it,
                linkedTo: { kind: "unit", label: option.label, unitId: option.value },
                amount: basePrice,
                note: `Auto: ${size} × ${rate}`,
              }
            : it
        );
      }

      return [
        {
          id: Date.now(),
          type: "BASE_PRICE",
          title: "Base Price",
          linkedTo: { kind: "unit", label: option.label, unitId: option.value },
          amount: basePrice,
          note: `Auto: ${size} × ${rate}`,
          editMode: "LOCKED",
        },
      ];
    });
  };

  /** Parking select/remove */
  const onParkingChange = (parking: { id: number; label: string; price: number } | null) => {
    if (!parking) {
      setSelectedParkingId(null);
      setItems((prev) => prev.filter((x) => x.type !== "PARKING"));
      return;
    }

    setSelectedParkingId(parking.id);

    setItems((prev) => {
      const hasParking = prev.some((x) => x.type === "PARKING");

      if (hasParking) {
        return prev.map((it) =>
          it.type === "PARKING"
            ? {
                ...it,
                linkedTo: { kind: "parking", label: parking.label, parkingId: parking.id },
                amount: parking.price,
              }
            : it
        );
      }

      return [
        ...prev,
        {
          id: Date.now() + 1,
          type: "PARKING",
          title: "Parking",
          linkedTo: { kind: "parking", label: parking.label, parkingId: parking.id },
          amount: parking.price,
          note: "Auto from parking",
          editMode: "LOCKED",
        },
      ];
    });
  };

  /** Inline edit */
  const startEdit = (it: PriceItem) => {
    if (it.editMode !== "EDITABLE") return;
    setEditingId(it.id);
    setDraftValue(String(it.amount));
  };

  const saveEdit = (it: PriceItem) => {
    const next = Number(draftValue);
    if (Number.isNaN(next)) return;

    if (it.type === "DISCOUNT" && next > 0) {
      alert("Discount must be negative");
      return;
    }

    setItems((prev) =>
      prev.map((x) => (x.id === it.id ? { ...x, amount: next } : x))
    );
    setEditingId(null);
  };

  /** Custom charge */
  const addCustomCharge = () => {
    if (!newChargeTitle.trim()) return;

    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: "CUSTOM",
        title: newChargeTitle,
        linkedTo: null,
        amount: Number(newChargeAmount || 0),
        note: newChargeNote || "Custom charge",
        editMode: "EDITABLE",
      },
    ]);

    setNewChargeTitle("");
    setNewChargeAmount("0");
    setNewChargeNote("");
  };

  const total = useMemo(() => sumTotal(items), [items]);

  /* ================= UI ================= */

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-4 flex justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Sales Pricing Builder
          </h1>
          <p className="text-sm text-zinc-400">
            Unit, Parking select করলে breakdown auto তৈরি হবে
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-zinc-400">Grand Total</div>
          <div className="text-xl font-semibold text-zinc-100">
            {formatAmount(total)}
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-zinc-100 mb-2">
              Customer
            </div>
            <DdlMultiline onSelect={(o: any) => setSelectedCustomer(o ? { id: o.value, name: o.label } : null)} acType="" />

            <div className="mt-3 text-sm font-semibold text-zinc-100">
              Unit
            </div>
            <BuildingUnitDropdown onSelect={onUnitSelect} placeholder="Select Unit" />

            <div className="mt-3 text-sm font-semibold text-zinc-100">
              Parking
            </div>
            <button
              className="text-xs text-zinc-300"
              onClick={() => onParkingChange(null)}
            >
              Remove Parking
            </button>
          </div>

          {/* Custom */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-zinc-100 mb-2">
              Add Custom Charge
            </div>

            <input
              className="mb-2 w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-sm"
              placeholder="Charge name"
              value={newChargeTitle}
              onChange={(e) => setNewChargeTitle(e.target.value)}
            />
            <input
              className="mb-2 w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-sm"
              placeholder="Amount"
              value={newChargeAmount}
              onChange={(e) => setNewChargeAmount(e.target.value)}
            />
            <button
              className="flex items-center gap-2 text-sm text-zinc-100"
              onClick={addCustomCharge}
            >
              <FiPlus /> Add
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-300">
                <tr>
                  <th className="p-3 text-left">Item</th>
                  <th className="p-3 text-left">Linked To</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Note</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-zinc-500">
                      No items added yet
                    </td>
                  </tr>
                )}

                {items.map((it) => (
                  <tr key={it.id} className="border-t border-zinc-800">
                    <td className="p-3">{it.title}</td>
                    <td className="p-3">{linkedToText(it.linkedTo)}</td>
                    <td className="p-3 text-right">{formatAmount(it.amount)}</td>
                    <td className="p-3">{it.note || "-"}</td>
                    <td className="p-3">
                      {it.type === "CUSTOM" && (
                        <button onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}>
                          <FiTrash2 />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
