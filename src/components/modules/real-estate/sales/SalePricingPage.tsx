import React, { useMemo, useState } from "react";
import { FiLock, FiEdit2, FiCheck, FiX } from "react-icons/fi";

type ChargeType =
  | "BASE_PRICE"
  | "FLOOR_PREMIUM"
  | "PARKING"
  | "UTILITIES"
  | "OTHER_CHARGES"
  | "DISCOUNT";

type EditMode = "LOCKED" | "ROLE_EDITABLE" | "EDITABLE";

type LinkedTo =
  | { kind: "unit"; label: string; unitId: number }
  | { kind: "parking"; label: string; parkingId: number }
  | null;

type PriceItem = {
  id: number;
  type: ChargeType;
  linkedTo: LinkedTo;
  amount: number;
  note?: string;
  editMode: EditMode;
};

const labelMap: Record<ChargeType, string> = {
  BASE_PRICE: "Base Price",
  FLOOR_PREMIUM: "Floor Premium",
  PARKING: "Parking",
  UTILITIES: "Utilities",
  OTHER_CHARGES: "Other Charges",
  DISCOUNT: "Discount",
};

function formatAmount(n: number) {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function linkedToText(linkedTo: LinkedTo) {
  if (!linkedTo) return "-";
  if (linkedTo.kind === "unit") return `Unit: ${linkedTo.label}`;
  return `Slot: ${linkedTo.label}`;
}

function sumTotal(items: PriceItem[]) {
  return items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
}

export default function SalePricingPage() {
  // demo data: পরে API থেকে লোড করবে
  const [items, setItems] = useState<PriceItem[]>([
    {
      id: 1,
      type: "BASE_PRICE",
      linkedTo: { kind: "unit", label: "B-7", unitId: 101 },
      amount: 8500000,
      note: "Auto from unit",
      editMode: "LOCKED",
    },
    {
      id: 2,
      type: "FLOOR_PREMIUM",
      linkedTo: { kind: "unit", label: "B-7", unitId: 101 },
      amount: 200000,
      note: "Auto / editable by role",
      editMode: "ROLE_EDITABLE",
    },
    {
      id: 3,
      type: "PARKING",
      linkedTo: { kind: "parking", label: "P-12", parkingId: 12 },
      amount: 300000,
      note: "Auto from parking",
      editMode: "LOCKED",
    },
    {
      id: 4,
      type: "UTILITIES",
      linkedTo: { kind: "unit", label: "B-7", unitId: 101 },
      amount: 50000,
      note: "Editable",
      editMode: "EDITABLE",
    },
    {
      id: 5,
      type: "OTHER_CHARGES",
      linkedTo: null,
      amount: 0,
      note: "Editable",
      editMode: "EDITABLE",
    },
    {
      id: 6,
      type: "DISCOUNT",
      linkedTo: null,
      amount: -150000,
      note: "Must be negative",
      editMode: "EDITABLE",
    },
  ]);

  // Floor Premium role-edit permission
  const canEditRoleLocked = true;

  const total = useMemo(() => sumTotal(items), [items]);

  // inline edit state
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

    // Discount rule
    if (it.type === "DISCOUNT" && next > 0) {
      alert("Discount must be negative (<= 0).");
      return;
    }

    setItems((prev) =>
      prev.map((x) => (x.id === it.id ? { ...x, amount: next } : x))
    );
    cancelEdit();
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              Sales Pricing (Breakdown)
            </h1>
            <p className="text-sm text-zinc-400">
              BASE_PRICE একটি নির্দিষ্ট Unit এর জন্য এবং PARKING একটি নির্দিষ্ট Slot এর জন্য locked থাকে।
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-400">Grand Total</div>
            <div className="text-xl font-semibold text-zinc-100 tabular-nums">
              {formatAmount(total)}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead className="bg-zinc-900/60 text-zinc-300">
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Linked To</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Note</th>
                  <th className="px-4 py-3 text-left font-medium">Lock</th>
                </tr>
              </thead>

              <tbody className="text-zinc-200">
                {items.map((it) => {
                  const showLock =
                    it.editMode === "LOCKED" || it.editMode === "ROLE_EDITABLE";

                  const showPencil =
                    it.editMode === "EDITABLE" || it.editMode === "ROLE_EDITABLE";

                  const pencilEnabled =
                    it.editMode === "EDITABLE" ||
                    (it.editMode === "ROLE_EDITABLE" && canEditRoleLocked);

                  const isEditing = editingId === it.id;

                  return (
                    <tr
                      key={it.id}
                      className="border-b border-zinc-900 hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {labelMap[it.type]}
                      </td>

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
                              placeholder="Amount"
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

                      <td className="px-4 py-3 text-zinc-300">
                        {it.note || "-"}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {showLock ? (
                            <FiLock className="h-4 w-4 text-zinc-300" />
                          ) : (
                            <span className="inline-block w-4" />
                          )}

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
                              title={
                                pencilEnabled
                                  ? "Edit"
                                  : "Role permission required"
                              }
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-zinc-500"
                    >
                      No pricing items yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>

              <tfoot>
                <tr className="bg-zinc-900/40">
                  <td className="px-4 py-3 font-medium text-zinc-200" colSpan={2}>
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-zinc-100 tabular-nums">
                    {formatAmount(total)}
                  </td>
                  <td className="px-4 py-3" colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Note: Discount সবসময় negative হবে। BASE_PRICE এবং PARKING locked থাকবে।
        </div>
      </div>
    </div>
  );
}
