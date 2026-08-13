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
/**
 * Chart type sizes, in one place.
 *
 * Apex's own defaults are 11px for axis labels and titles and 12px for the
 * legend -- sizes for a chart in a card the width of a phone, not one running
 * the width of the dashboard. They were left at the default and read as fine
 * print. Set here rather than per chart so the three do not drift apart.
 */
const FONT = {
  label: '14px',
  title: '15px',
  legend: '14px',
  tooltip: '14px',
};

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
        style: { fontSize: FONT.label, colors: textColor },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
      title: {
        style: { fontSize: FONT.title, fontWeight: 500, color: textColor },
      },
    },

    // Carries the title style as well as the labels, so a chart naming its
    // y-axis can spread this and add only the text.
    yaxis: {
      labels: {
        style: { fontSize: FONT.label, colors: textColor },
      },
      title: {
        style: { fontSize: FONT.title, fontWeight: 500, color: textColor },
      },
    },

    legend: {
      labels: { colors: textColor },
      fontSize: FONT.legend,
      markers: { width: 12, height: 12 },
      itemMargin: { horizontal: 10 },
      position: "top",
      horizontalAlign: "center",
    },

    tooltip: {
      theme: mode === "dark" ? "dark" : "light",
      style: { fontSize: FONT.tooltip },
    },

    // An area fill has to sit above the surface it is drawn on, and Apex's
    // `shade` says which way to take the series colour. "dark" was being asked
    // for in dark mode, which walked the fill towards black -- towards the card
    // behind it -- so the band under the line disappeared into the card. Both
    // modes lift the colour away from their own background instead, and dark
    // mode starts from a higher opacity because it has less room to work in.
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "vertical",
        opacityFrom: mode === "dark" ? 0.55 : 0.4,
        opacityTo: mode === "dark" ? 0.05 : 0.1,
        stops: [0, 90, 100],
      },
    },
  };
};
