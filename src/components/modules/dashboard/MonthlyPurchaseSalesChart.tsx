import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";
import { useIsDark, useThemeTokens } from '../../../theme/themeColors';

const MonthlyPurchaseSalesChart: React.FC = () => {
  const dispatch = useDispatch();
  const { purchaseSales, loading } = useSelector((state: any) => state.charts);

  // 🌗 Theme Mode. Read from the document rather than localStorage, so the
  // chart is redrawn when the theme is switched instead of keeping the colours
  // it happened to mount with.
  const isDark = useIsDark();
  const mode = isDark ? "dark" : "light";

  // Line Colors
  const { 'chart-2': purchaseColor, 'chart-1': salesColor, 'chart-text': axisColor } =
    useThemeTokens(['chart-2', 'chart-1', 'chart-text']);

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
      style: { color: mode === "dark" ? "rgb(var(--c-white))" : "rgb(var(--c-gray-800))", fontSize: "16px" },
    },

    tooltip: {
      theme: mode === "dark" ? "dark" : "light",
      y: { formatter: (v: number) => thousandSeparator(v) },
    },

    xaxis: {
      ...getApexTheme(mode).xaxis,
      categories: chartData.labels,
    },
    // Spread, not replaced: writing a bare yaxis here dropped the theme's
    // label colour with it, and Apex's own default is a near-black that the
    // dark card swallowed -- the figures up the side were being drawn, in a
    // colour nobody could read.
    yaxis: {
      ...getApexTheme(mode).yaxis,
      title: {
        text: 'Purchase & Sales',
        style: { color: axisColor },
      },
      labels: {
        style: { colors: axisColor },
        formatter: function (value: number) {
          return thousandSeparator(value);
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
