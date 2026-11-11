import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FiPlus } from 'react-icons/fi';

import Table from '../../utils/others/Table';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

import httpService from '../../services/httpService';
import { API_ASSET_SETUP_URL } from '../../services/apiRoutes';

/**
 * The chart of accounts this module needs, in one list.
 *
 * ⚠️ WHY IT IS A TAB OF ITS OWN. A category can be saved with its rate and no
 * heads, and it simply cannot be depreciated afterwards — a fault nobody
 * discovers until the day the year is charged, and by then the answer ("go and
 * build four group heads under the right parents in the right order") is four
 * screens away. This screen names the requirement, says what is already there,
 * and makes only what is missing.
 *
 * ⚠️ IT NEVER OVERWRITES A CHOSEN HEAD. A category somebody has already pointed
 * at their own cost account keeps it; only empty columns are filled.
 *
 * The making is done by the server, in one transaction — see
 * AssetSetupController. Nothing here decides what a head should be.
 */

const ready = (row: any) => {
  if (row.status === 'ok') {
    return <span className="text-green-700 dark:text-green-400">Ready</span>;
  }

  if (row.status === 'missing') {
    return (
      <span className="text-amber-700 dark:text-amber-300" title={row.detail}>
        {row.detail || 'Will be created'}
      </span>
    );
  }

  return (
    <span className="text-red-700 dark:text-red-300">
      {row.detail || 'Cannot be created from here'}
    </span>
  );
};

const nameColumn = {
  key: 'name',
  header: 'What',
  render: (row: any) => (
    <div>
      <div className="text-black dark:text-white">{row.name}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">under {row.under}</div>
    </div>
  ),
};

const stateColumn = {
  key: 'status',
  header: 'State',
  render: ready,
};

const AssetChartSetupTab = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_ASSET_SETUP_URL);
      setData(res?.data?.data?.data ?? res?.data?.data ?? {});
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not read the setup');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setSaving(true);

    try {
      const res = await httpService.post(`${API_ASSET_SETUP_URL}/create`, {});
      // Shown for longer than the usual toast: the message names what was
      // actually made, which is the answer to "what did it just do to my chart".
      toast.success(res?.data?.message || 'Done', { autoClose: 7000 });
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Could not create them');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Loader />;

  const missing = Number(data?.missing ?? 0);

  return (
    <div>
      <p className="mb-3 rounded border border-stroke p-2.5 text-xs leading-snug text-gray-600 dark:border-strokedark dark:text-gray-300">
        Fixed assets need four group heads and two heads of their own. The two per-category ones
        — what a thing cost, and the depreciation written off it — are made for each category;
        the yearly charge and the gain or loss on a sale are one head for the whole company and
        are shared. Everything below is made here, under the right parent and on the right side
        of the accounts. A head somebody has already chosen is never replaced.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <ButtonLoading
          onClick={create}
          buttonLoading={saving}
          icon={<FiPlus size={16} />}
          label="Create what is missing"
          variant="primary"
        />

        <span className="text-sm text-gray-600 dark:text-gray-300">
          {data?.ready
            ? 'Everything is in place. Categories can be depreciated.'
            : `${missing} thing${missing === 1 ? '' : 's'} missing.`}
        </span>
      </div>

      <h3 className="mb-2 text-sm font-semibold text-black dark:text-white">
        Groups on the chart
      </h3>
      <Table columns={[nameColumn, stateColumn]} data={data?.groups ?? []} perPage={20} />

      <h3 className="mb-2 mt-4 text-sm font-semibold text-black dark:text-white">
        Heads the company shares
      </h3>
      <Table columns={[nameColumn, stateColumn]} data={data?.heads ?? []} perPage={20} />

      <h3 className="mb-2 mt-4 text-sm font-semibold text-black dark:text-white">Categories</h3>
      <Table
        columns={[
          {
            key: 'name',
            header: 'Category',
            render: (row: any) => <span className="text-black dark:text-white">{row.name}</span>,
          },
          {
            key: 'missing',
            header: 'Missing',
            render: (row: any) => (
              <span className="text-xs text-amber-700 dark:text-amber-300">
                {row.missing.join(', ')}
              </span>
            ),
          },
        ]}
        data={data?.categories ?? []}
        perPage={20}
        noDataMessage="Every category has its heads."
      />
    </div>
  );
};

export default AssetChartSetupTab;
