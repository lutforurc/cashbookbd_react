import React, { useEffect, useState } from "react";
import ApexChart from "react-apexcharts";
import { useDispatch, useSelector } from "react-redux";
import { getCompare } from "./chartSlice";
import useLocalStorage from "../../../hooks/useLocalStorage";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import { userCurrentBranch } from "../branch/branchSlice";

const CompareSingleItem: React.FC = () => {
  const settings = useSelector((state) => state.settings);
  const charts = useSelector((state) => state.charts);
  const currentBranch = useSelector((state) => state.branchList);
  const dispatch = useDispatch();

  const [colorMode] = useLocalStorage("color-theme", "light");
  const titleColor = colorMode === "dark" ? "#fff" : "#666666";

  const [chartData, setChartData] = useState({
    labels: [],
    series: []
  });


useEffect(() => {
  dispatch(
    getCompare({
      branch_id: currentBranch?.currentBranch.id,
      coal4_id: 126,
      period1_start: "2025-10-01",
      period1_end: "2025-10-31",
      period2_start: "2025-11-01",
      period2_end: "2025-11-30",
    })
  );

  dispatch(userCurrentBranch());
}, []);


  /** --------------------------------------
   *     MAP COMPARE API DATA → CHART DATA  
   *  -------------------------------------- */
  useEffect(() => {
    const compare =
      charts?.compareData?.period1 ||       // if compareData slice exists
      charts?.data?.data?.period1 ||        // if API stored here
      charts?.transactionChart?.data?.data?.period1; // fallback (not likely)



    if (!compare?.labels || !compare?.series) return;

    const formattedLabels = compare.labels.map((dateStr) =>
      dateStr?.split("-") || ""
    );

    const updatedSeries = compare.series.map((s, i) => ({
      name: s.name?.trim() !== "" ? s.name : `Series ${i + 1}`,
      data: s.data || [],
    }));

    setChartData({
      labels: compare.labels,
      series: updatedSeries,
    });

    console.log("COMPARE DATA:", compare);

  }, [charts]);



  // Chart Options
  const options = {
    chart: { type: "line", height: 250, toolbar: { show: false } },

    dataLabels: { enabled: false },

    stroke: { curve: "smooth", width: 3 },

    xaxis: { categories: chartData.labels },

    title: {
      text: `Tea & Tiffin comparison `,
      align: "center",
      style: { color: titleColor },
    },

    tooltip: {
      enabled: true,
      y: {
        formatter: (value: number) => thousandSeparator(value, 0),
      },
    },

    colors: ["#008FFB", "#FF4560"],
    legend: { show: true },
  };

  return (
    <div>
      {chartData.series.length ? (
        <ApexChart
          options={options}
          series={chartData.series}
          type="line"
          height={250}
        />
      ) : (
        ""
      )}
    </div>
  );
};

export default CompareSingleItem;
