/**
 * NEXUS Media Engine
 * Mediabunny handles incremental, timestamp-aware decoding for timeline assets.
 * The UI keeps lightweight browser-native fallbacks for older Android WebViews.
 */
export async function extractVideoFilmstripFrames(
  file: File,
  clipDuration: number,
  sourceIn = 0,
  sourceOut?: number,
  onProgress?: (frames: string[]) => void,
  performanceTier: "compact" | "balanced" | "power" = "balanced",
): Promise<string[]> {
  const { Input, ALL_FORMATS, BlobSource, CanvasSink } = await import("mediabunny");
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const track = await input.getPrimaryVideoTrack();
  if (!track || !(await track.canDecode())) throw new Error("Video track cannot be decoded");
  const firstTimestamp = await track.getFirstTimestamp();
  const trackDuration = await track.computeDuration();
  const trackEnd = firstTimestamp + trackDuration;
  const start = Math.max(firstTimestamp, firstTimestamp + Math.max(0, sourceIn));
  const requestedEnd = Number.isFinite(sourceOut) && (sourceOut as number) > sourceIn
    ? firstTimestamp + (sourceOut as number)
    : start + Math.max(0.1, clipDuration);
  const end = Math.min(trackEnd, Math.max(start + 0.04, requestedEnd));
  if (!(end > start)) throw new Error("Video clip has no decodable duration");

  // Sparse timestamp decoding avoids repeatedly seeking a DOM video element.
  // A one-canvas pool bounds GPU memory on lower-end Android devices.
  const sink = new CanvasSink(track, { width: 112, poolSize: 1 });
  const frameLimit = performanceTier === "compact" ? 28 : performanceTier === "power" ? 72 : 48;
  const count = Math.max(8, Math.min(frameLimit, Math.ceil((end - start) * 0.65)));
  const timestamps = Array.from({ length: count }, (_, index) =>
    start + (end - start) * ((index + 0.5) / count)
  );
  const outputCanvas = document.createElement("canvas");
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("Canvas rendering is unavailable");
  const frames: string[] = [];

  for await (const result of sink.canvasesAtTimestamps(timestamps)) {
    if (!result) continue;
    const source = result.canvas;
    if (!source) continue;
    const width = 112;
    const height = Math.max(48, Math.min(180, Math.round(width * source.height / Math.max(1, source.width))));
    outputCanvas.width = width;
    outputCanvas.height = height;
    outputContext.drawImage(source, 0, 0, width, height);
    frames.push(outputCanvas.toDataURL("image/jpeg", 0.74));
    if (frames.length % 8 === 0) onProgress?.([...frames]);
  }
  onProgress?.([...frames]);
  return frames;
}

export async function extractAudioWaveformPeaks(file: File, requestedBars = 144): Promise<number[]> {
  const { Input, ALL_FORMATS, BlobSource, AudioSampleSink } = await import("mediabunny");
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const track = await input.getPrimaryAudioTrack();
  if (!track || !(await track.canDecode())) throw new Error("Audio track cannot be decoded");
  const sampleRate = await track.getSampleRate();
  const duration = await track.computeDuration();
  const firstTimestamp = await track.getFirstTimestamp();
  if (!sampleRate || !duration) throw new Error("Audio track has no duration");

  const tierLimit = requestedBars <= 96 ? 96 : requestedBars <= 144 ? 144 : 240;
  const count = Math.max(48, Math.min(tierLimit, requestedBars));
  const peaks = new Float32Array(count);
  const sink = new AudioSampleSink(track);

  // Decode short audio samples incrementally; never load the entire audio file
  // into one giant AudioBuffer (which can exhaust memory on mobile).
  for await (const sample of sink.samples(firstTimestamp, firstTimestamp + duration)) {
    try {
      const byteLength = sample.allocationSize({ format: "f32", planeIndex: 0 });
      const channel = new Float32Array(Math.floor(byteLength / 4));
      await sample.copyTo(channel, { format: "f32", planeIndex: 0 });
      const sampleStart = sample.timestamp - firstTimestamp;
      for (let index = 0; index < channel.length; index++) {
        const time = sampleStart + index / sampleRate;
        const bar = Math.min(count - 1, Math.floor((time / duration) * count));
        if (bar >= 0) peaks[bar] = Math.max(peaks[bar], Math.abs(channel[index] || 0));
      }
    } finally {
      sample.close();
    }
  }

  let maximum = 0;
  for (const peak of peaks) maximum = Math.max(maximum, peak);
  if (maximum <= 0) return Array.from({ length: count }, () => 0.04);
  return Array.from(peaks, peak => Math.max(0.045, Math.sqrt(peak / maximum)));
}
