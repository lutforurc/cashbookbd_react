import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import InputDatePicker from '../../../utils/fields/DatePicker';
import Loader from '../../../../common/Loader';
import { Button } from '../../../../pages/UiElements/CustomButtons';

import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { money } from '../setupHelpers';
import { clearCalendar, monthRead, timelineRead } from './calendarSlice';

/**
 * The property over TIME -- phase 4.
 *
 * The availability screen answers "what is free between these two dates", which
 * is what somebody taking a booking asks. Neither of these could be asked of it:
 *
 *   THE MONTH -- how full were we in August, and how does September look? The
 *   owner's question, and the one they ask first.
 *   THE TAPE  -- which room has a three-night hole in it next week? The desk's,
 *   and it wants rooms down the side and dates across the top.
 *
 * ⚠️ NOTHING HERE BOOKS ANYTHING, and the tape chart is the one that could be
 * mistaken for something that does. A booking is taken on the availability
 * screen, against the unique key that actually stops a bed being sold twice --
 * this is a picture of what is held, and it was true when it was read.
 *
 * ⚠️ ADR AND RevPAR ARE DIFFERENT DIVISIONS, and the screen labels them so.
 * ADR is what a bed sold for; RevPAR is what every bed the property has earned,
 * whether it sold or not. A hotel selling half its rooms at a high rate has a
 * good ADR and a bad RevPAR -- quoting one for the other is how a bad month gets
 * reported as a good one.
 */

const VIEWS = [
  { id: 'month', name: 'The month' },
  { id: 'tape', name: 'Room by room' },
];

const SPANS = [
  { id: '7', name: '7 nights' },
  { id: '14', name: '14 nights' },
  { id: '21', name: '21 nights' },
  { id: '31', name: '31 nights' },
];

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): a night is a calendar date at the desk,
  // and going through UTC moves it a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const today = () => asText(new Date());

const TAB = 'rounded-t border-b-2 px-4 py-2 text-sm font-medium transition';

/**
 * How full a night was, as a colour.
 *
 * ⚠️ ONE HUE, LIGHT TO DARK. It was a rainbow -- green, amber, orange, rose --
 * and that is wrong twice over. Occupancy is a MAGNITUDE, and a magnitude wants
 * a single hue ramping in lightness; a multi-hue ramp invents a midpoint that
 * means something, and here it also said the wrong thing commercially: a full
 * hotel was painted alarm-red and an empty one reassuring green, which is
 * backwards for the only number on the page that is revenue.
 *
 * ⚠️ THE DARK STEPS ARE CHOSEN, NOT FLIPPED. On a dark surface "near zero"
 * recedes TOWARD the surface, so the ramp runs dark-to-light as the month fills
 * up -- the same blue, stepped for the ground it is standing on. An automatic
 * inversion of the light ramp would put the lightest, loudest step on the
 * emptiest night.
 *
 * ⚠️ The number is always printed beside it. Colour alone carries nothing to a
 * reader with colour blindness and nothing at all to a printer -- the same rule
 * the room grid follows (see layoutPalette), and it is what earns the ramp the
 * right to use steps that sit below 3:1 against the surface at the pale end.
 *
 * ⚠️ The INK travels with the fill. The two darkest light-mode steps and the
 * lightest dark-mode one cannot carry the same text colour as the rest, and a
 * cell whose number is unreadable is a cell that has thrown away the very thing
 * making the colour safe. Held together in one string so they cannot drift.
 *
 * Steps are the blue sequential ramp, monotonic in lightness:
 *   light  0.905 → 0.812 → 0.717 → 0.60 → 0.433
 *   dark   0.338 → 0.433 → 0.53  → 0.63 → 0.717
 */
const HEAT: { upTo: number; look: string }[] = [
  // ⚠️ Not transparent. An empty night is a real answer and the grid has to
  // read as a grid -- a month with nothing sold was a sheet of holes with a
  // border round it, and the one night that HAD sold was the only thing on
  // screen that looked like a cell at all.
  { upTo: 0, look: 'bg-slate-100/70 text-slate-600 dark:bg-white/[0.03] dark:text-slate-400' },
  { upTo: 25, look: 'bg-[#cde2fb] text-slate-900 dark:bg-[#0d366b] dark:text-slate-100' },
  { upTo: 50, look: 'bg-[#9ec5f4] text-slate-900 dark:bg-[#184f95] dark:text-slate-100' },
  { upTo: 75, look: 'bg-[#6da7ec] text-slate-900 dark:bg-[#256abf] dark:text-white' },
  { upTo: 99, look: 'bg-[#3987e5] text-white dark:bg-[#3987e5] dark:text-white' },
  { upTo: 100, look: 'bg-[#184f95] text-white dark:bg-[#6da7ec] dark:text-slate-900' },
];

