import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import useLocalStorage from "../../../hooks/useLocalStorage";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";

const MonthlyPurchaseSalesChart: React.FC = () => {
  const dispatch = useDispatch();
  const { purchaseSales, loading } = useSelector((state: any) => state.charts);

  // 🌗 Theme Mode
  const [mode] = useLocalStorage("color-theme", "light");

  // Line Colors
  const purchaseColor = mode === "dark" ? "#55efc4" : "#00b894";
  const salesColor = mode === "dark" ? "#74b9ff" : "#0984e3";

  const [chartData, setChartData] = useState({
    labels: [],
    series: [
      { name: "Purchase", data: [] },
      { name: "Sales", data: [] },
    ],
  });
  // Build Chart Data
  useEffect(() => {
    if (purchaseSales?.data?.data) {
      const purchase = purchaseSales.data.data.purchase;
      const sales = purchaseSales.data.data.sales;

      setChartData({
        labels: Object.keys(purchase),
        series: [
          { name: "Purchase", data: Object.values(purchase).map(Number) },
          { name: "Sales", data: Object.values(sales).map(Number) },
        ],
      });
    }
  }, [purchaseSales]);

  // Chart Options with Full Theme
  const options = {
    ...getApexTheme(mode),

    colors: [purchaseColor, salesColor],

    title: {
    //   text: "",
      align: "center",
      style: { color: mode === "dark" ? "#fff" : "#333", fontSize: "16px" },
    },

    tooltip: {
      theme: mode === "dark" ? "dark" : "light",
      y: { formatter: (v: number) => thousandSeparator(v, 0) },
    },

    xaxis: {
      ...getApexTheme(mode).xaxis,
      categories: chartData.labels,
    },
    yaxis: {
    title: {
        text: 'Purchase & Sales'
      },
      labels: {
        formatter: function (value:number) {
          return thousandSeparator(value, 0);
        }
      }
    },

    legend: {
      labels: { colors: getApexTheme(mode).legend.labels.colors },
    },
  };

  return (
    <ChartCard title="Purchase & Sales (Last 12 Months)">
      {loading ? (
        "Loading..."
      ) : (
        <ApexChart
          options={options}
          
          series={chartData.series}
          type="area"
          height={260}
        />
      )}
    </ChartCard>
  );
};

export default MonthlyPurchaseSalesChart;
