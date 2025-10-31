import React from "react";

function LoaderDots({ isLight }) {
  return (
    <div className={` threes ${isLight ? "" : "primary"}`}>
      <div className="bg-black dark:bg-white three three-1"></div>
      <div className="bg-black dark:bg-white three three-2"></div>
      <div className="bg-black dark:bg-white three three-3"></div>
    </div>
  );
}


export default LoaderDots;
