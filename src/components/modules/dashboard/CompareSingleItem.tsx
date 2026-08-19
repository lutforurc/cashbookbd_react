import React, { useEffect, useState } from 'react';
import ApexChart from '../../utils/interop/ApexChart';
import { useDispatch, useSelector } from 'react-redux';
import { getCompare } from './chartSlice';
import useLocalStorage from '../../../hooks/useLocalStorage';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { readToken, chartSeries } from '../../../theme/themeColors';

const CompareSingleItem = ({
  branchId,
  ledgerId,
  startDate1,
  endDate1,
  startDate2,
  endDate2,
  run,
}) => {
  const charts = useSelector((state) => state.charts);
  const dispatch = useDispatch();

  const [colorMode] = useLocalStorage('color-theme', 'light');
  const titleColor = readToken('chart-text');

  const [chartData, setChartData] = useState({
    labels: [],
    series: [],
  });

  /* ===============================
   Ã¢Å“â€¦ Dynamic API Call (SAFE)
  ================================= */
  useEffect(() => {
    if (!branchId || !startDate1 || !endDate1) return;

    dispatch(
      getCompare({
        branch_id: branchId,
        coal4_id: ledgerId,

        period1_start: startDate1
          ? startDate1.toISOString().split('T')[0]
          : null,

        period1_end: endDate1 ? endDate1.toISOString().split('T')[0] : null,

        period2_start: startDate2
          ? startDate2.toISOString().split('T')[0]
          : null,

        period2_end: endDate2 ? endDate2.toISOString().split('T')[0] : null,
      }),
    );
  }, [
    run,
    branchId,
    ledgerId,
    startDate1,
    endDate1,
    startDate2,
    endDate2,
    dispatch,
  ]);

  /* ===============================
   Ã¢Å“â€¦ Chart Data Mapping (SAFE)
  ================================= */
  useEffect(() => {
    const compare = charts?.compareData?.data?.period1;

    if (!compare || !compare.labels || !compare.series) return;

    setChartData({
      labels: compare.labels,
      series: compare.series,
    });
  }, [charts]);

  /* ===============================
   Ã¢Å“â€¦ Chart Options
  ================================= */

  const allValues = chartData.series.flatMap((s) => s.data);
  const maxValue = Math.max(...allValues, 0);

  const options = {
    chart: {
      type: 'line',
      height: 250,
      toolbar: { show: false },
      zoom: { enabled: false },
    },

    dataLabels: { enabled: false },

    stroke: { curve: 'smooth', width: 3 },

    xaxis: {
      categories: chartData.labels,
    },

    yaxis: {
      min: 0, // Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Å¡Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â¦Â¨Ã Â¦Â¿Ã Â¦Â®Ã Â§ÂÃ Â¦Â¨ Ã Â¦Â­Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â²Ã Â§Â
      max: maxValue, // Ã Â¦â€°Ã Â¦ÂªÃ Â¦Â°Ã Â§â€¡Ã Â¦Â° Ã Â¦Â¸Ã Â¦Â°Ã Â§ÂÃ Â¦Â¬Ã Â§â€¹Ã Â¦Å¡Ã Â§ÂÃ Â¦Å¡ Ã Â¦Â­Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â¦Â²Ã Â§Â Ã¢Å“â€¦ (Ã Â¦â€ Ã Â¦ÂªÃ Â¦Â¨Ã Â¦Â¾Ã Â¦Â° Ã Â¦Â¡Ã Â¦Â¾Ã Â¦Å¸Ã Â¦Â¾ Ã Â¦â€¦Ã Â¦Â¨Ã Â§ÂÃ Â¦Â¯Ã Â¦Â¾Ã Â§Å¸Ã Â§â‚¬ Ã Â¦Â¸Ã Â§â€¡Ã Â¦Å¸ Ã Â¦â€¢Ã Â¦Â°Ã Â¦Â¬Ã Â§â€¡Ã Â¦Â¨)
      tickAmount: 10, // Ã¢Å“â€¦ Ã Â¦Â®Ã Â§â€¹Ã Â¦Å¸ 5Ã Â¦Å¸Ã Â¦Â¾ Ã Â¦Â¸Ã Â§ÂÃ Â¦Å¸Ã Â§â€¡Ã Â¦Âª Ã Â¦Â¹Ã Â¦Â¬Ã Â§â€¡ (gap control)

      labels: {
        // formatter: (value) => thousandSeparator(value),
        formatter: (value) => {
          const rounded = Math.round(value / 100) * 100; // Ã¢Å“â€¦ 495 Ã¢â€ â€™ 500
          return thousandSeparator(rounded);
        },
      },
    },

    title: {
      text: `Item Comparison`,
      align: 'center',
      style: { color: titleColor },
    },

    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value, { dataPointIndex }) => {
          const label = chartData.labels[dataPointIndex] || '';
          return `${label} Ã¢â€ â€™ ${thousandSeparator(value)}`;
        },
      },
    },

    colors: chartSeries(2),
    legend: { show: true },
  };

  return chartData.series.length ? (
    <ApexChart
      options={options}
      series={chartData.series}
      type="line"
      height={500}
    />
  ) : null;
};

export default CompareSingleItem;
