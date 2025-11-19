import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import useLocalStorage from "../../../hooks/useLocalStorage";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";
import { chartDate } from "../../utils/utils-functions/formatDate";

const DailySalesChart = () => {
  const dispatch = useDispatch();
  const { purchaseSales, loading } = useSelector((state) => state.charts);
  const [mode] = useLocalStorage("color-theme", "light");

  const [chartData, setChartData] = useState({
    labels: [],
    series: [{ name: "Sales", data: [] }],
  });

//   useEffect(() => {
//     dispatch(getMonthlyPurchaseSales());
//   }, []);

  useEffect(() => {
    if (purchaseSales?.data?.data) {
      const sales = purchaseSales.data.data.sales1M;
      setChartData({
        // labels: Object.keys(sales),
        labels: Object.keys(sales).map(date => chartDate(date)),
        series: [{ name: "Sales", data: Object.values(sales).map(Number) }],
      });
    }
  }, [purchaseSales]);

  const options = {
    ...getApexTheme(mode),
    colors: ["#6c5ce7"],
    title: {
    //   text: "Daily Sales (Last 1 Month)",
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
    <ChartCard title="Daily Sales (Last 1 Month)">
      <ApexChart options={options} series={chartData.series} type="area" height={260} />
    </ChartCard>
  );
};

export default DailySalesChart;
