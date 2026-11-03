/**
 * Soft downward-expander for the editor's live/export noise-gate control.
 * A soft knee avoids the abrupt chopping caused by a binary threshold gate.
 */
export function getSoftNoiseGateGain(rms: number, strength: number): number {
  const level = Math.max(0, Number.isFinite(rms) ? rms : 0);
  const amount = Math.max(0, Math.min(100, Number.isFinite(strength) ? strength : 0));
  if (amount === 0) return 1;
  const threshold = 0.00045 + amount * 0.00032;
  const floor = 0.16;
  const knee = Math.max(0.00025, threshold * 0.8);
  if (level >= threshold + knee) return 1;
  if (level <= Math.max(0, threshold - knee)) return floor;
  const position = (level - (threshold - knee)) / (2 * knee);
  const eased = position * position * (3 - 2 * position);
  return floor + (1 - floor) * eased;
}
