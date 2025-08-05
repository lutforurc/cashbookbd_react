import React, { useEffect, useState } from 'react';

interface HelmetParam {
  title: string | null;
}

const HelmetTitle: React.FC<HelmetParam> = ({ title = '' }) => {
  return (
    <div>

      {title !== 'Dashboard' &&
        (<div className="flex items-center justify-center">
          <h1 className="text-xl text-black-2 dark:text-white font-bold">
            {title}
          </h1>
        </div>)
      }

      <span>
        <title>{title}</title>
      </span>
    </div>
  );
};

export default HelmetTitle;
