import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getHeadOfficeReceivedChart } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import Loader from "../../../common/Loader";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";

interface ChartData {
  labels: string[];
  series: { name: string; data: number[] }[];
}

interface HeadOfficeReceivedChartProps {
  month: string | number;
  branch: string | number;
}

const HeadOfficeReceivedChart: React.FC<HeadOfficeReceivedChartProps> = ({ month, branch }) => {
  const charts = useSelector((state) => state.charts);
  const dispatch = useDispatch();
  const [colorMode] = useLocalStorage("color-theme", "light");
  const [titleColor] = useState(colorMode === "dark" ? "#fff" : "#666666");

  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    series: [{ name: "Credit", data: [] }],
  });

  useEffect(() => {
    const params = { month, branch };
    dispatch(getHeadOfficeReceivedChart(params)); // Dispatch with params
  }, [dispatch, month, branch]);

  useEffect(() => {
    if (charts?.headOfficeReceived?.data?.data) {
      setChartData({
        labels: charts.headOfficeReceived.data.data.labels || [],
        series: charts.headOfficeReceived.data.data.series || [{ name: "Credit", data: [] }],
      });
    }
  }, [charts?.headOfficeReceived?.data?.data]);

  const options = {
    chart: {
      type: "area",
      height: 250,
      toolbar: { show: false },
    },
    labels: {
      style: { fontSize: "12px" },
      formatter: (defaultValue: number): string => (defaultValue / 1000).toString(),
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { curve: "smooth", show: true, width: 3 },
    colors: ["#2E93fA", "#66DA26", "#546E7A", "#E91E63", "#FF9800", "#DC9899", "#A6D21E"],
    xaxis: { categories: chartData.labels },
    title: { text: "Received from Branch and Head Office", align: "center", style: { color: titleColor } },
    tooltip: {
      enabled: true,
      theme: "dark",
      style: { fontSize: "12px" },
      y: {
        formatter: (value: number): string => `${thousandSeparator(value, 0)}`,
      },
    },
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

export default HeadOfficeReceivedChart;
