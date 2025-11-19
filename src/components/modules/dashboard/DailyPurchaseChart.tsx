import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import useLocalStorage from "../../../hooks/useLocalStorage";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";
import { chartDate, formatDate } from "../../utils/utils-functions/formatDate";

const DailyPurchaseChart = () => {
  const dispatch = useDispatch();
  const { purchaseSales, loading } = useSelector((state) => state.charts);
  const [mode] = useLocalStorage("color-theme", "light");

  const [chartData, setChartData] = useState({
    labels: [],
    series: [{ name: "Purchase", data: [] }],
  });

  // useEffect(() => {
  //   dispatch(getMonthlyPurchaseSales());
  // }, []);

  useEffect(() => {
    if (purchaseSales?.data?.data) {
      const purchase = purchaseSales.data.data.purchase1M;

      setChartData({
        // labels: formatDate(Object.keys(purchase)),
        labels: Object.keys(purchase).map(date => chartDate(date)),
        series: [{ name: "Purchase", data: Object.values(purchase).map(Number) }],
      });
    }
  }, [purchaseSales]);

  const options = {
    ...getApexTheme(mode), // include theme colors, grid, labels
    colors: ["#00b894"], // purchase line color
    title: {
      // text: "Daily Purchase (Last 1 Month)",
      align: "center",
      style: { color: mode === "dark" ? "#fff" : "#333" },
    },
    tooltip: {
      y: { formatter: (v) => thousandSeparator(v, 0) },
    },
    xaxis: {
      ...getApexTheme(mode).xaxis,
      categories: chartData.labels,
    },
  };

  return (
    <ChartCard title="Daily Purchase (Last 1 Month)">
      <ApexChart options={options} series={chartData.series} type="area" height={260} />
    </ChartCard>
  );
};

export default DailyPurchaseChart;
