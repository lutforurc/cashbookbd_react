import React, { useEffect, useState } from "react";
import ApexChart from '../../utils/interop/ApexChart';
import { useDispatch, useSelector } from "react-redux";
import { getBranchChart } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import Loader from "../../../common/Loader";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import { userCurrentBranch } from "../branch/branchSlice";
import { readToken } from '../../../theme/themeColors';

// Define types for the response data
interface ChartData {
  labels: string[];
  series: { name: string; data: number[] }[];
}

const TransactionChart: React.FC = () => {
  const charts = useSelector((state) => state.charts);
  const currentBranch = useSelector((state) => state.branchList);
  const dispatch = useDispatch();
  const [colorMode, setColorMode] = useLocalStorage('color-theme', 'light');
  const [titleColor, setTitleColor] = useState(readToken('chart-text'));
  
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    series: [{ name: "Debit", data: [] }],
  });

  useEffect(() => {
    dispatch(getBranchChart());
    dispatch(userCurrentBranch());
  }, [dispatch]);
  
  useEffect(() => {
    if (charts?.transactionChart?.data?.data) {
      setChartData({
        labels: charts.transactionChart.data.data.labels || [],
        series: charts.transactionChart.data.data.series || [{ name: "Debit", data: [] }],
      });
    }
  }, [charts?.transactionChart?.data?.data]);


  const isDark = colorMode === 'dark';
  const axisColor = readToken('chart-text');

  const options: any = {
    chart: {
      type: 'area',
      height: 300,
      fontFamily: 'inherit',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 700 },
    },

    colors: [readToken('chart-2'), readToken('chart-1')],

    dataLabels: { enabled: false },

    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px',
      fontWeight: 600,
      offsetY: 4,
      markers: { width: 10, height: 10, radius: 12 },
      labels: { colors: readToken('chart-text') },
      itemMargin: { horizontal: 10 },
    },

    stroke: { curve: 'smooth', width: 3, lineCap: 'round' },

    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.03,
        stops: [0, 90, 100],
      },
    },

    grid: {
      borderColor: readToken('chart-grid'),
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 12, right: 12 },
    },

    markers: { size: 0, hover: { size: 5 }, strokeWidth: 2 },

    xaxis: {
      categories: chartData.labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
      labels: { style: { colors: axisColor, fontSize: '12px' } },
    },

    yaxis: {
      labels: {
        formatter: (value: number) => thousandSeparator(value),
        style: { colors: axisColor, fontSize: '12px' },
      },
    },

    title: {
      text: `Received and Payment by ${currentBranch?.currentBranch?.name}`,
      align: 'center',
      style: { color: titleColor, fontSize: '15px', fontWeight: 700 },
    },

    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      custom: ({ series, dataPointIndex, w }: any) => {
        const title = chartData.labels?.[dataPointIndex] ?? w.globals.labels?.[dataPointIndex] ?? '';
        const body = (w.globals.seriesNames || [])
          .map((name: string, i: number) => {
            const value = series[i]?.[dataPointIndex];
            if (value === null || value === undefined) return '';
            const color = w.globals.colors?.[i] || readToken('chart-8');
            return (
              '<div class="cx-tip-row" style="color:' + color + '">' +
              '<span class="cx-tip-dot" style="background:' + color + '"></span>' +
              '<span class="cx-tip-name">' + name + '</span>' +
              '<span class="cx-tip-val">' + thousandSeparator(Number(value)) + '</span>' +
              '</div>'
            );
          })
          .join('');
        return '<div class="cx-tip"><div class="cx-tip-title">' + title + '</div><div class="cx-tip-body">' + body + '</div></div>';
      },
    },
  };

  // Friendlier legend/tooltip labels than the raw Debit/Credit series names.
  const displaySeries = chartData.series.map((s) => ({
    ...s,
    name:
      s.name === 'Debit'
        ? 'Received'
        : s.name === 'Credit'
          ? 'Payment'
          : s.name,
  }));

  return (
    <div className="bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-gray-800 dark:ring-gray-700">
      <style>{`
        .apexcharts-tooltip.apexcharts-theme-light,
        .apexcharts-tooltip.apexcharts-theme-dark,
        .apexcharts-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          overflow: visible !important;
        }
        .cx-tip {
          min-width: 200px;
          font-size: 12px;
          overflow: hidden;
          border-radius: 6px;
          background: rgb(var(--c-white));
          color: rgb(var(--c-slate-800));
          border: 1px solid rgb(var(--c-stroke));
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
        }
        .cx-tip-title {
          padding: 6px 10px;
          font-weight: 600;
          background: rgb(var(--c-whiten));
          border-bottom: 1px solid rgb(var(--c-stroke));
        }
        .cx-tip-body { padding: 6px 10px; }
        .cx-tip-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
        .cx-tip-dot { width: 10px; height: 10px; border-radius: 9999px; flex: 0 0 auto; }
        .cx-tip-name { flex: 1; white-space: nowrap; font-weight: 400; }
        .cx-tip-val { font-weight: 400; }
        .dark .cx-tip { background: rgb(var(--c-slate-800)); color: rgb(var(--c-stroke)); border-color: rgb(var(--c-slate-700)); }
        .dark .cx-tip-title { background: rgb(var(--c-slate-900)); border-color: rgb(var(--c-slate-700)); }
      `}</style>
      {chartData.series.length > 0 ? (
        <ApexChart
          options={options}
          series={displaySeries}
          type="area"
          height={300}
        />
      ) : (
        ''
        // <Loader />
      )}
    </div>
  );
};

export default TransactionChart;