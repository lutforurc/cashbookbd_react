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


  const options = {
    chart: {
      type: "area",
      height: 350,
      zoom: {
        enabled: false
      },
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
    colors: ['#2E93fA', '#66DA26', '#546E7A', '#E91E63', '#FF9800', '#DC9899', '#A6D21E'],
    xaxis: { categories: chartData.labels },
    yaxis: {
    title: {
        text: 'Payment'
      },
      labels: {
        formatter: function (value:number) {
          return thousandSeparator(value, 0);
        }
      }
    },
    title: { text: "Payment from Head Office to Branch", align: "center", style: { color: titleColor } },
    tooltip: {
      enabled: true, theme: "dark", style: { fontSize: "12px" },
      y: {
        formatter: (value: number): string => {
          return `${ thousandSeparator (value,0)}`;
        }
      }
    }
  };
  return (
    <div>
      {chartData.series.length > 0 ? (
        <ApexChart options={options} series={chartData.series} type="line" height={350} />
      ) : (
        ''
        // <Loader />
      )}
    </div>
  );
};

export default HeadOfficePaymentChart;