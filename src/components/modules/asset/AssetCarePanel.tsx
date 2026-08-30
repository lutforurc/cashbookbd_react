import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiCheckCircle, FiSave, FiTool, FiUser } from 'react-icons/fi';

import InputElement from '../../utils/fields/InputElement';
import InputDatePicker from '../../utils/fields/DatePicker';
import DropdownCommon from '../../utils/utils-functions/DropdownCommon';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import {
  API_ASSET_CUSTODY_URL,
  API_ASSET_HISTORY_URL,
  API_ASSET_MAINTENANCE_URL,
  API_ASSET_PEOPLE_URL,
  API_ASSET_VERIFY_URL,
} from '../../services/apiRoutes';
import { money } from '../hotel/setupHelpers';

/**
 * Everything known about one asset that is not money: who is holding it,
 * whether it was there when somebody looked, and what it has cost to keep.
 *
 * ⚠️ NOTHING HERE POSTS. A repair bill is paid through the ordinary expense
 * voucher like any other bill; the cost recorded against a visit is the SERVICE
 * HISTORY, kept so that "is this generator worth keeping" has an answer. The
 * panel says so where the money is typed, because a box labelled "cost" that
 * quietly posts nothing is one somebody will otherwise enter twice — once here
 * and once in the voucher — and then look for in the ledger.
 *
 * ⚠️ CUSTODY IS A LOG, NOT A FIELD. Who has it now is the last row, not a
 * column on the asset: a column would answer "who has it" and lose "who had it
 * in March", which is the question actually asked when something goes missing.
 *
 * ⚠️ AND A MISSING ASSET IS RECORDED, NEVER ACTED ON. Ticking "not there" does
 * not write anything off — somebody decides that, and writing off is its own act
 * with its own entries, done from the register's own button.
 */

