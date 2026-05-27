import React, { useEffect, useMemo, useState } from 'react';
import { FiRefreshCcw } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';

import Loader from '../../../../common/Loader';
import BranchDropdown from '../../../utils/utils-functions/BranchDropdown';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { getDdlProtectedBranch } from '../../branch/ddlBranchSlider';
import { fetchHolidays, fetchWeeklyHolidays } from './attendanceSlice';

const now = new Date();
const commandButtonClass = 'h-10 min-w-25 rounded-none bg-slate-700 px-5 text-sm font-medium text-white hover:bg-slate-600 focus:bg-slate-600';

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const dayOptions = [
  { id: 0, name: 'Sunday' },
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const typeOptions = [
  { id: '', name: 'All Types' },
  { id: 'holiday', name: 'Holiday' },
  { id: 'weekly', name: 'Weekly Holiday' },
];

const dateToString = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateFromString = (value?: string | null) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const branchNameFromId = (branches: any[], branchId: any) => branches.find((branch) => String(branch.id) === String(branchId))?.name || 'All Branches';
const dayName = (day: any) => dayOptions.find((option) => String(option.id) === String(day))?.name || '-';
const dayShortName = (day: any) => dayName(day).slice(0, 3);

const HolidayCalendarReport = ({ user }: any) => {
  const dispatch = useDispatch<any>();
  const attendance = useSelector((state: any) => state.attendance);
  const branchDdlData = useSelector((state: any) => state.branchDdl);
  const branches = branchDdlData?.protectedData?.data || [];
  const holidays = Array.isArray(attendance.holidays) ? attendance.holidays : [];
  const weeklyHolidays = Array.isArray(attendance.weeklyHolidays) ? attendance.weeklyHolidays : [];
  const userBranchId = user?.branch_id ? String(user.branch_id) : '';

  const [filters, setFilters] = useState({
    branch_id: userBranchId,
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    type: '',
  });

  const monthIndex = Math.max(0, Number(filters.month || 1) - 1);
  const year = Number(filters.year || now.getFullYear());
  const monthStart = dateToString(new Date(year, monthIndex, 1));
  const monthEnd = dateToString(new Date(year, monthIndex + 1, 0));
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOffset = new Date(year, monthIndex, 1).getDay();
  const calendarSlots = [
    ...Array.from({ length: firstDayOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const trailingSlots = (7 - (calendarSlots.length % 7)) % 7;
  const calendarDays = [...calendarSlots, ...Array.from({ length: trailingSlots }, () => null)];

  const monthOptions = monthNames.map((name, index) => ({ id: String(index + 1), name }));
  const yearOptions = Array.from({ length: 5 }, (_, index) => {
    const optionYear = now.getFullYear() - index;
    return { id: String(optionYear), name: String(optionYear) };
  });

  useEffect(() => {
    dispatch(getDdlProtectedBranch());
  }, [dispatch]);

  const loadReport = (currentFilters = filters) => {
    const currentMonthIndex = Math.max(0, Number(currentFilters.month || 1) - 1);
    const currentYear = Number(currentFilters.year || now.getFullYear());

    dispatch(fetchHolidays({
      date_from: dateToString(new Date(currentYear, currentMonthIndex, 1)),
      date_to: dateToString(new Date(currentYear, currentMonthIndex + 1, 0)),
    }));
    dispatch(fetchWeeklyHolidays());
  };

  useEffect(() => {
    const nextFilters = {
      branch_id: userBranchId,
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      type: '',
    };

    setFilters((prev) => ({
      ...prev,
      branch_id: prev.branch_id || userBranchId,
    }));
    loadReport(nextFilters);
  }, [dispatch, userBranchId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const calendarRows = useMemo(() => {
    const start = dateFromString(monthStart);
    const end = dateFromString(monthEnd);
    if (!start || !end || start > end) return [];

    const holidayRows = holidays
      .filter((holiday: any) => !filters.branch_id || !holiday.branch_id || String(holiday.branch_id) === String(filters.branch_id))
      .map((holiday: any) => ({
        id: `holiday-${holiday.id || holiday.holiday_date}-${holiday.branch_id || 'all'}`,
        calendar_date: String(holiday.holiday_date || '').slice(0, 10),
        title: holiday.holiday_name || '-',
        type: 'Holiday',
        sub_type: holiday.holiday_type || '-',
        branch_name: holiday.branch_name || branchNameFromId(branches, holiday.branch_id),
        paid: Number(holiday.is_paid) ? 'Yes' : 'No',
        optional: Number(holiday.is_optional) ? 'Yes' : 'No',
        remarks: holiday.remarks || '',
      }))
      .filter((row: any) => row.calendar_date >= monthStart && row.calendar_date <= monthEnd);

    const enabledWeeklyHolidays = weeklyHolidays
      .filter((weekly: any) => Number(weekly.is_enabled) === 1)
      .filter((weekly: any) => !filters.branch_id || !weekly.branch_id || String(weekly.branch_id) === String(filters.branch_id));

    const weeklyPolicies = enabledWeeklyHolidays.length > 0
      ? enabledWeeklyHolidays
      : [{
        id: 'default-friday',
        day_of_week: 5,
        branch_id: filters.branch_id,
        branch_name: branchNameFromId(branches, filters.branch_id),
        remarks: 'Default weekly holiday',
      }];

    const weeklyRows = weeklyPolicies
      .flatMap((weekly: any) => {
        const effectiveFrom = dateFromString(weekly.effective_from) || start;
        const effectiveTo = dateFromString(weekly.effective_to) || end;
        const current = new Date(Math.max(start.getTime(), effectiveFrom.getTime()));
        const last = new Date(Math.min(end.getTime(), effectiveTo.getTime()));
        const rows = [];

        while (current <= last && rows.length < 370) {
          if (String(current.getDay()) === String(weekly.day_of_week)) {
            const dateKey = dateToString(current);
            rows.push({
              id: `weekly-${weekly.id || weekly.day_of_week}-${dateKey}-${weekly.branch_id || 'all'}`,
              calendar_date: dateKey,
              title: `${dayName(weekly.day_of_week)} Weekly Holiday`,
              type: 'Weekly Holiday',
              sub_type: dayName(weekly.day_of_week),
              branch_name: weekly.branch_name || branchNameFromId(branches, weekly.branch_id),
              paid: 'Yes',
              optional: 'No',
              remarks: weekly.remarks || '',
            });
          }
          current.setDate(current.getDate() + 1);
        }

        return rows;
      });

    return [...holidayRows, ...weeklyRows]
      .filter((row: any) => {
        if (filters.type === 'holiday') return row.type === 'Holiday';
        if (filters.type === 'weekly') return row.type === 'Weekly Holiday';
        return true;
      })
      .sort((a: any, b: any) => String(a.calendar_date || '').localeCompare(String(b.calendar_date || '')) || String(a.type || '').localeCompare(String(b.type || '')));
  }, [branches, filters.branch_id, filters.type, holidays, monthEnd, monthStart, weeklyHolidays]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    calendarRows.forEach((row: any) => {
      if (!map.has(row.calendar_date)) map.set(row.calendar_date, []);
      map.get(row.calendar_date)?.push(row);
    });
    return map;
  }, [calendarRows]);

  const cards = [
    { label: 'Total Days', value: calendarRows.length },
    { label: 'Holiday', value: calendarRows.filter((row: any) => row.type === 'Holiday').length },
    { label: 'Weekly Holiday', value: calendarRows.filter((row: any) => row.type === 'Weekly Holiday').length },
    { label: 'Paid', value: calendarRows.filter((row: any) => row.paid === 'Yes').length },
    { label: 'Optional', value: calendarRows.filter((row: any) => row.optional === 'Yes').length },
  ];

  return (
    <div>
      <HelmetTitle title="Holiday Calendar Report" />
      {attendance.loading && <Loader />}

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
        <DropdownCommon id="month" name="month" label="Month" value={filters.month} data={monthOptions} onChange={handleChange} className="h-9" />
        <DropdownCommon id="year" name="year" label="Year" value={filters.year} data={yearOptions} onChange={handleChange} className="h-9" />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Branch/Project</label>
          <BranchDropdown
            name="branch_id"
            defaultValue={userBranchId}
            branchDdl={[{ id: '', name: 'All Branches' }, ...branches]}
            value={filters.branch_id?.toString() ?? ''}
            onChange={handleChange}
            className="h-9 w-full font-medium text-sm p-1.5"
          />
        </div>
        <DropdownCommon id="type" name="type" label="Type" value={filters.type} data={typeOptions} onChange={handleChange} className="h-9" />
        <div className="flex items-end">
          <button type="button" onClick={() => loadReport()} className={`inline-flex items-center justify-center ${commandButtonClass}`}>
            <FiRefreshCcw className="mr-2" />
            Load
          </button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        {cards.map((card) => (
          <div key={card.label} className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-boxdark">
            <div className="text-xs text-slate-500 dark:text-slate-300">{card.label}</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-700">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {monthNames[monthIndex]} {year}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {branchNameFromId(branches, filters.branch_id)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="h-3 w-3 border border-emerald-300 bg-emerald-50" />
              Holiday
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="h-3 w-3 border border-blue-300 bg-blue-50" />
              Weekly
            </span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
              <span className="h-3 w-3 border border-amber-300 bg-amber-50" />
              Optional
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-100 text-center text-xs font-semibold uppercase text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {dayOptions.map((day) => (
            <div key={day.id} className="border-r border-slate-200 px-2 py-2 last:border-r-0 dark:border-slate-700">
              {dayShortName(day.id)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-white dark:bg-boxdark">
          {calendarDays.map((day, index) => {
            const dateKey = day ? dateToString(new Date(year, monthIndex, day)) : '';
            const events = dateKey ? eventsByDate.get(dateKey) || [] : [];
            const hasHoliday = events.some((event) => event.type === 'Holiday');
            const hasWeekly = events.some((event) => event.type === 'Weekly Holiday');
            const hasOptional = events.some((event) => event.optional === 'Yes');
            const dayBackgroundClass = !day
              ? 'bg-slate-50 dark:bg-slate-900/30'
              : hasHoliday
                ? hasOptional
                  ? 'bg-amber-50 dark:bg-amber-950/30'
                  : 'bg-emerald-50 dark:bg-emerald-950/30'
                : hasWeekly
                  ? 'bg-blue-50 dark:bg-blue-950/30'
                  : 'bg-white dark:bg-boxdark';
            const dayBorderClass = hasHoliday
              ? hasOptional
                ? 'border-amber-300 dark:border-amber-700'
                : 'border-emerald-300 dark:border-emerald-700'
              : hasWeekly
                ? 'border-blue-300 dark:border-blue-700'
                : 'border-slate-200 dark:border-slate-700';

            return (
              <div
                key={`${dateKey || 'blank'}-${index}`}
                className={`min-h-[118px] border-b border-r p-2 last:border-r-0 ${dayBackgroundClass} ${dayBorderClass}`}
              >
                {day && (
                  <>
                    <div className={`mb-2 flex h-6 w-6 items-center justify-center text-sm font-semibold ${
                      hasHoliday
                        ? 'bg-emerald-100 text-emerald-800'
                        : hasWeekly
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map((event: any) => (
                        <div
                          key={event.id}
                          title={`${event.title} - ${event.branch_name}${event.remarks ? ` (${event.remarks})` : ''}`}
                          className={`truncate border px-2 py-1 text-[11px] font-medium ${
                            event.type === 'Holiday'
                              ? hasOptional
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                              : 'border-blue-300 bg-blue-50 text-blue-800'
                          }`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-300">
                          +{events.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HolidayCalendarReport;
