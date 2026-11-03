import type { TimelineClip } from "../types";

type TimingPoint = { source: number; timeline: number };
export type CompiledClipTiming = {
  duration: number;
  sourceAtTimeline: (timelineSeconds: number) => number;
  speedAtSource: (sourceSeconds: number) => number;
};

/** Compile speed curves once per export; frame rendering then uses a small lookup table. */
export function compileClipTiming(clip: TimelineClip): CompiledClipTiming {
  const sourceIn = Math.max(0, Number.isFinite(clip.sourceIn) ? clip.sourceIn : 0);
  const span = Math.max(0, (Number.isFinite(clip.sourceOut) ? clip.sourceOut : sourceIn) - sourceIn);
  const baseSpeed = Math.max(0.1, Math.min(8, Number(clip.speed) || 1));
  const points = (clip.speedCurve || [])
    .filter(point => Number.isFinite(point.position) && Number.isFinite(point.speed))
    .map(point => ({ position: Math.max(0, Math.min(1, point.position)), speed: Math.max(0.1, Math.min(8, point.speed)) }))
    .sort((a, b) => a.position - b.position)
    .filter((point, index, all) => index === 0 || point.position > all[index - 1].position);

  const speedAtProgress = (progress: number) => {
    if (!points.length) return baseSpeed;
    const p = Math.max(0, Math.min(1, progress));
    if (p <= points[0].position) return points[0].speed;
    const last = points[points.length - 1];
    if (p >= last.position) return last.speed;
    let low = 0, high = points.length - 1;
    while (low + 1 < high) {
      const mid = (low + high) >> 1;
      if (points[mid].position <= p) low = mid; else high = mid;
    }
    const left = points[low], right = points[high];
    const mix = (p - left.position) / Math.max(0.0001, right.position - left.position);
    return left.speed + (right.speed - left.speed) * mix;
  };
  const speedAtSource = (sourceSeconds: number) => speedAtProgress(span > 0 ? (sourceSeconds - sourceIn) / span : 0);

  if (!points.length || span <= 0) {
    const duration = span / baseSpeed;
    return {
      duration,
      sourceAtTimeline: seconds => sourceIn + Math.max(0, Math.min(duration, seconds)) * baseSpeed,
      speedAtSource
    };
  }

  const samples = Math.max(256, Math.min(2048, Math.ceil(span * 8)));
  const table: TimingPoint[] = [{ source: 0, timeline: 0 }];
  let elapsed = 0;
  for (let i = 1; i <= samples; i++) {
    const previous = span * (i - 1) / samples;
    const current = span * i / samples;
    elapsed += (current - previous) / speedAtProgress(((previous + current) / 2) / span);
    table.push({ source: current, timeline: elapsed });
  }
  const duration = elapsed;
  return {
    duration,
    speedAtSource,
    sourceAtTimeline(seconds: number) {
      const target = Math.max(0, Math.min(duration, Number.isFinite(seconds) ? seconds : 0));
      let low = 0, high = table.length - 1;
      while (low + 1 < high) {
        const mid = (low + high) >> 1;
        if (table[mid].timeline <= target) low = mid; else high = mid;
      }
      const left = table[low], right = table[high];
      const mix = (target - left.timeline) / Math.max(0.000001, right.timeline - left.timeline);
      return sourceIn + left.source + (right.source - left.source) * Math.max(0, Math.min(1, mix));
    }
  };
}
