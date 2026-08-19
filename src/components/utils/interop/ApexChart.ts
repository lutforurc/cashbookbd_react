import ReactApexChart from 'react-apexcharts';

/**
 * react-apexcharts, unwrapped once.
 *
 * The package ships no `exports` map and its ESM build re-exports a CJS
 * default, so under Vite 8's rolldown the default import can arrive as the
 * module object rather than the component — "Element type is invalid ...
 * got: object" on every chart. The same unwrap the shared DatePicker does;
 * under Vite 4 it is a no-op. Import charts from here, never from
 * 'react-apexcharts' directly.
 */
const ApexChart = ((ReactApexChart as any).default ?? ReactApexChart) as typeof ReactApexChart;

export default ApexChart;