const asText = (date: Date | null) => {
  if (!date) return '';

  // Local parts, never toISOString(): these are calendar dates, and going
  // through UTC moves them a day for half the world.
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, '0')}`;
};

const asDate = (value?: string | null): Date | null => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
};

const onTheDay = (value?: string | null): string => {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : '—';
};

const today = () => asText(new Date());

const FOUND_NAMES: Record<string, string> = {
  found: 'There',
  missing: 'Not there',
  damaged: 'There but damaged',
};

const KIND_NAMES: Record<string, string> = {
  service: 'Service',
  repair: 'Repair',
  inspection: 'Inspection',
};

type Section = 'custody' | 'count' | 'upkeep';

const AssetCarePanel = ({ asset, onClose }: { asset: any; onClose: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [people, setPeople] = useState<any[]>([]);
  const [section, setSection] = useState<Section>('custody');
  const [saving, setSaving] = useState(false);

  /**
   * ⚠️ The issue form opens as a RETURN when somebody is holding it, and as an
   * ISSUE when nobody is. Handing out a thing already handed out is the mistake
   * this panel exists to stop, so the form does not offer it first.
   */
  const [hand, setHand] = useState<any>({
    action: 'issued',
    on_date: today(),
    employee_id: '',
    holder_name: '',
    location: '',
    condition_note: '',
  });

  const [count, setCount] = useState<any>({ counted_on: today(), found: 'found', location: '', note: '' });

  const [visit, setVisit] = useState<any>({
    on_date: today(),
    kind: 'service',
    description: '',
    vendor: '',
    cost: '',
    days_down: '',
    next_due_on: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await httpService.get(`${API_ASSET_HISTORY_URL}/${asset.id}`);
      const body = res?.data?.data?.data ?? res?.data?.data ?? {};

      setData(body);

      // The form follows what the log says, rather than making somebody read it.
      setHand((was: any) => ({ ...was, action: body?.held_by ? 'returned' : 'issued' }));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read its history');
      onClose();
    }
  }, [asset.id, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // ⚠️ A failure here is not worth a message. No staff list simply means the
    // holder is named in writing, which the form allows anyway.
    httpService
      .get(API_ASSET_PEOPLE_URL)
      .then((res: any) => setPeople(res?.data?.data?.data ?? []))
      .catch(() => setPeople([]));
  }, []);

  const send = async (url: string, body: any, done: () => void) => {
    setSaving(true);

    try {
      const res = await httpService.post(url, body);
      toast.success(res?.data?.message || 'Saved', { autoClose: 6000 });
      done();
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not save it');
    } finally {
      setSaving(false);
    }
  };

  const handOver = () => {
    if (
      hand.action === 'issued' &&
      !hand.employee_id &&
      !hand.holder_name.trim() &&
      !hand.location.trim()
    ) {
      // Said here as well as by the server: a form that has to be submitted to
      // learn what it wants is a form that gets abandoned.
      toast.error('Say who took it, or where it went.');
      return;
    }

    send(
      `${API_ASSET_CUSTODY_URL}/${asset.id}`,
      {
        action: hand.action,
        on_date: hand.on_date,
        employee_id: hand.employee_id || null,
        holder_name: hand.holder_name || null,
        location: hand.location || null,
        condition_note: hand.condition_note || null,
      },
      () =>
        setHand({
          action: 'issued',
          on_date: today(),
          employee_id: '',
          holder_name: '',
          location: '',
          condition_note: '',
        }),
    );
  };

  const record = () =>
    send(
      `${API_ASSET_VERIFY_URL}/${asset.id}`,
      { counted_on: count.counted_on, found: count.found, location: count.location || null, note: count.note || null },
      () => setCount({ counted_on: today(), found: 'found', location: '', note: '' }),
    );

  const logVisit = () => {
    if (!visit.description.trim()) {
      toast.error('What was done to it?');
      return;
    }

    send(
      `${API_ASSET_MAINTENANCE_URL}/${asset.id}`,
      {
        on_date: visit.on_date,
        kind: visit.kind,
        description: visit.description,
        vendor: visit.vendor || null,
        cost: visit.cost === '' ? 0 : visit.cost,
        days_down: visit.days_down === '' ? 0 : visit.days_down,
        next_due_on: visit.next_due_on || null,
      },
      () =>
        setVisit({
          on_date: today(),
          kind: 'service',
          description: '',
          vendor: '',
          cost: '',
          days_down: '',
          next_due_on: '',
        }),
    );
  };

  const held = data?.held_by;

  const holder = (row: any) =>
    row.employee_name || row.holder_name || row.location || 'somebody unnamed';

  const SECTIONS: { key: Section; label: string; icon: any }[] = [
    { key: 'custody', label: 'Who has it', icon: <FiUser size={14} /> },
    { key: 'count', label: 'Was it there', icon: <FiCheckCircle size={14} /> },
    { key: 'upkeep', label: 'Upkeep', icon: <FiTool size={14} /> },
  ];

  return (
    <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-medium text-black dark:text-white">
          {asset.name}{' '}
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{asset.code}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 underline dark:text-gray-400"
        >
          Close
        </button>
      </div>

      {/* ⚠️ The one line somebody opened this panel to read, above everything
          else — where the thing is and who answers for it. */}
      <div className="mb-3 rounded border border-stroke p-2 text-xs dark:border-strokedark">
        {held ? (
          <span className="text-black dark:text-white">
            With <strong>{held.employee || held.name || held.location}</strong>
            {held.location && (held.employee || held.name) ? ` at ${held.location}` : ''} since{' '}
            {onTheDay(held.since)}
          </span>
        ) : (
          <span className="text-gray-500 dark:text-gray-400">
            Not issued to anybody — the register says it is at{' '}
            <strong className="text-black dark:text-white">{asset.location || 'no stated place'}</strong>
          </span>
        )}
        {data?.verifications?.length ? (
          <span className="ml-3 text-gray-500 dark:text-gray-400">
            Last counted {onTheDay(String(data.verifications[0].counted_on).slice(0, 10))} ·{' '}
            {FOUND_NAMES[data.verifications[0].found] ?? data.verifications[0].found}
          </span>
        ) : (
          <span className="ml-3 text-gray-500 dark:text-gray-400">Never counted</span>
        )}
        {Number(data?.maintenance_total) ? (
          <span className="ml-3 text-gray-500 dark:text-gray-400">
            Kept for {money(data.maintenance_total)} over {data.maintenance.length} visit(s)
          </span>
        ) : null}
      </div>

      <div className="mb-3 flex flex-wrap gap-1 border-b border-stroke dark:border-strokedark">
        {SECTIONS.map((one) => (
          <button
            key={one.key}
            type="button"
            onClick={() => setSection(one.key)}
            className={`flex items-center gap-1 rounded-t px-3 py-1 text-xs font-medium transition ${
              section === one.key
                ? 'border-b-2 border-primary text-primary dark:border-secondary dark:text-secondary'
                : 'border-b-2 border-transparent text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            {one.icon}
            {one.label}
          </button>
        ))}
      </div>

      {section === 'custody' ? (
        <div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <DropdownCommon
              id="custody_action"
              name="action"
              label="What is happening"
              data={[
                { id: 'issued', name: 'Handing it out' },
                { id: 'returned', name: 'Taking it back' },
              ]}
              value={hand.action}
              onChange={(e: any) => setHand({ ...hand, action: e.target.value })}
            />

            <InputDatePicker
              id="custody_on"
              name="on_date"
              label="On"
              selectedDate={asDate(hand.on_date)}
              setSelectedDate={(date: Date | null) => setHand({ ...hand, on_date: asText(date) })}
              setCurrentDate={() => undefined}
              className="w-full"
            />

            {/* ⚠️ Both boxes, always. A laptop goes to a person; a generator
                goes to a site and answers to whoever is there. Insisting on a
                name from the payroll would make somebody invent one. */}
            {hand.action === 'issued' ? (
              <>
                {people.length ? (
                  <DropdownCommon
                    id="custody_employee"
                    name="employee_id"
                    label="To whom"
                    data={[
                      { id: '', name: 'Nobody on the payroll' },
                      ...people.map((one: any) => ({ id: one.id, name: one.name })),
                    ]}
                    value={hand.employee_id}
                    onChange={(e: any) => setHand({ ...hand, employee_id: e.target.value })}
                  />
                ) : (
                  <InputElement
                    id="custody_holder"
                    name="holder_name"
                    label="To whom"
                    placeholder="Rafiq, driver"
                    value={hand.holder_name}
                    onChange={(e: any) => setHand({ ...hand, holder_name: e.target.value })}
                    description="A name in writing is enough."
                  />
                )}

                <InputElement
                  id="custody_location"
                  name="location"
                  label="Or where it went"
                  placeholder="Mirpur site office"
                  value={hand.location}
                  onChange={(e: any) => setHand({ ...hand, location: e.target.value })}
                />
              </>
            ) : (
              <div className="md:col-span-2">
                <InputElement
                  id="custody_back_note"
                  name="condition_note"
                  label="What it came back like"
                  placeholder="Wing mirror broken"
                  value={hand.condition_note}
                  onChange={(e: any) => setHand({ ...hand, condition_note: e.target.value })}
                  description="Worth a line even when nothing is wrong."
                />
              </div>
            )}
          </div>

          {hand.action === 'issued' ? (
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {people.length ? (
                <InputElement
                  id="custody_holder_named"
                  name="holder_name"
                  label="Or a name in writing"
                  placeholder="Rafiq, driver"
                  value={hand.holder_name}
                  onChange={(e: any) => setHand({ ...hand, holder_name: e.target.value })}
                  description="For somebody who is not on the payroll."
                />
              ) : null}

              {/* ⚠️ The only defence when it comes back broken: what it looked
                  like when it left. */}
              <InputElement
                id="custody_condition"
                name="condition_note"
                label="What it looks like now"
                placeholder="Two scratches on the near-side door"
                value={hand.condition_note}
                onChange={(e: any) => setHand({ ...hand, condition_note: e.target.value })}
                description="Written down at the handover, not after the argument."
              />
            </div>
          ) : null}

          <div className="mt-3">
            <ButtonLoading
              onClick={handOver}
              buttonLoading={saving}
              icon={<FiSave className="h-5 w-5" />}
              label={hand.action === 'issued' ? 'Hand it out' : 'Take it back'}
              variant="primary"
            />
          </div>

          <div className="mt-3">
            {(data?.custody ?? []).length ? (
              (data.custody ?? []).map((row: any) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {onTheDay(String(row.on_date).slice(0, 10))} ·{' '}
                    {row.action === 'issued' ? 'out to' : 'back from'} {holder(row)}
                    {row.condition_note ? (
                      <span className="text-gray-400"> · {row.condition_note}</span>
                    ) : null}
                  </span>
                  <span className="text-black dark:text-white">
                    {row.action === 'issued' ? 'Issued' : 'Returned'}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-1 text-xs text-gray-500 dark:text-gray-400">
                Never handed out. Everything issued and returned shows here, oldest at the bottom.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {section === 'count' ? (
        <div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputDatePicker
              id="count_on"
              name="counted_on"
              label="Counted on"
              selectedDate={asDate(count.counted_on)}
              setSelectedDate={(date: Date | null) =>
                setCount({ ...count, counted_on: asText(date) })
              }
              setCurrentDate={() => undefined}
              className="w-full"
            />

            <DropdownCommon
              id="count_found"
              name="found"
              label="What the count found"
              data={[
                { id: 'found', name: 'There' },
                { id: 'missing', name: 'Not there' },
                { id: 'damaged', name: 'There but damaged' },
              ]}
              value={count.found}
              onChange={(e: any) => setCount({ ...count, found: e.target.value })}
            />

            <InputElement
              id="count_location"
              name="location"
              label="Where it actually was"
              placeholder={asset.location || 'Second floor store'}
              value={count.location}
              onChange={(e: any) => setCount({ ...count, location: e.target.value })}
              description="Often not where the register says."
            />

            <InputElement
              id="count_note"
              name="note"
              label="Note"
              value={count.note}
              onChange={(e: any) => setCount({ ...count, note: e.target.value })}
            />
          </div>

          {/* ⚠️ Said plainly, because ticking "not there" looks like it should
              do something and must not. */}
          {count.found !== 'found' ? (
            <p className="mt-2 rounded border border-amber-400 bg-amber-50 p-2 text-xs leading-snug text-amber-900 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50">
              This records what the count found and nothing else. It does not write the asset off
              — somebody decides that, and it is done from the register with its own entries.
            </p>
          ) : null}

          <div className="mt-3">
            <ButtonLoading
              onClick={record}
              buttonLoading={saving}
              icon={<FiSave className="h-5 w-5" />}
              label="Record it"
              variant="primary"
            />
          </div>

          <div className="mt-3">
            {(data?.verifications ?? []).length ? (
              (data.verifications ?? []).map((row: any) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
                >
                  <span className="text-gray-600 dark:text-gray-300">
                    {onTheDay(String(row.counted_on).slice(0, 10))}
                    {row.location ? ` · seen at ${row.location}` : ''}
                    {row.note ? <span className="text-gray-400"> · {row.note}</span> : null}
                  </span>
                  <span
                    className={
                      row.found === 'found'
                        ? 'text-success dark:text-emerald-400'
                        : 'text-danger dark:text-red-400'
                    }
                  >
                    {FOUND_NAMES[row.found] ?? row.found}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-1 text-xs text-gray-500 dark:text-gray-400">
                Never counted. One row per round — counting it twice in one round corrects the
                first answer rather than adding a second.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {section === 'upkeep' ? (
        <div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputDatePicker
              id="visit_on"
              name="on_date"
              label="On"
              selectedDate={asDate(visit.on_date)}
              setSelectedDate={(date: Date | null) => setVisit({ ...visit, on_date: asText(date) })}
              setCurrentDate={() => undefined}
              className="w-full"
            />

            <DropdownCommon
              id="visit_kind"
              name="kind"
              label="What kind"
              data={[
                { id: 'service', name: 'Service' },
                { id: 'repair', name: 'Repair' },
                { id: 'inspection', name: 'Inspection' },
              ]}
              value={visit.kind}
              onChange={(e: any) => setVisit({ ...visit, kind: e.target.value })}
            />

            <div className="md:col-span-2">
              <InputElement
                id="visit_description"
                name="description"
                label="What was done"
                placeholder="Clutch plate replaced"
                value={visit.description}
                onChange={(e: any) => setVisit({ ...visit, description: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
            <InputElement
              id="visit_vendor"
              name="vendor"
              label="By whom"
              placeholder="Karim Motors"
              value={visit.vendor}
              onChange={(e: any) => setVisit({ ...visit, vendor: e.target.value })}
            />

            <InputElement
              id="visit_cost"
              name="cost"
              label="What it cost"
              type="number"
              min={0}
              value={String(visit.cost ?? '')}
              onChange={(e: any) => setVisit({ ...visit, cost: e.target.value })}
              description="Kept as history. Not posted."
            />

            <InputElement
              id="visit_days_down"
              name="days_down"
              label="Days out of use"
              type="number"
              min={0}
              value={String(visit.days_down ?? '')}
              onChange={(e: any) => setVisit({ ...visit, days_down: e.target.value })}
            />

            <div>
              <InputDatePicker
                id="visit_next_due"
                name="next_due_on"
                label="Due again"
                selectedDate={asDate(visit.next_due_on)}
                setSelectedDate={(date: Date | null) =>
                  setVisit({ ...visit, next_due_on: asText(date) })
                }
                setCurrentDate={() => undefined}
                className="w-full"
              />
              {/* ⚠️ Promising a reminder that cannot arrive would be worse than
                  showing the date: nothing on these servers runs on a clock. */}
              <p className="mt-1 text-xs leading-snug text-gray-500 dark:text-gray-400">
                Shown here and on the list. Nothing chases it.
              </p>
            </div>
          </div>

          {/* ⚠️ The sentence that keeps the same money out of the books twice. */}
          <p className="mt-2 rounded border border-stroke p-2 text-xs leading-snug text-gray-500 dark:border-strokedark dark:text-gray-400">
            <strong className="text-black dark:text-white">Nothing here is posted.</strong> The bill
            itself goes through an ordinary expense voucher, as it always has. What this keeps is
            the service history — so that <em>is this worth keeping</em> has an answer beside the
            asset.
          </p>

          <div className="mt-3">
            <ButtonLoading
              onClick={logVisit}
              buttonLoading={saving}
              icon={<FiSave className="h-5 w-5" />}
              label="Write it down"
              variant="primary"
            />
          </div>

          <div className="mt-3">
            {(data?.maintenance ?? []).length ? (
              <>
                {(data.maintenance ?? []).map((row: any) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke py-1 text-xs last:border-0 dark:border-strokedark"
                  >
                    <span className="text-gray-600 dark:text-gray-300">
                      {onTheDay(String(row.on_date).slice(0, 10))} ·{' '}
                      {KIND_NAMES[row.kind] ?? row.kind} · {row.description}
                      {row.vendor ? <span className="text-gray-400"> · {row.vendor}</span> : null}
                      {Number(row.days_down) ? (
                        <span className="text-gray-400"> · {row.days_down} day(s) down</span>
                      ) : null}
                      {row.next_due_on ? (
                        <span className="text-gray-400">
                          {' '}
                          · due again {onTheDay(String(row.next_due_on).slice(0, 10))}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-black dark:text-white">
                      {Number(row.cost) ? money(row.cost) : '—'}
                    </span>
                  </div>
                ))}

                {/* Against the cost, which is the comparison the history is for. */}
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm font-semibold">
                  <span className="text-black dark:text-white">
                    Kept for — against a cost of {money(asset.cost)}
                  </span>
                  <span className="text-black dark:text-white">{money(data.maintenance_total)}</span>
                </div>
              </>
            ) : (
              <p className="py-1 text-xs text-gray-500 dark:text-gray-400">
                Nothing written down yet.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AssetCarePanel;
