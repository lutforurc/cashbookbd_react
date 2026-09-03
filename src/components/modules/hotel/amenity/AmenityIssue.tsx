import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiRefreshCcw } from 'react-icons/fi';

import HelmetTitle from '../../../utils/others/HelmetTitle';
import Table from '../../../utils/others/Table';
import Loader from '../../../../common/Loader';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';

import httpService from '../../../services/httpService';
import { API_MATERIAL_ISSUE_LIST_URL } from '../../../services/apiRoutes';
import routes from '../../../services/appRoutes';

/**
 * What has gone out of the store to the rooms -- §39.1.
 *
 * The list is the screen somebody opens; the form is a page of its own behind
 * the Issue button. Setup work is done once and read often, and a form sitting
 * above the list made the first thing on screen the one thing nobody had come
 * to look at.
 *
 * ⚠️ IT LISTS ORDINARY MATERIAL ISSUES. What leaves the store here is
 * indistinguishable from what leaves it on the construction screen -- same
 * endpoint, same voucher, same stock movement -- so an issue made on either
 * shows up in both places, and that is deliberate.
 */
const AmenityIssue = () => {
  const navigate = useNavigate();
  const settings = useSelector((s: any) => s.settings?.data);

  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_MATERIAL_ISSUE_LIST_URL, {
        params: { perPage: 10, branch_id: settings?.branch?.id || undefined },
      });
      const root = res?.data?.data?.data ?? res?.data?.data ?? [];

      setIssues(Array.isArray(root) ? root : root?.data ?? []);
    } catch {
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [settings?.branch?.id]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const columns = useMemo(
    () => [
      { key: 'issue_no', header: 'Issue No' },
      { key: 'issue_date', header: 'Date' },
      {
        key: 'building_name',
        header: 'Building',
        render: (row: any) =>
          row.building_name || row.project_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'booking_no',
        header: 'Event',
        render: (row: any) =>
          row.booking_no ? (
            <span className="text-black dark:text-white">{row.booking_no}</span>
          ) : (
            <span className="text-gray-400">—</span>
          ),
      },
      {
        key: 'warehouse_name',
        header: 'Store',
        render: (row: any) => row.warehouse_name || <span className="text-gray-400">—</span>,
      },
      {
        key: 'item_count',
        header: 'Items',
        headerClass: 'text-center',
        cellClass: 'text-center',
      },
      {
        key: 'total_qty',
        header: 'Total qty',
        headerClass: 'text-right',
        cellClass: 'text-right tabular-nums',
        render: (row: any) => Number(row.total_qty ?? 0),
      },
      {
        key: 'vr_no',
        header: 'Voucher',
        render: (row: any) => row.vr_no || <span className="text-gray-400">—</span>,
      },
    ],
    [],
  );

  return (
    <div>
      <HelmetTitle title="Amenity Issue" />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl rounded border border-stroke bg-gray-50 p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
          Soap, towels, tissue and kitchen material going out of the store to a building — and,
          where it is for one, to an event. Each one saves an <strong>ordinary material issue</strong>:
          same voucher, same stock movement, same reports as the Material Issue screen.
        </p>

        <div className="flex gap-2">
          <ButtonLoading
            onClick={loadList}
            label="Refresh"
            icon={<FiRefreshCcw size={16} />}
          />
          <ButtonLoading
            onClick={() => navigate(routes.hotel_amenity_issue_new)}
            label="Issue"
            variant="primary"
            icon={<FiPlus size={16} />}
          />
        </div>
      </div>

      <div className="relative">
        {loading ? <Loader /> : null}
        <Table
          columns={columns}
          data={issues}
          noDataMessage="No issues from this property yet. Press Issue to make one."
        />
      </div>
    </div>
  );
};

export default AmenityIssue;
