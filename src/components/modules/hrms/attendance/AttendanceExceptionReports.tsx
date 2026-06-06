import React, { useMemo } from 'react';
import { FiClock, FiLogOut, FiUserX } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';

import routes from '../../../services/appRoutes';
import AttendanceReport from './AttendanceReport';

const reportTabs = [
  {
    key: 'absent',
    label: 'Absent',
    title: 'Absent Report',
    path: routes.hrms_absent_report,
    defaultStatus: 'absent',
    reportType: 'absent' as const,
    icon: FiUserX,
  },
  {
    key: 'late',
    label: 'Late',
    title: 'Late Report',
    path: routes.hrms_late_report,
    defaultStatus: 'late',
    reportType: 'late' as const,
    icon: FiClock,
  },
  {
    key: 'early_out',
    label: 'Early Out',
    title: 'Early Out Report',
    path: routes.hrms_early_out_report,
    defaultStatus: 'early_out',
    reportType: 'early_out' as const,
    icon: FiLogOut,
  },
];

const AttendanceExceptionReports = ({ user }: any) => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(
    () => reportTabs.find((tab) => location.pathname === tab.path) || reportTabs[0],
    [location.pathname],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab.key === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                active
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'
              }`}
            >
              <Icon className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AttendanceReport
        user={user}
        reportTitle={activeTab.title}
        defaultStatus={activeTab.defaultStatus}
        reportType={activeTab.reportType}
      />
    </div>
  );
};

export default AttendanceExceptionReports;
