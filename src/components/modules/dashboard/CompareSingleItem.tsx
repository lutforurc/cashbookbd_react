import React, { useEffect, useState } from 'react';
import ApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from 'react-redux';
import { getCompare } from './chartSlice';
import useLocalStorage from '../../../hooks/useLocalStorage';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';

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
  const titleColor = colorMode === 'dark' ? '#fff' : '#666666';

  const [chartData, setChartData] = useState({
    labels: [],
    series: [],
  });

  /* ===============================
   âœ… Dynamic API Call (SAFE)
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
   âœ… Chart Data Mapping (SAFE)
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
   âœ… Chart Options
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
      min: 0, // à¦¨à¦¿à¦šà§‡à¦° à¦¸à¦°à§à¦¬à¦¨à¦¿à¦®à§à¦¨ à¦­à§à¦¯à¦¾à¦²à§
      max: maxValue, // à¦‰à¦ªà¦°à§‡à¦° à¦¸à¦°à§à¦¬à§‹à¦šà§à¦š à¦­à§à¦¯à¦¾à¦²à§ âœ… (à¦†à¦ªà¦¨à¦¾à¦° à¦¡à¦¾à¦Ÿà¦¾ à¦…à¦¨à§à¦¯à¦¾à§Ÿà§€ à¦¸à§‡à¦Ÿ à¦•à¦°à¦¬à§‡à¦¨)
      tickAmount: 10, // âœ… à¦®à§‹à¦Ÿ 5à¦Ÿà¦¾ à¦¸à§à¦Ÿà§‡à¦ª à¦¹à¦¬à§‡ (gap control)

      labels: {
        // formatter: (value) => thousandSeparator(value),
        formatter: (value) => {
          const rounded = Math.round(value / 100) * 100; // âœ… 495 â†’ 500
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
          return `${label} â†’ ${thousandSeparator(value)}`;
        },
      },
    },

    colors: ['#008FFB', '#FF4560'],
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
