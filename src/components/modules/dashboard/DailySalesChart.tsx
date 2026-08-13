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
  const { 'chart-5': salesColor } = useThemeTokens(['chart-5']);

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

  const theme = getApexTheme(mode);

  // Every section spreads its counterpart from the theme, so the shared type
  // sizes and colours survive. The y-axis title also read "Purchase" here,
  // carried over from the chart this one was copied from.
  const options = {
    ...theme,
    colors: [salesColor],
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
        text: 'Sales',
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
    <ChartCard title="Daily Sales (Last 1 Month)">
      <ApexChart options={options} series={chartData.series} type="area" height={260} />
    </ChartCard>
  );
};

export default DailySalesChart;
