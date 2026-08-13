// chartTheme.ts
import { readToken } from '../../../theme/themeColors';

/**
 * The shared ApexCharts options.
 *
 * The two chrome colours used to be spelled out here, once per mode. They are
 * read from the palette now -- tokens.css already carries a light and a dark
 * value for each, so this no longer has to know which mode it is in. `mode` is
 * still taken because Apex's own tooltip skin is named, not coloured.
 */
export const getApexTheme = (mode: string) => {
  const textColor = readToken('chart-text');
  const gridColor = readToken('chart-grid');

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
