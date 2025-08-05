import React, { useEffect, useState } from "react";
import ApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from "react-redux";
import { getBranchChart } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import Loader from "../../../common/Loader";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";

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
  }, [dispatch]);
  
  useEffect(() => {
    if (charts?.transactionChart?.data?.data) {
      setChartData({
        labels: charts.transactionChart.data.data.labels || [],
        series: charts.transactionChart.data.data.series || [{ name: "Debit", data: [] }],
      });
    }
  }, [charts?.transactionChart?.data?.data]);


  const options = {
    chart: {
      type: "area",
      height: 250,
      toolbar: { show: false }
    },
    
    labels: {
      style: {
        fontSize: '12px'
      },
      formatter: (defaultValue: number): string => {
        return (defaultValue / 1000).toString();
      }
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { curve: 'smooth', show: true, width: 3 },
    xaxis: { categories: chartData.labels },
    title: { text: `Received and Payment by ${currentBranch?.currentBranch?.name}`, align: "center", style: { color: titleColor } },
    // tooltip: {
    //   custom: function({ series, seriesIndex, dataPointIndex, w }) {
    //     let monthName = charts.transactionChart.data.data.labels[dataPointIndex];
    //     return `<div class="custom-tooltip">${monthName}: ${ thousandSeparator (series[seriesIndex][dataPointIndex], 0)}</div>`;
    //   }
    // }

    tooltip: {
      enabled: true, theme: "dark", style: { fontSize: "12px" },
      y: {
        formatter: (value: number): string => {
          return `${ thousandSeparator (value,0)}`;
        }
      }
    }
    
    // tooltip: {
    //   enabled: true, theme: "dark", style: { fontSize: "12px" },
    //   y: {
    //     formatter: (value: number): string => {
    //       return `${ thousandSeparator (value,0)}`;
    //     }
    //   }
    // }
  };
  return (
    <div>
      {chartData.series.length > 0 ? (
        <ApexChart options={options} series={chartData.series} type="line" height={250} />
      ) : (
        ''
        // <Loader />
      )}
    </div>
  );
};

export default TransactionChart;