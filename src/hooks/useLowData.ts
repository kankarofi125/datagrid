"use client";

import { useEffect, useState } from "react";

const KEY = "dg_low_data";

/** Low-data mode: skip heavy media, autoplay, and large backgrounds */
export function useLowData() {
  const [lowData, setLowData] = useState(false);

  useEffect(() => {
    setLowData(localStorage.getItem(KEY) === "1");
  }, []);

  function toggle(on?: boolean) {
    const next = on ?? !lowData;
    setLowData(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    document.documentElement.classList.toggle("low-data", next);
  }

  useEffect(() => {
    document.documentElement.classList.toggle("low-data", lowData);
  }, [lowData]);

  return { lowData, toggle, setLowData: toggle };
}
