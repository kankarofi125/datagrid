export type HapticKind = "tap" | "key" | "navigation" | "success" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 10,
  key: 7,
  navigation: [10, 18, 10],
  success: [12, 34, 18],
  error: [28, 38, 28],
};

export function triggerHaptic(kind: HapticKind = "tap") {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function" ||
    document.visibilityState !== "visible" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {
    // Vibration is an optional enhancement and may be blocked by the browser.
  }
}
