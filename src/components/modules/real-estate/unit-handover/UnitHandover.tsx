import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiHome, FiKey } from 'react-icons/fi';
import { FIELD_SELECT, FIELD_SIZE } from '../../../../theme/fieldStyles';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputDatePicker from '../../../utils/fields/DatePicker';
import { Select } from '../../../utils/fields/FormControls';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import httpService from '../../../services/httpService';
import {
  API_UNIT_HANDOVER_BUILDINGS_URL,
  API_UNIT_HANDOVER_COMPLETE_URL,
  API_UNIT_HANDOVER_LANDOWNER_URL,
  API_UNIT_HANDOVER_STORE_URL,
  API_UNIT_HANDOVER_UNITS_URL,
} from '../../../services/apiRoutes';

/**
 * Unit Handover (real estate step 4). The building is marked complete first;
 * then each sold flat is handed over -- one journal recognises its price as
 * income and moves its share of the building's actual cost out of WIP. A
 * landowner's flat is handed over with no voucher. A buyer still owing is
 * warned, never stopped.
 */

const payloadOf = (response: any) => response?.data?.data?.data;
const refusedWith = (response: any) =>
  response?.data?.success ? null : response?.data?.message || 'The server refused that.';

const iso = (date: Date | null) =>
  date && !Number.isNaN(date.getTime())
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';

const money = (value: any) => (value === null || value === undefined ? '-' : thousandSeparator(Number(value), 2));

