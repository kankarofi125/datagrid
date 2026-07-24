const PIN_DENIAL_PATTERN =
  /(?:incorrect|invalid|wrong).{0,24}pin|pin.{0,24}(?:incorrect|invalid|wrong)/i;

export function isPinDenied(error: string | null | undefined) {
  return Boolean(error && PIN_DENIAL_PATTERN.test(error));
}
