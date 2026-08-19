import jsVectorMap from 'jsvectormap';
import { useEffect } from 'react';
import 'jsvectormap/dist/jsvectormap.css';

const MapOne = () => {
  useEffect(() => {
    const mapOne = new jsVectorMap({
      selector: '#mapOne',
      map: 'us_aea_en',
      zoomButtons: true,

      regionStyle: {
        initial: {
          fill: 'rgb(var(--c-gray-300))',
        },
        hover: {
          fillOpacity: 1,
          fill: 'rgb(var(--c-primary))',
        },
      },
      regionLabelStyle: {
        initial: {
          fontFamily: 'Satoshi',
          fontWeight: 'semibold',
          fill: 'rgb(var(--c-white))',
        },
        hover: {
          cursor: 'pointer',
        },
      },

      labels: {
        regions: {
          render(code: string) {
            return code.split('-')[1];
          },
        },
      },
    });
    mapOne;
  });

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white py-6 px-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-7">
      <h4 className="mb-2 text-xl font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
        Region labels
      </h4>
      <div id="mapOne" className="mapOne map-btn h-90"></div>
    </div>
  );
};

export default MapOne;
