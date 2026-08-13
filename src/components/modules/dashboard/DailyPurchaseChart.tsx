import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";
import { chartDate, formatDate } from "../../utils/utils-functions/formatDate";
import { useIsDark, useThemeTokens } from '../../../theme/themeColors';

const DailyPurchaseChart = () => {
  const dispatch = useDispatch();
  const { purchaseSales, loading } = useSelector((state) => state.charts);

  // Taken from the document, so switching the theme redraws the chart.
  const isDark = useIsDark();
  const mode = isDark ? "dark" : "light";
  const { 'chart-2': purchaseColor, 'chart-text': axisColor } =
    useThemeTokens(['chart-2', 'chart-text']);

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
    colors: [purchaseColor], // purchase line
    title: {
      // text: "Daily Purchase (Last 1 Month)",
      align: "center",
      style: { color: mode === "dark" ? "rgb(var(--c-white))" : "rgb(var(--c-gray-800))" },
    },
    tooltip: {
      y: { formatter: (v) => thousandSeparator(v) },
    },
    xaxis: {
      ...getApexTheme(mode).xaxis,
      categories: chartData.labels,
    },
    // Spread, so the theme's label colour is not lost with it -- see the same
    // note on the Purchase & Sales chart.
    yaxis: {
      ...getApexTheme(mode).yaxis,
      title: {
        text: 'Purchase',
        style: { color: axisColor },
      },
      labels: {
        style: { colors: axisColor },
        formatter: function (value: number) {
          return thousandSeparator(value);
        }
      }
    },
  };

  return (
    <ChartCard title="Daily Purchase (Last 1 Month)">
      <ApexChart options={options} series={chartData.series} type="area" height={260} />
    </ChartCard>
  );
};

export default DailyPurchaseChart;
