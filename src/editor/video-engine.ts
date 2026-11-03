export function getChromaSvgMatrix(color: string, tolerance: number, softness: number): string {
  const hex = /^#?[0-9a-f]{6}$/i.test(color) ? color.replace("#", "") : "00ff00";
  const key = [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const grey = (key[0] + key[1] + key[2]) / 3;
  const direction = key.map(value => value - grey);
  const denominator = direction.reduce((sum, value, index) => sum + value * key[index], 0);
  if (Math.abs(denominator) < 0.015) return "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
  const toleranceRatio = Math.max(0, Math.min(180, tolerance)) / 255;
  const softRange = Math.max(0.08, 1 - toleranceRatio + Math.max(0, Math.min(100, softness)) / 100 * 0.35);
  const alpha = direction.map(value => (-value / denominator / softRange).toFixed(5));
  return ["1 0 0 0 0", "0 1 0 0 0", "0 0 1 0 0", alpha.join(" ") + " 0 1"].join(" ");
}
