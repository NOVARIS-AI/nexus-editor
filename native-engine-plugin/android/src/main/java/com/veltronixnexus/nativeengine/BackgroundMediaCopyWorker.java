package com.veltronixnexus.nativeengine;

import android.content.Context;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.net.Uri;
import androidx.annotation.NonNull;
import androidx.work.Data;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.File;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Background codec-preserving source remux. It does not apply timeline effects. */
public final class BackgroundMediaCopyWorker extends Worker {
  public BackgroundMediaCopyWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull @Override public Result doWork() {
    String source = getInputData().getString("sourceUri");
    String requestedName = getInputData().getString("outputName");
    if (source == null) return failure("Source URI is missing.");
    String safeName = (requestedName == null ? "nexus-export" : requestedName)
      .replaceAll("[^A-Za-z0-9._-]", "-").replaceAll("\\.{2,}", ".");
    if (safeName.isEmpty()) safeName = "nexus-export";
    MediaExtractor extractor = new MediaExtractor();
    MediaMuxer muxer = null;
    boolean muxerStarted = false;
    File output = null;
    try {
      Uri uri = Uri.parse(source);
      if ("content".equals(uri.getScheme())) extractor.setDataSource(getApplicationContext(), uri, null);
      else extractor.setDataSource(uri.getPath());
      List<Integer> sourceTracks = new ArrayList<>();
      List<Integer> destinationTracks = new ArrayList<>();
      Map<Integer, Long> firstPts = new HashMap<>();
      long durationUs = 0;
      for (int i = 0; i < extractor.getTrackCount(); i++) {
        MediaFormat format = extractor.getTrackFormat(i);
        String mime = format.getString(MediaFormat.KEY_MIME);
        if (mime != null && (mime.startsWith("video/") || mime.startsWith("audio/"))) {
          sourceTracks.add(i);
          if (format.containsKey(MediaFormat.KEY_DURATION)) durationUs = Math.max(durationUs, format.getLong(MediaFormat.KEY_DURATION));
        }
      }
      if (sourceTracks.isEmpty()) throw new IllegalStateException("No audio or video tracks were found.");
      File dir = getApplicationContext().getExternalFilesDir(null);
      if (dir == null) dir = getApplicationContext().getCacheDir();
      output = new File(dir, safeName + "-" + getId() + ".mp4");
      muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
      for (int sourceTrack : sourceTracks) {
        destinationTracks.add(muxer.addTrack(extractor.getTrackFormat(sourceTrack)));
        extractor.selectTrack(sourceTrack);
      }
      muxer.start();
      muxerStarted = true;
      ByteBuffer buffer = ByteBuffer.allocateDirect(4 * 1024 * 1024);
      MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
      long globalFirstPts = -1, lastProgressPts = 0;
      while (!isStopped()) {
        buffer.clear();
        int size = extractor.readSampleData(buffer, 0);
        if (size < 0) break;
        int sourceTrack = extractor.getSampleTrackIndex();
        int trackIndex = sourceTracks.indexOf(sourceTrack);
        if (trackIndex >= 0) {
          long pts = extractor.getSampleTime();
          if (globalFirstPts < 0) globalFirstPts = pts;
          long trackFirst = firstPts.computeIfAbsent(sourceTrack, ignored -> pts);
          long normalized = Math.max(0, pts - globalFirstPts);
          info.set(0, size, normalized, extractor.getSampleFlags());
          muxer.writeSampleData(destinationTracks.get(trackIndex), buffer, info);
          if (durationUs > 0 && pts - lastProgressPts >= 500_000) {
            int progress = (int)Math.max(1, Math.min(99, normalized * 100 / durationUs));
            setProgressAsync(new Data.Builder().putInt("progress", progress).build());
            lastProgressPts = pts;
          }
        }
        if (!extractor.advance()) break;
      }
      if (isStopped()) throw new InterruptedException("Background media copy cancelled.");
      if (globalFirstPts < 0) throw new IllegalStateException("The selected source contains no readable media samples.");
      muxer.stop();
      muxerStarted = false;
      muxer.release();
      muxer = null;
      extractor.release();
      return Result.success(new Data.Builder().putInt("progress", 100)
        .putString("fileUri", Uri.fromFile(output).toString()).build());
    } catch (Exception error) {
      if (muxer != null) {
        if (muxerStarted) { try { muxer.stop(); } catch (Exception ignored) {} }
        try { muxer.release(); } catch (Exception ignored) {}
      }
      try { extractor.release(); } catch (Exception ignored) {}
      if (output != null) output.delete();
      return failure(error.getMessage() == null ? "Background media copy failed." : error.getMessage());
    }
  }

  private Result failure(String message) {
    return Result.failure(new Data.Builder().putString("error", message).build());
  }
}
