import React, { useEffect, useRef, useState } from 'react';
import { FiTruck, FiX } from 'react-icons/fi';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';

/** What the dialog collects, and what the sale is updated with. */
export type ChallanDetails = {
  driverName: string;
  driverMobile: string;
  accName: string;
  truckFare: string;
};

interface ChallanDriverDialogProps {
  show: boolean;
  /** What the sale already holds. Any may be null -- most sales hold none. */
  driverName?: string | null;
  driverMobile?: string | null;
  /** Which account the goods are billed to -- the "হিসাব হবে" line. */
  accName?: string | null;
  /** What the lorry is being paid. Held as text so an empty box stays empty. */
  truckFare?: string | number | null;
  /** The challan number, so the person at the gate can see which paper this is. */
  challanNo?: string | null;
  vehicleNo?: string | null;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (details: ChallanDetails) => void;
}

/**
 * Names the driver on the way to printing a delivery challan.
 *
 * It opens every time the challan is asked for, not only when the two fields
 * are empty. A driver's name is mistyped at the gate about as often as it is
 * missing, and the only other way to correct one is the voucher edit screen --
 * which means it never gets corrected. One control fills and fixes.
 *
 * Blank is a real answer. Somebody who does not know who is driving presses
 * Print with both boxes empty and the challan comes out without a driver on
 * it, exactly as it did before these columns existed. So neither field is
 * required and the button is never disabled for emptiness -- only while the
 * save is in flight.
 */
const ChallanDriverDialog: React.FC<ChallanDriverDialogProps> = ({
  show,
  driverName,
  driverMobile,
  accName,
  truckFare,
  challanNo,
  vehicleNo,
  saving = false,
  onCancel,
  onConfirm,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [account, setAccount] = useState('');
  // Text, not a number. A number state turns an emptied box into 0, and 0 is a
  // fare of nothing rather than a fare nobody agreed -- the challan prints
  // those two differently and must be able to send the difference.
  const [fare, setFare] = useState('');
  const nameRef = useRef<HTMLDivElement>(null);

  // Seeded when the dialog opens rather than on every render: typing into it
  // while a save was in flight would otherwise be overwritten by the row the
  // dialog was opened from.
  useEffect(() => {
    if (show) {
      setName(driverName ?? '');
      setMobile(driverMobile ?? '');
      setAccount(accName ?? '');
      setFare(
        truckFare === null || truckFare === undefined || truckFare === ''
          ? ''
          : String(truckFare),
      );
    }
  }, [show, driverName, driverMobile, accName, truckFare]);

  // The cursor starts in the name box -- the field somebody opened this to fill.
  useEffect(() => {
    if (!show) return;
    const input = nameRef.current?.querySelector('input');
    input?.focus();
    input?.select();
  }, [show]);

  if (!show) return null;

  const submit = () => {
    if (saving) return;
    onConfirm({
      driverName: name.trim(),
      driverMobile: mobile.trim(),
      accName: account.trim(),
      truckFare: fare.trim(),
    });
  };

  return (
    // The same shell as ConfirmModal -- surfaces that climb page < card <
    // dialog, so the panel reads as the nearest thing on screen in both themes.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        } else if (event.key === 'Enter') {
          // Enter prints from either box: this is two short fields and a
          // button, and reaching for the mouse to finish it is a step too many
          // for something done once per lorry.
          event.preventDefault();
          submit();
        }
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-[rgb(var(--c-border))] bg-white text-slate-800 shadow-2xl dark:bg-graydark dark:text-[rgb(var(--c-text))]">
        <h3 className="border-b border-[rgb(var(--c-border))] px-5 py-3 text-lg font-semibold text-[rgb(var(--c-text))]">
          Delivery Challan
        </h3>

        <div className="space-y-3 px-5 py-4">
          {/* Which paper this is. Without it the dialog is two unlabelled boxes
              over a table of many rows, and the wrong row is easy to be on. */}
          {(challanNo || vehicleNo) && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {challanNo ? (
                <span className="mr-4">
                  Challan: <span className="font-semibold">{challanNo}</span>
                </span>
              ) : null}
              {vehicleNo ? (
                <span>
                  Vehicle: <span className="font-semibold">{vehicleNo}</span>
                </span>
              ) : null}
            </div>
          )}

          <div ref={nameRef}>
            <InputElement
              id="challan_driver_name"
              name="driver_name"
              label="Driver Name"
              placeholder="Who is driving"
              description="Leave it empty if nobody knows yet -- the challan prints without a driver."
              value={name}
              onChange={(event) => setName(event.target.value)}
              className=""
            />
          </div>

          <InputElement
            id="challan_driver_mobile"
            name="driver_mobile"
            label="Driver Mobile"
            placeholder="Number to reach the driver on"
            value={mobile}
            inputMode="tel"
            onChange={(event) => setMobile(event.target.value)}
            className=""
          />

          {/* The other two the gate settles, and the sale cannot know.
              Which account the consignment is charged against is often a third
              name -- not the customer the invoice was made out to -- and the
              lorry's fare is agreed with the driver standing in the yard, after
              the invoice was raised. Both optional, like the driver above. */}
          <InputElement
            id="challan_acc_name"
            name="acc_name"
            label="Account (A/C)"
            placeholder="Which account the goods are billed to"
            description="Leave it empty if the invoice's own customer is the account."
            value={account}
            onChange={(event) => setAccount(event.target.value)}
            className=""
          />

          <InputElement
            id="challan_truck_fare"
            name="truck_fare"
            label="Truck Fare"
            placeholder="What the lorry is paid"
            description="Leave it empty if no fare was agreed — the challan then prints a blank line to write on."
            value={fare}
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            onChange={(event) => setFare(event.target.value)}
            className=""
          />
        </div>

        <div className="flex justify-center gap-3 border-t border-[rgb(var(--c-border))] px-5 py-4">
          <ButtonLoading
            onClick={onCancel}
            label="Cancel"
            className="whitespace-nowrap bg-slate-500 hover:bg-slate-600 dark:bg-gray-500 dark:hover:bg-gray-600"
            icon={<FiX className="mr-2 text-lg" />}
            disabled={saving}
          />
          {/* The blue the dialog exists for, named rather than spelled out.
              This carried `bg-emerald-600 hover:bg-emerald-700`, and neither
              ever reached the screen: the variant's own utilities decide a
              conflicting background by where they sit in the stylesheet, not by
              which class was written last on the element. So the button rested
              at the default grey and only turned blue under the pointer, which
              is the colour that got noticed and asked for.

              `primary` is that blue at rest, and its hover is the same blue at
              nine-tenths -- a shade lighter, which is the whole of the movement
              a button needs. It also follows the palette, so a user who changes
              their primary colour on the theme form changes this too, instead
              of leaving one emerald button behind. */}
          <ButtonLoading
            onClick={submit}
            label="Print Challan"
            variant="primary"
            className="whitespace-nowrap"
            icon={<FiTruck className="mr-2 text-lg" />}
            buttonLoading={saving}
            disabled={saving}
          />
        </div>
      </div>
    </div>
  );
};

export default ChallanDriverDialog;
