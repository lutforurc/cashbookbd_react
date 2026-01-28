import React, { useMemo, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiSearch,
} from "react-icons/fi";

/** ---------- Types ---------- */
type ChargeType =
  | "BASE_PRICE"
  | "FLOOR_PREMIUM"
  | "PARKING"
  | "UTILITIES"
  | "OTHER_CHARGES"
  | "DISCOUNT"
  | "CUSTOM";

type EditMode = "LOCKED" | "ROLE_EDITABLE" | "EDITABLE";

type LinkedTo =
  | { kind: "unit"; label: string; unitId: number }
  | { kind: "parking"; label: string; parkingId: number }
  | null;

type PriceItem = {
  id: number;
  type: ChargeType;
  title: string; // UI label (Custom charge এর জন্য দরকার)
  linkedTo: LinkedTo;
  amount: number;
  note?: string;
  editMode: EditMode;
};

type Unit = { id: number; label: string; basePrice: number; floorPremium?: number };
type Parking = { id: number; label: string; price: number };
type Customer = { id: number; name: string; phone?: string };

function formatAmount(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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

/** ---------- Demo data (Replace with API later) ---------- */
const demoUnits: Unit[] = [
  { id: 101, label: "B-7", basePrice: 8500000, floorPremium: 20000 },
  { id: 102, label: "A-3", basePrice: 7200000, floorPremium: 0 },
  { id: 103, label: "C-10", basePrice: 9900000, floorPremium: 50000 },
];

const demoParkings: Parking[] = [
  { id: 12, label: "P-12", price: 300000 },
  { id: 18, label: "P-18", price: 350000 },
  { id: 25, label: "P-25", price: 250000 },
];

const demoCustomers: Customer[] = [
  { id: 1, name: "Rahim Uddin", phone: "017XXXXXXXX" },
  { id: 2, name: "Karim Ahmed", phone: "018XXXXXXXX" },
  { id: 3, name: "Sadia Islam", phone: "019XXXXXXXX" },
];

/** ---------- Page ---------- */
export default function SalesPricingBuilderPage() {
  // permission for role-edit items (Floor Premium)
  const canEditRoleLocked = true;

  /** Selected inventory + customer */
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(101);
  const [selectedParkingId, setSelectedParkingId] = useState<number | null>(12);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(1);

  /** Search (demo) */
  const [unitQuery, setUnitQuery] = useState("");
  const [parkingQuery, setParkingQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");

  const selectedUnit = useMemo(
    () => demoUnits.find((u) => u.id === selectedUnitId) || null,
    [selectedUnitId]
  );
  const selectedParking = useMemo(
    () => demoParkings.find((p) => p.id === selectedParkingId) || null,
    [selectedParkingId]
  );
  const selectedCustomer = useMemo(
    () => demoCustomers.find((c) => c.id === selectedCustomerId) || null,
    [selectedCustomerId]
  );

  /** Pricing items state */
  const [items, setItems] = useState<PriceItem[]>(() => {
    // initial build
    const unit = demoUnits.find((u) => u.id === 101)!;
    const parking = demoParkings.find((p) => p.id === 12)!;

    const base: PriceItem = {
      id: 1,
      type: "BASE_PRICE",
      title: "Base Price",
      linkedTo: { kind: "unit", label: unit.label, unitId: unit.id },
      amount: unit.basePrice,
      note: "Auto from unit",
      editMode: "LOCKED",
    };

    const fp: PriceItem = {
      id: 2,
      type: "FLOOR_PREMIUM",
      title: "Floor Premium",
      linkedTo: { kind: "unit", label: unit.label, unitId: unit.id },
      amount: unit.floorPremium || 0,
      note: "Auto / editable by role",
      editMode: "ROLE_EDITABLE",
    };

    const park: PriceItem = {
      id: 3,
      type: "PARKING",
      title: "Parking",
      linkedTo: { kind: "parking", label: parking.label, parkingId: parking.id },
      amount: parking.price,
      note: "Auto from parking",
      editMode: "LOCKED",
    };

    const util: PriceItem = {
      id: 4,
      type: "UTILITIES",
      title: "Utilities",
      linkedTo: { kind: "unit", label: unit.label, unitId: unit.id },
      amount: 50000,
      note: "Editable",
      editMode: "EDITABLE",
    };

    const other: PriceItem = {
      id: 5,
      type: "OTHER_CHARGES",
      title: "Other Charges",
      linkedTo: null,
      amount: 0,
      note: "Editable",
      editMode: "EDITABLE",
    };

    const disc: PriceItem = {
      id: 6,
      type: "DISCOUNT",
      title: "Discount",
      linkedTo: null,
      amount: -15000,
      note: "Must be negative",
      editMode: "EDITABLE",
    };

    return [base, fp, park, util, other, disc];
  });

  /** When Unit changes -> update linked unit items (Base + Floor Premium + Utilities link label) */
  const applyUnitSelection = (unitId: number | null) => {
    setSelectedUnitId(unitId);
    const unit = demoUnits.find((u) => u.id === unitId) || null;
    if (!unit) return;

    setItems((prev) =>
      prev.map((it) => {
        if (it.type === "BASE_PRICE") {
          return {
            ...it,
            linkedTo: { kind: "unit", label: unit.label, unitId: unit.id },
            amount: unit.basePrice,
          };
        }
        if (it.type === "FLOOR_PREMIUM") {
          return {
            ...it,
            linkedTo: { kind: "unit", label: unit.label, unitId: unit.id },
            amount: unit.floorPremium || 0,
          };
        }
        // Utilities row unit-linked দেখাতে
        if (it.type === "UTILITIES") {
          return {
            ...it,
            linkedTo: { kind: "unit", label: unit.label, unitId: unit.id },
          };
        }
        return it;
      })
    );
  };

  /** When Parking changes -> update parking item */
  const applyParkingSelection = (parkingId: number | null) => {
    setSelectedParkingId(parkingId);
    const parking = demoParkings.find((p) => p.id === parkingId) || null;

    setItems((prev) => {
      const hasParkingRow = prev.some((x) => x.type === "PARKING");

      // if user unselect parking -> remove PARKING row
      if (!parking) {
        return prev.filter((x) => x.type !== "PARKING");
      }

      // if no parking row -> add it
      if (!hasParkingRow) {
        const nextId = Math.max(...prev.map((x) => x.id)) + 1;
        return [
          ...prev,
          {
            id: nextId,
            type: "PARKING",
            title: "Parking",
            linkedTo: { kind: "parking", label: parking.label, parkingId: parking.id },
            amount: parking.price,
            note: "Auto from parking",
            editMode: "LOCKED",
          },
        ];
      }

      // else update
      return prev.map((it) =>
        it.type === "PARKING"
          ? {
              ...it,
              linkedTo: { kind: "parking", label: parking.label, parkingId: parking.id },
              amount: parking.price,
            }
          : it
      );
    });
  };

  /** Inline edit state */
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState<string>("");

  const startEdit = (it: PriceItem) => {
    const editable =
      it.editMode === "EDITABLE" ||
      (it.editMode === "ROLE_EDITABLE" && canEditRoleLocked);
    if (!editable) return;

    setEditingId(it.id);
    setDraftValue(String(it.amount));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftValue("");
  };

  const saveEdit = (it: PriceItem) => {
    const next = Number(draftValue);
    if (Number.isNaN(next)) return;

    if (it.type === "DISCOUNT" && next > 0) {
      alert("Discount must be negative (<= 0).");
      return;
    }

    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, amount: next } : x)));
    cancelEdit();
  };

  /** Add Custom Charge */
  const [newChargeTitle, setNewChargeTitle] = useState<string>("");
  const [newChargeAmount, setNewChargeAmount] = useState<string>("0");
  const [newChargeNote, setNewChargeNote] = useState<string>("");

  const addCustomCharge = () => {
    const title = newChargeTitle.trim();
    const amount = Number(newChargeAmount);

    if (!title) {
      alert("Charge name required.");
      return;
    }
    if (Number.isNaN(amount)) {
      alert("Amount invalid.");
      return;
    }

    const nextId = items.length ? Math.max(...items.map((x) => x.id)) + 1 : 1;

    setItems((prev) => [
      ...prev,
      {
        id: nextId,
        type: "CUSTOM",
        title,
        linkedTo: null,
        amount,
        note: newChargeNote.trim() || "Custom charge",
        editMode: "EDITABLE",
      },
    ]);

    setNewChargeTitle("");
    setNewChargeAmount("0");
    setNewChargeNote("");
  };

  const removeCustomCharge = (id: number) => {
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  const total = useMemo(() => sumTotal(items), [items]);

  /** Filter demo lists */
  const filteredUnits = useMemo(() => {
    const q = unitQuery.trim().toLowerCase();
    if (!q) return demoUnits;
    return demoUnits.filter((u) => u.label.toLowerCase().includes(q));
  }, [unitQuery]);

  const filteredParkings = useMemo(() => {
    const q = parkingQuery.trim().toLowerCase();
    if (!q) return demoParkings;
    return demoParkings.filter((p) => p.label.toLowerCase().includes(q));
  }, [parkingQuery]);

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return demoCustomers;
    return demoCustomers.filter((c) => c.name.toLowerCase().includes(q));
  }, [customerQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              Sales Pricing Builder
            </h1>
            <p className="text-sm text-zinc-400">
              Unit + Parking + Customer select করে breakdown auto update হবে। Custom charges add করা যাবে।
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-400">Grand Total</div>
            <div className="text-xl font-semibold text-zinc-100 tabular-nums">
              {formatAmount(total)}
            </div>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left column: selectors */}
          <div className="lg:col-span-4 space-y-4">
            {/* Customer Select */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-2 text-sm font-semibold text-zinc-100">Customer</div>

              <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2">
                <FiSearch className="text-zinc-500" />
                <input
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full bg-transparent text-sm text-zinc-200 outline-none"
                />
              </div>

              <select
                value={selectedCustomerId ?? ""}
                onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-zinc-500">
                Selected:{" "}
                <span className="text-zinc-300">
                  {selectedCustomer ? selectedCustomer.name : "-"}
                </span>
              </div>
            </div>

            {/* Unit Select */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-2 text-sm font-semibold text-zinc-100">Select Unit</div>

              <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2">
                <FiSearch className="text-zinc-500" />
                <input
                  value={unitQuery}
                  onChange={(e) => setUnitQuery(e.target.value)}
                  placeholder="Search unit e.g. B-7"
                  className="w-full bg-transparent text-sm text-zinc-200 outline-none"
                />
              </div>

              <select
                value={selectedUnitId ?? ""}
                onChange={(e) => applyUnitSelection(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {filteredUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} — Base {formatAmount(u.basePrice)}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-zinc-500">
                Selected:{" "}
                <span className="text-zinc-300">
                  {selectedUnit ? `Unit ${selectedUnit.label}` : "-"}
                </span>
              </div>
            </div>

            {/* Parking Select */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-zinc-100">Parking</div>
                <button
                  type="button"
                  className="text-xs text-zinc-300 hover:text-zinc-100"
                  onClick={() => applyParkingSelection(null)}
                >
                  Remove Parking
                </button>
              </div>

              <div className="mb-2 flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-2">
                <FiSearch className="text-zinc-500" />
                <input
                  value={parkingQuery}
                  onChange={(e) => setParkingQuery(e.target.value)}
                  placeholder="Search slot e.g. P-12"
                  className="w-full bg-transparent text-sm text-zinc-200 outline-none"
                />
              </div>

              <select
                value={selectedParkingId ?? ""}
                onChange={(e) => applyParkingSelection(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
              >
                {filteredParkings.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {formatAmount(p.price)}
                  </option>
                ))}
              </select>

              <div className="mt-2 text-xs text-zinc-500">
                Selected:{" "}
                <span className="text-zinc-300">
                  {selectedParking ? `Slot ${selectedParking.label}` : "No parking"}
                </span>
              </div>
            </div>

            {/* Add Custom Charge */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-3 text-sm font-semibold text-zinc-100">
                Add Custom Charge
              </div>

              <div className="space-y-2">
                <input
                  value={newChargeTitle}
                  onChange={(e) => setNewChargeTitle(e.target.value)}
                  placeholder="Charge name (e.g., Registry Fee)"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
                />
                <input
                  value={newChargeAmount}
                  onChange={(e) => setNewChargeAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
                />
                <input
                  value={newChargeNote}
                  onChange={(e) => setNewChargeNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 outline-none"
                />

                <button
                  type="button"
                  onClick={addCustomCharge}
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
                >
                  <FiPlus /> Add Charge
                </button>
              </div>
            </div>
          </div>

          {/* Right column: price table */}
          <div className="lg:col-span-8">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="text-sm font-semibold text-zinc-100">
                  Price Breakdown
                </div>
                <div className="text-xs text-zinc-400">
                  BASE_PRICE এবং PARKING locked থাকবে। Discount সবসময় negative হবে।
                </div>

                <div className="mt-2 text-xs text-zinc-500">
                  Customer:{" "}
                  <span className="text-zinc-200">
                    {selectedCustomer ? selectedCustomer.name : "-"}
                  </span>{" "}
                  | Unit:{" "}
                  <span className="text-zinc-200">
                    {selectedUnit ? selectedUnit.label : "-"}
                  </span>{" "}
                  | Parking:{" "}
                  <span className="text-zinc-200">
                    {selectedParking ? selectedParking.label : "No parking"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-zinc-900/60 text-zinc-300">
                    <tr className="border-b border-zinc-800">
                      <th className="px-4 py-3 text-left font-medium">Item</th>
                      <th className="px-4 py-3 text-left font-medium">Linked To</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Note</th>
                      <th className="px-4 py-3 text-left font-medium">Lock</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>

                  <tbody className="text-zinc-200">
                    {items.map((it) => {
                      const showLock = it.editMode === "LOCKED" || it.editMode === "ROLE_EDITABLE";
                      const showPencil = it.editMode === "EDITABLE" || it.editMode === "ROLE_EDITABLE";
                      const pencilEnabled =
                        it.editMode === "EDITABLE" ||
                        (it.editMode === "ROLE_EDITABLE" && canEditRoleLocked);

                      const isEditing = editingId === it.id;

                      return (
                        <tr
                          key={it.id}
                          className="border-b border-zinc-900 hover:bg-zinc-900/40"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">{it.title}</td>

                          <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                            {linkedToText(it.linkedTo)}
                          </td>

                          <td className="px-4 py-3 text-right tabular-nums">
                            {!isEditing ? (
                              formatAmount(it.amount)
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  value={draftValue}
                                  onChange={(e) => setDraftValue(e.target.value)}
                                  className="w-36 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-right text-zinc-100 outline-none focus:border-zinc-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => saveEdit(it)}
                                  className="rounded-md p-2 hover:bg-zinc-800"
                                  title="Save"
                                >
                                  <FiCheck className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-md p-2 hover:bg-zinc-800"
                                  title="Cancel"
                                >
                                  <FiX className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-zinc-300">{it.note || "-"}</td>

                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {showLock ? <FiLock className="h-4 w-4 text-zinc-300" /> : <span className="inline-block w-4" />}
                              {showPencil ? (
                                <button
                                  type="button"
                                  onClick={() => startEdit(it)}
                                  disabled={!pencilEnabled || isEditing}
                                  className={[
                                    "inline-flex items-center justify-center rounded-md px-2 py-1",
                                    pencilEnabled && !isEditing
                                      ? "hover:bg-zinc-800 text-zinc-200"
                                      : "text-zinc-500 cursor-not-allowed",
                                  ].join(" ")}
                                  title={pencilEnabled ? "Edit" : "Role permission required"}
                                >
                                  <FiEdit2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {it.type === "CUSTOM" ? (
                              <button
                                type="button"
                                onClick={() => removeCustomCharge(it.id)}
                                className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-zinc-200 hover:bg-zinc-800"
                                title="Remove custom charge"
                              >
                                <FiTrash2 />
                                <span className="text-xs">Remove</span>
                              </button>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr className="bg-zinc-900/40">
                      <td className="px-4 py-3 font-medium text-zinc-200" colSpan={2}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-100 tabular-nums">
                        {formatAmount(total)}
                      </td>
                      <td className="px-4 py-3" colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              ✅ Next step: এখানে API connect করলে unit/parking/customer dynamic load হবে এবং Save করলে sale quotation তৈরি হবে।
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
