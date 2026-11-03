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

/** Extracts a selected audio range off the UI thread and reports WorkManager progress. */
public final class BackgroundAudioExtractWorker extends Worker {
  public BackgroundAudioExtractWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull @Override public Result doWork() {
    String source = getInputData().getString("sourceUri");
    long fromUs = Math.max(0, getInputData().getLong("startUs", 0));
    long toUs = getInputData().getLong("endUs", -1);
    if (source == null || (toUs > 0 && toUs <= fromUs)) {
      return Result.failure(new Data.Builder().putString("error", "Invalid source or audio range.").build());
    }
    MediaExtractor extractor = new MediaExtractor();
    MediaMuxer muxer = null;
    boolean muxerStarted = false;
    File output = null;
    try {
      Uri uri = Uri.parse(source);
      if ("content".equals(uri.getScheme())) extractor.setDataSource(getApplicationContext(), uri, null);
      else extractor.setDataSource(uri.getPath());
      int audioTrack = -1;
      MediaFormat audioFormat = null;
      for (int i = 0; i < extractor.getTrackCount(); i++) {
        MediaFormat format = extractor.getTrackFormat(i);
        String mime = format.getString(MediaFormat.KEY_MIME);
        if (mime != null && mime.startsWith("audio/")) {
          audioTrack = i;
          audioFormat = format;
          break;
        }
      }
      if (audioTrack < 0 || audioFormat == null) throw new IllegalStateException("The selected video has no audio track.");
      extractor.selectTrack(audioTrack);
      File dir = new File(getApplicationContext().getCacheDir(), "nexus-audio");
      if (!dir.exists() && !dir.mkdirs()) throw new IllegalStateException("Could not prepare temporary audio storage.");
      output = new File(dir, "audio-" + getId() + ".m4a");
      muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
      int outputTrack = muxer.addTrack(audioFormat);
      muxer.start();
      muxerStarted = true;

      int capacity = 4 * 1024 * 1024;
      if (audioFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
        capacity = Math.max(256 * 1024, Math.min(16 * 1024 * 1024, audioFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE)));
      }
      ByteBuffer buffer = ByteBuffer.allocateDirect(capacity);
      MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
      extractor.seekTo(fromUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC);
      long firstPts = -1;
      long sourceDuration = audioFormat.containsKey(MediaFormat.KEY_DURATION) ? audioFormat.getLong(MediaFormat.KEY_DURATION) : toUs - fromUs;
      long lastProgress = 0;
      while (!isStopped()) {
        buffer.clear();
        int size = extractor.readSampleData(buffer, 0);
        if (size < 0) break;
        long pts = extractor.getSampleTime();
        if (pts < fromUs) {
          if (!extractor.advance()) break;
          continue;
        }
        if (toUs > 0 && pts >= toUs) break;
        if (firstPts < 0) firstPts = pts;
        info.set(0, size, Math.max(0, pts - firstPts), extractor.getSampleFlags());
        muxer.writeSampleData(outputTrack, buffer, info);
        if (sourceDuration > 0 && pts - lastProgress >= 500_000) {
          int progress = (int)Math.max(1, Math.min(99, (pts - fromUs) * 100 / Math.max(1, (toUs > 0 ? toUs : sourceDuration) - fromUs)));
          setProgressAsync(new Data.Builder().putInt("progress", progress).build());
          lastProgress = pts;
        }
        if (!extractor.advance()) break;
      }
      if (isStopped()) throw new InterruptedException("Audio extraction cancelled.");
      if (firstPts < 0) throw new IllegalStateException("No audio samples were found in the selected range.");
      muxer.stop();
      muxerStarted = false;
      muxer.release();
      muxer = null;
      extractor.release();
      Data result = new Data.Builder().putInt("progress", 100)
        .putString("fileUri", Uri.fromFile(output).toString())
        .putString("fileName", output.getName()).build();
      return Result.success(result);
    } catch (Exception error) {
      if (muxer != null) {
        if (muxerStarted) { try { muxer.stop(); } catch (Exception ignored) {} }
        try { muxer.release(); } catch (Exception ignored) {}
      }
      try { extractor.release(); } catch (Exception ignored) {}
      if (output != null) output.delete();
      return Result.failure(new Data.Builder().putString("error", error.getMessage() == null ? "Native audio extraction failed." : error.getMessage()).build());
    }
  }
}
