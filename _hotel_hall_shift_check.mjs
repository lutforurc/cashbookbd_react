/**
 * Hotel: halls by the shift -- the screens read back.
 *
 *     node _hotel_hall_shift_check.mjs
 *
 * Shift instead of Sitting on Hotel Setup, the larger Back to bookings button,
 * a same-date hall booking on New Booking (no room read, halls through the
 * Departure day), and the bill dropping its Nights line for a hall by the shift.
 */
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
let pass = 0;
let fail = 0;
const check = (label, ok) => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
};
const dir = 'src/components/modules/hotel';
const visible = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

console.log('Hotel Setup: Shift\n');
const setup = read(`${dir}/HotelSetup.tsx`);
const slots = read(`${dir}/SlotsTab.tsx`);
const tile = read(`${dir}/RoomTile.tsx`);
const panel = read(`${dir}/RoomPanel.tsx`);
check('tab reads "Shift"', /key: 'slots', label: 'Shift'/.test(setup));
check('Shift tab shows no "Sitting" to the reader', !/[Ss]itting/.test(visible(slots)));
check('hall tiles and panel say shift', !/'[^']*[Ss]itting[^']*'/.test(visible(tile).replace(/sittings\.|room\.sittings|const sittings/g, '')) && /Let by the shift/.test(panel) && /Per shift/.test(panel));

console.log('\nBack to bookings\n');
for (const f of ['FolioScreen', 'CheckOutScreen', 'BookingFormScreen']) {
  const src = read(`${dir}/booking/${f}.tsx`);
  const count = (src.match(/Back to bookings/g) || []).length;
  const big = (src.match(/gap-2 rounded px-1 py-1 text-base font-semibold text-primary[\s\S]{0,80}?<FiArrowLeft size=\{18\} \/>[\s\S]{0,10}?Back to bookings/g) || []).length;
  check(`${f}: every Back to bookings is the larger button (${big}/${count})`, count > 0 && big === count);
}

console.log('\nNew Booking: a hall on one date\n');
const form = read(`${dir}/booking/BookingFormScreen.tsx`);
check('same date is a day booking: no room read', /const sameDay = from === to;/.test(form) && /if \(sameDay\) \{\s*dispatch\(clearAvailability\(\)\);/.test(form));
check('halls read Arrival to Departure, Departure included', /date_from: from,\s*date_to: to,/.test(form) && !/lastNight/.test(visible(form)));
check('the answer block opens for a day booking too', /\(availability \|\| dayOnly\) && !isWalkIn/.test(form));
check('rooms drawn only with a night; a note otherwise', /a room needs at least one night/.test(form));
check('leaving the dates resets day mode', /setDayOnly\(false\)/.test(form));

console.log('\nThe bill\n');
const folio = read(`${dir}/booking/FolioScreen.tsx`);
const tpl = read('src/components/utils/print-designer/printTemplate.ts');
check('asShiftBill drops only the Nights row', /export const asShiftBill/.test(tpl) && /item\.field !== 'nights'/.test(tpl));
check('Folio applies it when the server says by_shift', /payload\.basic\?\.by_shift\s*\?\s*asShiftBill\(layout\)/.test(folio));
check('walk-in bills still use asWalkInBill', /asWalkInBill\(layout\)/.test(folio));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
