import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getCompare } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import { userCurrentBranch } from "../branch/branchSlice";

const CompareSingleItem: React.FC = () => {
  const charts = useSelector((state) => state.charts);
  const currentBranch = useSelector((state) => state.branchList);
  const dispatch = useDispatch();

  const [colorMode] = useLocalStorage("color-theme", "light");
  const [titleColor] = useState(colorMode === "dark" ? "#fff" : "#666666");

  const [chartData, setChartData] = useState({
    labels: [],
    series: [],
  });

  useEffect(() => {
    dispatch(getCompare());
    dispatch(userCurrentBranch());
  }, []);

  /**  MAP COMPARE DATA TO CHART FORMAT **/
  useEffect(() => {
  const compare = charts?.compareData;

  if (compare?.period1?.labels && compare?.period1?.series) {
    
    // FORMAT YYYY-MM-DD → MM-DD
    const formattedLabels = compare.period1.labels.map((dateString: string) => {
      const parts = dateString.split("-"); 
      return `${parts[2]}`; // MM-DD
    });

    setChartData({
      labels: formattedLabels,      // <-- formatted labels
      series: compare.period1.series
    });
  }
}, [charts]);

  const options = {
    chart: { type: "line", height: 250, toolbar: { show: false } },

    dataLabels: { enabled: false },

    stroke: { curve: "smooth", width: 3 },

    xaxis: { categories: chartData.labels },

    title: {
      text: `Tea & tiffin comparison — ${currentBranch?.currentBranch?.name}`,
      align: "center",
      style: { color: titleColor },
    },

    tooltip: {
      enabled: true,
      y: {
        formatter: (value: number) => thousandSeparator(value, 0),
      },
    },

    colors: ["#008FFB", "#FF4560"], // Period 1 = Blue, Period 2 = Red
    legend: { show: true },
  };

  return (
    <div>
      {chartData.series.length ? (
        <ApexChart options={options} series={chartData.series} type="line" height={250} />
      ) : (
        ""
      )}
    </div>
  );
};

export default CompareSingleItem;
