import React, { useEffect, useMemo, useState } from "react";
import { FIELD_CHECKBOX } from '../../../../theme/fieldStyles';
import { FiSave, FiX } from "react-icons/fi";
import { toast } from "react-toastify";

import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import InputElement from "../../../utils/fields/InputElement";
import httpService from "../../../services/httpService";
import { API_UNIT_SALE_DOCUMENTS_URL } from "../../../services/apiRoutes";
import { SoldUnitRow } from "./types";

/** One person on the buyer's nominee list, as the customer screen saved them. */
type CustomerNominee = {
  id: number;
  name: string;
  relation: string | null;
  mobile: string | null;
  national_id: string | null;
  share_percentage: string | number | null;
  priority_order: number | null;
};

/** What this sale says about one of them. */
type Pick = {
  checked: boolean;
  share: string;
  priority: string;
};

interface Props {
  /** The sale being nominated against; null closes the dialog. */
  unit: SoldUnitRow | null;
  onClose: () => void;
  /** Called after a successful save, so the report can refresh its counts. */
  onSaved: () => void;
}

const nomineesUrl = (saleId: number) =>
  `${API_UNIT_SALE_DOCUMENTS_URL}${saleId}/nominees`;

/**
 * "wife" reads as Wife, "grand father" as Grand Father.
 *
 * Relations are stored as the dropdown's own lowercase values, which is right
 * for a stored value and wrong on a printed line. Capitalised where it is
 * shown, never in the column -- the booking form does the same.
 */