const heat = (occupancy: number): string =>
  (HEAT.find((step) => occupancy <= step.upTo) ?? HEAT[HEAT.length - 1]).look;

/**
 * The ramp, drawn once so the grid above it can be read.
 *
 * A sequential scale needs its legend: five squares in a row say "these are one
 * colour getting stronger" in a way that a month of scattered cells cannot.
 */
const HeatLegend = () => (
  <div className="flex items-center gap-1.5 text-[0.65rem] text-gray-500 dark:text-gray-400">
    <span>empty</span>
    {HEAT.map((step) => (
      <span
        key={step.upTo}
        className={`h-3 w-5 rounded-sm border border-black/5 dark:border-white/10 ${step.look}`}
        title={step.upTo === 0 ? 'Nothing sold' : `up to ${step.upTo}% full`}
      />
    ))}
    <span>full</span>
  </div>
);

/**
 * One cell of the tape chart.
 *
 * ⚠️ A DIFFERENT QUESTION, SO A DIFFERENT LANGUAGE. The month grid asks how
 * much of the property sold -- a magnitude, hence one blue ramp. This asks
 * whether ONE room is free or taken, which is a state, and it keeps the colours
 * the room grid already uses for that state (see layoutPalette) so a clerk who
 * has learned one screen has learned both.
 */
const CELL: Record<string, string> = {
  // Given a surface for the same reason the empty day is: a tape chart of
  // mostly-free rooms was a table with nothing in it.
  free: 'bg-slate-100/70 dark:bg-white/[0.03]',
  part: 'bg-amber-200 dark:bg-amber-500/35',
  full: 'bg-rose-300 dark:bg-rose-500/45',
};

const Figure = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div
    className="rounded border border-stroke px-3 py-2 text-center dark:border-strokedark"
    title={hint}
  >
    <div className="text-lg font-semibold text-black dark:text-white">{value}</div>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
  </div>
);

