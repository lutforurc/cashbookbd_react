import React, { useEffect, useState } from "react";
import ApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from "react-redux";
import { getBranchChart, getHeadOfficePaymentChart } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import Loader from "../../../common/Loader";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";

// Define types for the response data
interface ChartData {
  labels: string[];
  series: { name: string; data: number[] }[];
}

const HeadOfficePaymentChart: React.FC = () => {
  const charts = useSelector((state) => state.charts);
  const dispatch = useDispatch();
  const [colorMode, setColorMode] = useLocalStorage('color-theme', 'light');
  const [titleColor, setTitleColor] = useState(colorMode === 'dark' ? '#fff' : '#666666');
  
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    series: [{ name: "Debit", data: [] }],
  });

  useEffect(() => {
      dispatch(getHeadOfficePaymentChart());
  }, [dispatch]);
  
  useEffect(() => {
    if (charts?.headOfficePayment?.data?.data) {
      setChartData({
        labels: charts.headOfficePayment.data.data.labels || [],
        series: charts.headOfficePayment.data.data.series || [{ name: "Debit", data: [] }],
      });
    }
  }, [charts?.headOfficePayment?.data?.data]);


  const isDark = colorMode === 'dark';
  const axisColor = isDark ? '#94a3b8' : '#94a3b8';

  const options: any = {
    chart: {
      type: 'line',
      height: 360,
      fontFamily: 'inherit',
      zoom: { enabled: false },
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 700 },
    },

    dataLabels: { enabled: false },

    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontWeight: 600,
      offsetY: 4,
      markers: { width: 9, height: 9, radius: 12 },
      labels: { colors: isDark ? '#e2e8f0' : '#475569' },
      itemMargin: { horizontal: 8, vertical: 3 },
    },

    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },

    colors: [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
    ],

    grid: {
      borderColor: isDark ? '#334155' : '#eef2f7',
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
      title: {
        text: 'Payment',
        style: { color: axisColor, fontSize: '12px', fontWeight: 600 },
      },
      labels: {
        formatter: (value: number) => thousandSeparator(value),
        style: { colors: axisColor, fontSize: '12px' },
      },
    },

    title: {
      text: 'Payment from Head Office to Branch',
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
            const color = w.globals.colors?.[i] || '#64748b';
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
          min-width: 210px;
          font-size: 12px;
          overflow: hidden;
          border-radius: 6px;
          background: #ffffff;
          color: #1e293b;
          border: 1px solid #e2e8f0;
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
        }
        .cx-tip-title {
          padding: 6px 10px;
          font-weight: 600;
          background: #f1f5f9;
          border-bottom: 1px solid #e2e8f0;
        }
        .cx-tip-body { padding: 6px 10px; }
        .cx-tip-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
        .cx-tip-dot { width: 10px; height: 10px; border-radius: 9999px; flex: 0 0 auto; }
        .cx-tip-name { flex: 1; white-space: nowrap; font-weight: 400; }
        .cx-tip-val { font-weight: 400; }
        .dark .cx-tip { background: #1e293b; color: #e2e8f0; border-color: #334155; }
        .dark .cx-tip-title { background: #0f172a; border-color: #334155; }
      `}</style>
      {chartData.series.length > 0 ? (
        <ApexChart
          options={options}
          series={chartData.series}
          type="line"
          height={360}
        />
      ) : (
        ''
        // <Loader />
      )}
    </div>
  );
};

export default HeadOfficePaymentChart;