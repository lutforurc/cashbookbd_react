import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";
import { chartMonth } from "../../utils/utils-functions/formatDate";
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
  const { 'chart-2': purchaseColor, 'chart-1': salesColor } =
    useThemeTokens(['chart-2', 'chart-1']);

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
  const theme = getApexTheme(mode);

  // Each section spreads its counterpart from the theme rather than standing in
  // for it, so the shared type sizes and colours survive the addition of a
  // formatter or a title. Writing them bare took the theme's own styling out
  // with them and left Apex's defaults.
  const options = {
    ...theme,

    colors: [purchaseColor, salesColor],

    tooltip: {
      ...theme.tooltip,
      // Read off the raw categories by index rather than trusting whatever the
      // axis formatter has already done to the value Apex hands over.
      x: {
        formatter: (value: string, opts?: any) =>
          chartMonth(chartData.labels[opts?.dataPointIndex] ?? value),
      },
      y: { formatter: (v: number) => thousandSeparator(v) },
    },

    // The categories stay the API's own "2026-04" keys -- the two series are
    // lined up by them -- and only what is shown is spelled out.
    xaxis: {
      ...theme.xaxis,
      categories: chartData.labels,
      labels: {
        ...theme.xaxis.labels,
        // Short form on the axis: twelve "September 2025"s would not fit.
        formatter: (value: string) => chartMonth(value, true),
      },
    },

    yaxis: {
      ...theme.yaxis,
      title: {
        ...theme.yaxis.title,
        text: 'Purchase & Sales',
      },
      labels: {
        ...theme.yaxis.labels,
        formatter: function (value: number) {
          return thousandSeparator(value);
        }
      }
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
