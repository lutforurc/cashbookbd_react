import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getMonthlyPurchaseSales } from "./chartSlice";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import ChartCard from "./ChartCard";
import { getApexTheme } from "./chartTheme";
import { chartDate } from "../../utils/utils-functions/formatDate";
import { useIsDark, useThemeTokens } from '../../../theme/themeColors';

const DailySalesChart = () => {
  const dispatch = useDispatch();
  const { purchaseSales, loading } = useSelector((state) => state.charts);

  // Taken from the document, so switching the theme redraws the chart.
  const isDark = useIsDark();
  const mode = isDark ? "dark" : "light";
  const { 'chart-5': salesColor, 'chart-text': axisColor } =
    useThemeTokens(['chart-5', 'chart-text']);

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
    colors: [salesColor],
    title: {
    //   text: "Daily Sales (Last 1 Month)",
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
    // Spread, so the theme's label colour is not lost with it. The title also
    // read "Purchase" on the sales chart, carried over from the chart this one
    // was copied from.
    yaxis: {
      ...getApexTheme(mode).yaxis,
      title: {
        text: 'Sales',
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
    <ChartCard title="Daily Sales (Last 1 Month)">
      <ApexChart options={options} series={chartData.series} type="area" height={260} />
    </ChartCard>
  );
};

export default DailySalesChart;