const UnitHandover = () => {
  const { t } = useTranslation('common');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [buildingId, setBuildingId] = useState<string>('');
  const [data, setData] = useState<any>(null);
  const [date, setDate] = useState<Date | null>(new Date());
  const [busy, setBusy] = useState<string>('');

  useEffect(() => {
    httpService
      .get(API_UNIT_HANDOVER_BUILDINGS_URL)
      .then((response) => setBuildings(payloadOf(response) || []))
      .catch(() => setBuildings([]));
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setData(null);
      return;
    }
    const response = await httpService.get(API_UNIT_HANDOVER_UNITS_URL, { params: { building_id: id } });
    const refused = refusedWith(response);
    if (refused) {
      toast.error(refused);
      setData(null);
      return;
    }
    setData(payloadOf(response));
  }, []);

  useEffect(() => {
    load(buildingId);
  }, [buildingId, load]);

  const post = async (key: string, url: string, body: any) => {
    setBusy(key);
    try {
      const response = await httpService.post(url, body);
      const refused = refusedWith(response);
      if (refused) {
        toast.error(refused);
        return;
      }
      toast.success(response?.data?.message || t('handover.saved'));
      await load(buildingId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('handover.failed'));
    } finally {
      setBusy('');
    }
  };

  const completedOn = data?.building?.completed_on;

  const handOver = (row: any) => {
    if (!iso(date)) {
      toast.error(t('handover.pickDate'));
      return;
    }
    if (row.due > 0 && !window.confirm(t('handover.dueWarning', { due: money(row.due) }))) {
      return;
    }
    post(`h${row.unit_id}`, API_UNIT_HANDOVER_STORE_URL, { unit_id: row.unit_id, handover_date: iso(date) });
  };

  return (
    <>
      <HelmetTitle title={t('handover.title')} />

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div>
          <label htmlFor="building_id">{t('handover.building')}</label>
          <Select
            id="building_id"
            name="building_id"
            className={`${FIELD_SELECT} ${FIELD_SIZE.md} w-full`}
            value={buildingId}
            onChange={(e) => setBuildingId(e.target.value)}
          >
            <option value="">{t('handover.selectBuilding')}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.project_name} — {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="handover_date">{t('handover.date')}</label>
          <InputDatePicker
            id="handover_date"
            name="handover_date"
            className="w-full px-3 py-1"
            selectedDate={date}
            setSelectedDate={setDate}
            setCurrentDate={setDate}
          />
        </div>
      </div>

      {data && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-4">
            <div className="rounded border border-[rgb(var(--c-border))] p-3">
              <div className="text-xs text-gray-500">{t('handover.buildingCost')}</div>
              <div className="text-lg font-semibold">{money(data.cost?.total)}</div>
              <div className="text-xs text-gray-500">
                {t('handover.costSplit', { direct: money(data.cost?.direct), common: money(data.cost?.common_share) })}
              </div>
            </div>
            <div className="rounded border border-[rgb(var(--c-border))] p-3 md:col-span-3">
              <div className="text-xs text-gray-500">{t('handover.construction')}</div>
              {completedOn ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    {t('handover.completedOn', { date: completedOn })}
                  </span>
                  <ButtonLoading
                    onClick={() => post('c', API_UNIT_HANDOVER_COMPLETE_URL, { building_id: buildingId, completed_on: null })}
                    buttonLoading={busy === 'c'}
                    label={t('handover.undoComplete')}
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span>{t('handover.notComplete')}</span>
                  <ButtonLoading
                    onClick={() => {
                      if (!iso(date)) {
                        toast.error(t('handover.pickDate'));
                        return;
                      }
                      post('c', API_UNIT_HANDOVER_COMPLETE_URL, { building_id: buildingId, completed_on: iso(date) });
                    }}
                    buttonLoading={busy === 'c'}
                    label={t('handover.markComplete')}
                    icon={<FiCheckCircle />}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[rgb(var(--c-border))] text-left">
                  <th className="p-2">{t('handover.unit')}</th>
                  <th className="p-2">{t('handover.customer')}</th>
                  <th className="p-2 text-right">{t('handover.salePrice')}</th>
                  <th className="p-2 text-right">{t('handover.due')}</th>
                  <th className="p-2 text-right">{t('handover.share')}</th>
                  <th className="p-2 text-right">{t('handover.cost')}</th>
                  <th className="p-2">{t('handover.state')}</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).map((row: any) => (
                  <tr key={row.unit_id} className="border-b border-[rgb(var(--c-border))]">
                    <td className="p-2">
                      {row.unit_no}
                      {row.parking_no ? ` + ${row.parking_no}` : ''}
                    </td>
                    <td className="p-2">{row.is_landowner_share ? t('handover.landowner') : row.customer || '-'}</td>
                    <td className="p-2 text-right">{money(row.sale_total)}</td>
                    <td className={`p-2 text-right ${row.due > 0 ? 'text-red-600' : ''}`}>{money(row.due)}</td>
                    <td className="p-2 text-right">{(Number(row.share) * 100).toFixed(2)}%</td>
                    <td className="p-2 text-right">{money(row.handover ? row.handover.cost : row.cost)}</td>
                    <td className="p-2">
                      {row.handover
                        ? `${t('handover.handedOver')} ${row.handover.date}${row.handover.vr_no ? ` · ${row.handover.vr_no}` : ''}`
                        : row.sale_id
                          ? t('handover.sold')
                          : row.is_landowner_share
                            ? t('handover.landownerShare')
                            : t('handover.unsold')}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        {!row.handover && (row.sale_id || row.is_landowner_share) && completedOn && (
                          <ButtonLoading
                            onClick={() => handOver(row)}
                            buttonLoading={busy === `h${row.unit_id}`}
                            label={t('handover.handOver')}
                            icon={<FiKey />}
                          />
                        )}
                        {!row.handover && !row.sale_id && (
                          <ButtonLoading
                            onClick={() =>
                              post(`l${row.unit_id}`, API_UNIT_HANDOVER_LANDOWNER_URL, {
                                unit_id: row.unit_id,
                                on: !row.is_landowner_share,
                              })
                            }
                            buttonLoading={busy === `l${row.unit_id}`}
                            label={row.is_landowner_share ? t('handover.unmarkLandowner') : t('handover.markLandowner')}
                            icon={<FiHome />}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
};

export default UnitHandover;
