// chartTheme.ts
export const getApexTheme = (mode: string) => {
  const textColor = mode === "dark" ? "#dfe6e9" : "#2d3436";
  const gridColor = mode === "dark" ? "#2f3640" : "#dfe6e9";

  return {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
    },

    stroke: {
      curve: "smooth",
      width: 3,
    },

    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
    },

    dataLabels: { enabled: false },

    xaxis: {
      labels: {
        rotate: -45,
        style: { fontSize: "12px", colors: textColor },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },

    yaxis: {
      labels: {
        style: { colors: textColor },
      },
    },

    legend: {
      labels: { colors: textColor },
      position: "top",
      horizontalAlign: "center",
    },

    tooltip: {
      theme: mode === "dark" ? "dark" : "light",
      style: { fontSize: "12px" },
    },

    fill: {
      type: "gradient",
      gradient: {
        shade: mode === "dark" ? "dark" : "light",
        type: "vertical",
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
  };
};
