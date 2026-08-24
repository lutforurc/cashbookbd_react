import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { FiCheck } from 'react-icons/fi';

import { Input } from '../../utils/fields/FormControls';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import { fieldClass, FIELD_TRANSPARENT } from '../../../theme/fieldStyles';

import { seatSave } from './hotelSetupSlice';
import { HotelResource } from './types';
import { numberOrNull } from './setupHelpers';

/**
 * The beds inside one room, priced one at a time.
 *
 * The room form has a seat rent too, and the two do different jobs: that one is
 * what a NEW bed starts at, this one is what a particular bed costs. The window
 * bed in a dormitory sells for more than the one by the door, and the room form
 * deliberately never overwrites what is set here.
 *
 * Beds that are switched off are shown rather than hidden. A room cut from four
 * to two keeps all four rows -- a stay recorded against seat 3 in July has to
 * still read as seat 3 in December -- and a list that quietly dropped them
 * would leave somebody adding a "new" seat 3 that the old records do not point
 * at. Raising the bed count on the room form revives these same rows.
 */

interface SeatEditorProps {
  seats: HotelResource[];
  /** Told when a seat is saved, so the room's own totals can be refreshed. */
  onSaved: () => void;
}

const SeatEditor: React.FC<SeatEditorProps> = ({ seats, onSaved }) => {
  const dispatch = useDispatch<any>();

  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  // The server is the truth. A save elsewhere -- or a bed count change on the
  // room form -- has to land here rather than be masked by a stale draft.
  useEffect(() => {
    setDrafts({});
  }, [seats]);

  if (!seats?.length) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No beds yet. Save the room and its seats are written with it.
      </p>
    );
  }

  const rentOf = (seat: HotelResource) =>
    drafts[seat.id!] !== undefined ? drafts[seat.id!] : seat.rent === null || seat.rent === undefined ? '' : String(seat.rent);

  const handleSave = async (seat: HotelResource) => {
    setSavingId(seat.id!);

    try {
      await dispatch(
        seatSave({
          id: seat.id!,
          rent: numberOrNull(rentOf(seat)),
          name: seat.name ?? null,
          status: seat.status,
        }),
      ).unwrap();

      toast.success(`Seat ${seat.code} saved`);
      onSaved();
    } catch (error: any) {
      toast.error(String(error));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      {/*
        Three columns, not five.

        "Current" was one of them and had nothing of its own to say: the rent
        box is filled with the seat's current rent, so the column repeated it
        except in the seconds between typing and saving. "State" was another --
        a whole column to write "In use" on nearly every row. Both are gone: the
        state now rides beside the seat's name, and only when it is not the
        ordinary one.

        Five columns did not fit, so the table scrolled sideways. Dropping the
        two that were not earning their width is the fix; widening the dialog
        would only have moved the same question to a smaller screen.
      */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stroke text-left text-xs uppercase text-gray-500 dark:border-strokedark dark:text-gray-400">
            <th className="py-1.5 pr-2">Seat</th>
            <th className="py-1.5 pr-2">Rent per night</th>
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody>
          {seats.map((seat) => {
            const off = Number(seat.status) !== 1;
            const changed = drafts[seat.id!] !== undefined;

            return (
              <tr
                key={seat.id}
                className={`border-b border-stroke dark:border-strokedark ${off ? 'opacity-60' : ''}`}
              >
                <td className="whitespace-nowrap py-1.5 pr-2 font-medium text-black dark:text-white">
                  {seat.name ? `${seat.code} · ${seat.name}` : `Seat ${seat.code}`}
                  {/* Said only when it is not the ordinary answer. A column
                      that reads "In use" on every row is a column of noise. */}
                  {off ? (
                    <span
                      className="ml-1.5 text-xs font-normal text-gray-400"
                      title="Kept so that older bookings still read. Raise the bed count to bring it back."
                    >
                      switched off
                    </span>
                  ) : null}
                </td>
                <td className="py-1.5 pr-2">
                  <Input
                    type="number"
                    min={0}
                    value={rentOf(seat)}
                    // The box already holds what the bed costs now, which is
                    // why there is no "current" column beside it.
                    placeholder="—"
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [seat.id!]: e.target.value }))
                    }
                    className={fieldClass('sm', `w-full min-w-20 ${FIELD_TRANSPARENT}`)}
                  />
                </td>
                <td className="py-1.5 text-right">
                  <ButtonLoading
                    onClick={() => handleSave(seat)}
                    buttonLoading={savingId === seat.id}
                    disabled={!changed}
                    size="sm"
                    label="Save"
                    variant={changed ? 'primary' : 'default'}
                    icon={<FiCheck size={14} />}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
        A seat rate is not the room rate divided by the beds — the two are separate commercial
        numbers and are never added together.
      </p>
    </div>
  );
};

export default SeatEditor;