const titleCase = (value?: string | null) =>
  (value ?? "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Naming who a sold property is left to, after the sale.
 *
 * The people come off the buyer's own nominee list, written on the customer
 * screen; what is decided here is which of them stand against THIS property,
 * in what order and for what share. A buyer holding three flats can leave each
 * of them differently, so this is asked per sale and never inherited from the
 * customer.
 */
const SaleNomineeModal: React.FC<Props> = ({ unit, onClose, onSaved }) => {
  const [available, setAvailable] = useState<CustomerNominee[]>([]);
  const [picks, setPicks] = useState<Record<number, Pick>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const saleId = unit?.sale_id ?? null;

  useEffect(() => {
    if (!saleId) {
      setAvailable([]);
      setPicks({});
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await httpService.get(nomineesUrl(saleId));
        // foundData() wraps twice: { data: { data: <payload> } }.
        const payload = response?.data?.data?.data ?? {};
        const list: CustomerNominee[] = Array.isArray(payload.available)
          ? payload.available
          : [];
        // Who is already named, so the dialog opens on the current state
        // rather than on an empty list the clerk would have to rebuild.
        const attached: Record<number, Pick> = {};

        (Array.isArray(payload.nominees) ? payload.nominees : []).forEach(
          (row: any) => {
            attached[Number(row.nominee_id)] = {
              checked: true,
              share:
                row.share_percentage === null || row.share_percentage === ""
                  ? ""
                  : String(Number(row.share_percentage)),
              priority: row.priority_order ? String(row.priority_order) : "",
            };
          },
        );

        if (!cancelled) {
          setAvailable(list);
          setPicks(attached);
        }
      } catch (error: any) {
        if (!cancelled) {
          setAvailable([]);
          setPicks({});
          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "Could not load the nominee list",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [saleId]);

  const toggle = (nominee: CustomerNominee) =>
    setPicks((prev) => {
      const next = { ...prev };

      if (next[nominee.id]?.checked) {
        delete next[nominee.id];
        return next;
      }

      next[nominee.id] = {
        checked: true,
        // The buyer's own default as the starting point; this property is free
        // to differ, and most of the time it does not.
        share:
          nominee.share_percentage === null || nominee.share_percentage === ""
            ? ""
            : String(Number(nominee.share_percentage)),
        priority: "",
      };

      return next;
    });

  const setField = (id: number, field: "share" | "priority", value: string) =>
    setPicks((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], [field]: value } } : prev,
    );

  const selected = useMemo(
    () =>
      available
        .filter((n) => picks[n.id]?.checked)
        .map((n, index) => ({
          nominee_id: n.id,
          share_percentage: picks[n.id]?.share?.trim()
            ? Number(picks[n.id].share)
            : null,
          // Nothing typed means the order they appear in, which is the order
          // the booking form prints them.
          priority_order: picks[n.id]?.priority?.trim()
            ? Number(picks[n.id].priority)
            : index + 1,
        })),
    [available, picks],
  );

  const shareTotal = useMemo(
    () =>
      selected.reduce(
        (sum, n) => sum + (n.share_percentage === null ? 0 : n.share_percentage),
        0,
      ),
    [selected],
  );

  /**
   * The same two rules the server enforces, so a mistake is caught before the
   * round trip. A blank share is a nomination whose division is left to law,
   * which is allowed; a set that is all filled in has to account for all of it.
   */
  const shareProblem = (): string | null => {
    const shared = selected.filter((n) => n.share_percentage !== null);

    if (!shared.length) return null;

    if (shareTotal > 100) {
      return `Nominee shares add up to ${shareTotal}%, which is more than the property.`;
    }

    if (shared.length === selected.length && Math.abs(shareTotal - 100) > 0.01) {
      return `Every nominee carries a share, so they must add up to 100% — they add up to ${shareTotal}%.`;
    }

    return null;
  };

  const handleSave = async () => {
    if (!saleId || saving) return;

    const problem = shareProblem();
    if (problem) {
      toast.info(problem);
      return;
    }

    setSaving(true);

    try {
      const response = await httpService.post(nomineesUrl(saleId), {
        // Always sent, even empty: that is how the last nominee is removed.
        nominees: selected,
      });
      toast.success(response?.data?.message || "Nominees saved");
      onSaved();
      onClose();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Could not save the nominees",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!unit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
      {/* The same corner the report's own cards and tables carry -- a modal
          that rounds itself more than the page behind it reads as a stranger. */}
      <div className="w-full max-w-2xl rounded border-2 border-gray-900 bg-white p-6 text-gray-900 shadow-md dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100">
        <h2 className="mb-1 text-lg font-bold">Nominee</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Who {unit.unit_no || unit.parking_no || "this property"} is left to.
          Named against this property only — the buyer&rsquo;s other properties
          are nominated separately.
        </p>

        {loading ? (
          <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading…
          </p>
        ) : available.length === 0 ? (
          <div className="rounded-sm border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
            This customer has no nominee on file. Add them on the customer
            screen, then they can be named here.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left dark:bg-gray-900">
                <tr>
                  <th className="w-8 p-2"></th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Relation</th>
                  <th className="p-2">National ID</th>
                  <th className="w-20 p-2 text-center">Order</th>
                  <th className="w-24 p-2 text-center">Share %</th>
                </tr>
              </thead>
              <tbody>
                {available.map((nominee) => {
                  const pick = picks[nominee.id];

                  return (
                    <tr
                      key={nominee.id}
                      className="border-b border-gray-200 last:border-0 dark:border-gray-700"
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          id={`sale-nominee-${nominee.id}`}
                          className={FIELD_CHECKBOX}
                          checked={Boolean(pick?.checked)}
                          onChange={() => toggle(nominee)}
                        />
                      </td>
                      <td className="p-2">
                        <label
                          htmlFor={`sale-nominee-${nominee.id}`}
                          className="cursor-pointer"
                        >
                          {nominee.name}
                          {nominee.mobile ? (
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {nominee.mobile}
                            </span>
                          ) : null}
                        </label>
                      </td>
                      <td className="p-2">{titleCase(nominee.relation) || "-"}</td>
                      <td className="p-2">{nominee.national_id || "-"}</td>
                      <td className="p-2">
                        {pick?.checked ? (
                          <InputElement
                            id={`sale-nominee-order-${nominee.id}`}
                            name={`sale-nominee-order-${nominee.id}`}
                            type="number"
                            label=""
                            placeholder="1"
                            className="h-7 w-full text-center text-xs"
                            value={pick.priority}
                            onChange={(e: any) =>
                              setField(nominee.id, "priority", e.target.value)
                            }
                          />
                        ) : null}
                      </td>
                      <td className="p-2">
                        {pick?.checked ? (
                          <InputElement
                            id={`sale-nominee-share-${nominee.id}`}
                            name={`sale-nominee-share-${nominee.id}`}
                            type="number"
                            label=""
                            placeholder="%"
                            className="h-7 w-full text-right text-xs"
                            value={pick.share}
                            onChange={(e: any) =>
                              setField(nominee.id, "share", e.target.value)
                            }
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {selected.length > 0 ? (
          <p
            className={`mt-3 text-xs ${
              shareTotal > 100
                ? "font-medium text-red-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {selected.length} selected
            {shareTotal > 0
              ? ` · shares add up to ${shareTotal}%`
              : " · shares left blank, the property is left to them jointly"}
          </p>
        ) : available.length > 0 ? (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Nobody selected. Saving now removes any nominee this property had.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <ButtonLoading
            onClick={handleSave}
            label={saving ? "Saving..." : "Save"}
            buttonLoading={saving}
            disabled={saving || loading || available.length === 0}
            className="mt-0 w-full pb-[0.45rem] pt-[0.45rem]"
            icon={<FiSave className="ml-2" />}
          />
          <ButtonLoading
            onClick={onClose}
            label="Close"
            disabled={saving}
            className="mt-0 w-full pb-[0.45rem] pt-[0.45rem]"
            icon={<FiX className="ml-2" />}
          />
        </div>
      </div>
    </div>
  );
};

export default SaleNomineeModal;