const HotelCalendar = () => {
  const dispatch = useDispatch<any>();

  const month = useSelector((state: any) => state.hotelCalendar.month);
  const timeline = useSelector((state: any) => state.hotelCalendar.timeline);
  const loading = useSelector((state: any) => state.hotelCalendar.loading);
  const error = useSelector((state: any) => state.hotelCalendar.error);
  const branchDdl = useSelector((state: any) => state.branchDdl);
  const settings = useSelector((state: any) => state.settings?.data);

  const [view, setView] = useState<'month' | 'tape'>('month');
  const [branchId, setBranchId] = useState<string>('');

  const [anchor, setAnchor] = useState(() => {
    const now = new Date();
    return asText(new Date(now.getFullYear(), now.getMonth(), 1));
  });

  const [from, setFrom] = useState(today());
  const [span, setSpan] = useState('14');

  useEffect(() => {
    dispatch(getDdlProtectedBranch());

    return () => {
      dispatch(clearCalendar());
    };
  }, [dispatch]);

  useEffect(() => {
    if (!branchId && settings?.branch?.id) setBranchId(String(settings.branch.id));
  }, [settings?.branch?.id, branchId]);

  const loadMonth = useCallback(() => {
    if (!branchId) return;
    dispatch(monthRead({ month: anchor, branch_id: branchId }));
  }, [dispatch, anchor, branchId]);

  const loadTape = useCallback(() => {
    if (!branchId) return;
    dispatch(timelineRead({ from, days: Number(span), branch_id: branchId }));
  }, [dispatch, from, span, branchId]);

  useEffect(() => {
    if (view === 'month') loadMonth();
  }, [view, loadMonth]);

  useEffect(() => {
    if (view === 'tape') loadTape();
  }, [view, loadTape]);

  const shiftMonth = (by: number) => {
    const date = new Date(anchor);
    date.setMonth(date.getMonth() + by);
    setAnchor(asText(new Date(date.getFullYear(), date.getMonth(), 1)));
  };

  /**
   * The month laid out as weeks, with the leading blanks a calendar needs.
   *
   * ⚠️ Sunday first. Bangladesh's working week begins on Sunday, and a calendar
   * that started on Monday would put the weekend in the middle of the row for
   * everybody reading this.
   */
  const weeks = useMemo(() => {
    const days = month?.days ?? [];
    if (!days.length) return [];

    const rows: any[][] = [];
    let week: any[] = [];

    const firstWeekday = new Date(days[0].date).getDay();
    for (let blank = 0; blank < firstWeekday; blank += 1) week.push(null);

    days.forEach((day: any) => {
      week.push(day);
      if (week.length === 7) {
        rows.push(week);
        week = [];
      }
    });

    if (week.length) {
      while (week.length < 7) week.push(null);
      rows.push(week);
    }

    return rows;
  }, [month]);

  const totals = month?.totals;

  return (
    <div>
      <HelmetTitle title="Hotel Calendar" />

      <div className="mb-3 flex flex-wrap gap-1 border-b border-stroke dark:border-strokedark">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id as 'month' | 'tape')}
            className={`${TAB} ${
              view === item.id
                ? 'border-primary text-primary dark:border-secondary dark:text-secondary'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Property
          </span>
          <BranchDropdown
            id="hotel_calendar_branch"
            name="branch_id"
            branchDdl={branchDdl?.protectedData?.data ?? []}
            value={branchId}
            onChange={(event: any) => setBranchId(event.target.value)}
          />
        </div>

        {view === 'month' ? (
          <div className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Month
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded border border-stroke p-2 dark:border-strokedark"
                title="The month before"
              >
                <FiChevronLeft />
              </Button>
              <div className="min-w-40 text-center text-sm font-semibold text-black dark:text-white">
                {new Date(anchor).toLocaleString('en-GB', { month: 'long', year: 'numeric' })}
              </div>
              <Button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded border border-stroke p-2 dark:border-strokedark"
                title="The month after"
              >
                <FiChevronRight />
              </Button>
            </div>
          </div>
        ) : (
          <>
            <InputDatePicker
              id="tape_from"
              name="from"
              label="From"
              selectedDate={from ? new Date(from) : null}
              setSelectedDate={(d: Date | null) => setFrom(asText(d))}
              setCurrentDate={(d: Date | null) => setFrom(asText(d))}
              className="w-full"
            />
            <DropdownCommon
              id="tape_span"
              name="days"
              label="How far"
              data={SPANS}
              value={span}
              onChange={(event: any) => setSpan(event.target.value)}
            />
          </>
        )}
      </div>

      {loading && !month && !timeline ? <Loader /> : null}

      {error ? (
        <p className="mb-3 rounded border border-danger bg-rose-50 p-2.5 text-xs text-rose-900 dark:border-danger dark:bg-rose-500/15 dark:text-rose-50">
          {error}
        </p>
      ) : null}

      {view === 'month' ? (
        <>
          {totals ? (
            <>
              <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <Figure
                  label="Occupancy"
                  value={`${totals.occupancy}%`}
                  hint="Seat-nights taken — sold and held together — against every bed the property has, every night of the month."
                />
                <Figure label="Seat-nights sold" value={String(totals.sold)} />
                <Figure
                  label="Held, not sold"
                  value={String(totals.held)}
                  hint="Tentative holds. They occupy the bed and earn nothing until somebody confirms them."
                />
                <Figure
                  label="ADR"
                  value={money(totals.adr)}
                  hint="Average Daily Rate — room revenue divided by the beds that were SOLD."
                />
                <Figure
                  label="RevPAR"
                  value={money(totals.revpar)}
                  hint="Revenue Per Available Room — the same revenue divided by every bed the property HAS, sold or not. Always the smaller of the two, and the one that shows an empty month for what it is."
                />
              </div>

              <p className="mb-3 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Room revenue is the rent held against each night — before service charge and VAT,
                which is what ADR means. {month?.capacity_note}
              </p>
            </>
          ) : null}

          {weeks.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] table-fixed border-collapse">
                <thead>
                  <tr>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((name) => (
                      <th
                        key={name}
                        className="border border-stroke p-1 text-xs font-semibold text-gray-500 dark:border-strokedark dark:text-gray-400"
                      >
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, index) => (
                    <tr key={index}>
                      {week.map((day, at) =>
                        day ? (
                          <td
                            key={day.date}
                            // ⚠️ The fill carries the INK with it, so every line
                            // inside inherits a colour that can be read on the
                            // step it is standing on. Nothing in here states its
                            // own text colour -- the moment one did, it would be
                            // black on the darkest blue on exactly the nights
                            // worth reading.
                            className={`h-24 border border-stroke align-top dark:border-strokedark ${heat(
                              day.occupancy,
                            )} ${day.is_past ? 'opacity-60' : ''} ${
                              // Today, drawn INSIDE the cell: an outset ring is
                              // painted outside the border box and this table
                              // scrolls sideways, which clips it -- the same
                              // trap the room tiles hit.
                              day.date === today() ? 'ring-2 ring-inset ring-primary' : ''
                            }`}
                          >
                            <div className="flex h-full flex-col p-1">
                              <div className="flex items-baseline justify-between">
                                <span className="text-sm font-semibold">{day.date.slice(-2)}</span>
                                {/* ⚠️ The number, always, beside the colour. */}
                                <span className="text-xs font-medium">{day.occupancy}%</span>
                              </div>

                              <div className="mt-auto text-[0.65rem] leading-tight">
                                {day.sold || day.held ? (
                                  <div>
                                    {day.sold} sold
                                    {day.held ? ` · ${day.held} held` : ''}
                                  </div>
                                ) : (
                                  <div className="opacity-60">empty</div>
                                )}

                                {day.revenue ? <div>{money(day.revenue)}</div> : null}

                                {/* Arrivals and departures, where there are any.
                                    The two numbers a desk plans its morning by. */}
                                {day.arrivals || day.departures ? (
                                  <div className="opacity-75">
                                    {day.arrivals ? `↓${day.arrivals}` : ''}
                                    {day.arrivals && day.departures ? ' ' : ''}
                                    {day.departures ? `↑${day.departures}` : ''}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        ) : (
                          <td
                            key={`blank-${at}`}
                            className="h-24 border border-stroke bg-gray-50 dark:border-strokedark dark:bg-boxdark"
                          />
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  ↓ arrivals · ↑ departures. A departure is counted on the morning after the last
                  night slept, not on the date the booking was written to.
                </p>

                <HeatLegend />
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {timeline?.rooms?.length ? (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border border-stroke bg-white p-1 text-left dark:border-strokedark dark:bg-boxdark">
                      Room
                    </th>
                    {timeline.dates.map((day: any) => (
                      <th
                        key={day.date}
                        className={`w-9 border border-stroke p-1 text-center font-medium dark:border-strokedark ${
                          day.is_past ? 'text-gray-400' : 'text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        <div>{day.weekday.slice(0, 1)}</div>
                        <div className="font-semibold text-black dark:text-white">
                          {day.date.slice(-2)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeline.rooms.map((room: any) => (
                    <tr key={room.id}>
                      <th className="sticky left-0 z-10 whitespace-nowrap border border-stroke bg-white p-1 text-left font-medium text-black dark:border-strokedark dark:bg-boxdark dark:text-white">
                        {room.name}
                        <span className="ml-1 text-[0.65rem] font-normal text-gray-500 dark:text-gray-400">
                          {room.capacity} bed{room.capacity === 1 ? '' : 's'}
                        </span>
                      </th>

                      {room.cells.map((cell: any) => (
                        <td
                          key={cell.date}
                          className={`border border-stroke text-center dark:border-strokedark ${
                            CELL[cell.state] ?? ''
                          }`}
                          title={
                            cell.taken
                              ? `${cell.date}: ${cell.taken} of ${cell.capacity} taken — ${
                                  cell.booking_no
                                }${cell.guest ? `, ${cell.guest}` : ''}${
                                  cell.shared ? ' and others' : ''
                                }`
                              : `${cell.date}: free`
                          }
                        >
                          {/* ⚠️ The count, not just the colour. A dormitory with
                              three of eight beds gone is not the same thing as a
                              full one, and a colour cannot say which. */}
                          <span className="text-[0.65rem] font-semibold text-black dark:text-white">
                            {cell.taken || ''}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-2 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Each cell says how many of that room&rsquo;s beds are taken that night — amber is
                part of a room, red is all of it. <strong>Nothing here books anything:</strong> a
                room is taken on the Bookings screen, and this is what was held when the page was
                read.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};

export default HotelCalendar;
