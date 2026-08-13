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
  const { 'chart-2': purchaseColor } = useThemeTokens(['chart-2']);

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

  const theme = getApexTheme(mode);

  // Every section spreads its counterpart from the theme, so the shared type
  // sizes and colours survive -- see the note on the Purchase & Sales chart.
  const options = {
    ...theme, // include theme colors, grid, labels
    colors: [purchaseColor], // purchase line
    tooltip: {
      ...theme.tooltip,
      y: { formatter: (v) => thousandSeparator(v) },
    },
    xaxis: {
      ...theme.xaxis,
      categories: chartData.labels,
    },
    yaxis: {
      ...theme.yaxis,
      title: {
        ...theme.yaxis.title,
        text: 'Purchase',
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
    <ChartCard title="Daily Purchase (Last 1 Month)">
      <ApexChart options={options} series={chartData.series} type="area" height={260} />
    </ChartCard>
  );
};

export default DailyPurchaseChart;
