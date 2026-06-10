import React, { useEffect, useState } from "react";
import ApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from "react-redux";
import { getBranchChart } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import Loader from "../../../common/Loader";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import { userCurrentBranch } from "../branch/branchSlice";

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
  const [titleColor, setTitleColor] = useState(colorMode === 'dark' ? '#fff' : '#666666');
  
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
  const axisColor = isDark ? '#94a3b8' : '#94a3b8';

  const options: any = {
    chart: {
      type: 'area',
      height: 300,
      fontFamily: 'inherit',
      foreColor: axisColor,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, easing: 'easeinout', speed: 700 },
    },

    colors: ['#10b981', '#3b82f6'],

    dataLabels: { enabled: false },

    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '13px',
      fontWeight: 600,
      offsetY: 4,
      markers: { width: 10, height: 10, radius: 12 },
      labels: { colors: isDark ? '#e2e8f0' : '#475569' },
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
      theme: isDark ? 'dark' : 'light',
      style: { fontSize: '12px' },
      y: { formatter: (value: number) => `${thousandSeparator(value)}` },
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