"use client";

import { useEffect, useState } from "react";

export type LocalClock = {
  /** HH:MM:SS in the user's local zone */
  time: string;
  /** Short place label e.g. Abuja, London */
  place: string;
  /** Offset label e.g. GMT+1, WAT, PST */
  zoneAbbr: string;
  /** IANA zone e.g. Africa/Lagos */
  timeZone: string;
  /** True once we refined place via geolocation */
  fromGeo: boolean;
};

function zoneFromBrowser(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Africa/Lagos → Lagos, America/New_York → New York */
export function placeFromTimeZone(tz: string): string {
  const part = tz.split("/").pop() || tz;
  return part.replace(/_/g, " ");
}

function formatTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatZoneAbbr(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(date);
    return parts.find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

/**
 * Live clock for the user's real location.
 * Time always uses the device timezone. Place prefers GPS reverse-geocode
 * when permission is granted; otherwise the timezone city name.
 */
export function useLocalClock(): LocalClock {
  const [timeZone] = useState(zoneFromBrowser);
  const [place, setPlace] = useState(() => placeFromTimeZone(zoneFromBrowser()));
  const [fromGeo, setFromGeo] = useState(false);
  const [time, setTime] = useState("");
  const [zoneAbbr, setZoneAbbr] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(formatTime(now, timeZone));
      setZoneAbbr(formatZoneAbbr(now, timeZone));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeZone]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (cancelled) return;
        const { latitude, longitude } = pos.coords;
        try {
          // Free client reverse-geocode (no API key)
          const url = new URL(
            "https://api.bigdatacloud.net/data/reverse-geocode-client"
          );
          url.searchParams.set("latitude", String(latitude));
          url.searchParams.set("longitude", String(longitude));
          url.searchParams.set("localityLanguage", "en");
          const res = await fetch(url.toString());
          if (!res.ok || cancelled) return;
          const data = (await res.json()) as {
            city?: string;
            locality?: string;
            principalSubdivision?: string;
            countryName?: string;
          };
          const city =
            data.city ||
            data.locality ||
            data.principalSubdivision ||
            placeFromTimeZone(timeZone);
          if (!cancelled && city) {
            setPlace(city);
            setFromGeo(true);
          }
        } catch {
          /* keep timezone place */
        }
      },
      () => {
        /* denied / unavailable — keep timezone place */
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 }
    );

    return () => {
      cancelled = true;
    };
  }, [timeZone]);

  return { time, place, zoneAbbr, timeZone, fromGeo };
}
