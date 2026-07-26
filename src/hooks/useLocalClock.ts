"use client";

import { useEffect, useState } from "react";
import {
  formatNigeriaClock,
  formatNigeriaDateTime,
  NIGERIA_TIME_ZONE,
} from "@/lib/time";

export type LocalClock = {
  /** HH:MM:SS in Africa/Lagos */
  time: string;
  /** Empty — no city/state labels */
  place: string;
  /** Empty — no zone abbreviation in UI */
  zoneAbbr: string;
  timeZone: string;
  fromGeo: false;
};

export { formatNigeriaDateTime, NIGERIA_TIME_ZONE };

/**
 * Live clock in Nigerian time (Africa/Lagos).
 * Does not request location or show city/state names.
 */
export function useLocalClock(): LocalClock {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(formatNigeriaClock(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return {
    time,
    place: "",
    zoneAbbr: "",
    timeZone: NIGERIA_TIME_ZONE,
    fromGeo: false,
  };
}
