package com.dena.app;

import android.content.Context;
import android.os.Environment;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import org.json.JSONObject;

public class AutoBackupWorker extends Worker {
    public static final String UNIQUE_WORK_NAME = "dena_auto_backup_worker";
    private static final String MIRROR_DIR_NAME = "Dena";
    private static final String SOURCE_FILE_NAME = "auto-backup-source.json";
    private static final String META_FILE_NAME = "auto-backup-meta.json";
    private static final long ONE_DAY_MS = 24L * 60L * 60L * 1000L;

    public AutoBackupWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            final long nowMs = System.currentTimeMillis();

            File mirrorDir = new File(getApplicationContext().getFilesDir(), MIRROR_DIR_NAME);
            File sourceFile = new File(mirrorDir, SOURCE_FILE_NAME);
            File metaFile = new File(mirrorDir, META_FILE_NAME);

            if (!sourceFile.exists() || !metaFile.exists()) {
                return Result.success();
            }

            JSONObject meta = new JSONObject(readUtf8(metaFile));
            boolean enabled = meta.optBoolean("enabled", false);
            int intervalDays = meta.optInt("intervalDays", 1);
            if (intervalDays < 1) intervalDays = 1;
            if (intervalDays > 365) intervalDays = 365;

            if (!enabled) {
                return Result.success();
            }

            long lastBackupMs = parseIsoMs(meta.optString("lastBackupAt", ""));
            long minElapsed = intervalDays * ONE_DAY_MS;
            if (lastBackupMs > 0 && nowMs - lastBackupMs < minElapsed) {
                return Result.success();
            }

            File docsRoot = getApplicationContext().getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
            if (docsRoot == null) {
                return Result.retry();
            }

            File backupDir = new File(docsRoot, "Dena");
            if (!backupDir.exists() && !backupDir.mkdirs()) {
                return Result.retry();
            }

            String fileName = buildBackupFileName(nowMs);
            File targetFile = new File(backupDir, fileName);
            copyFile(sourceFile, targetFile);

            String isoNow = toIsoUtc(nowMs);
            meta.put("lastBackupAt", isoNow);
            writeUtf8(metaFile, meta.toString());

            return Result.success();
        } catch (Exception error) {
            return Result.retry();
        }
    }

    private static String buildBackupFileName(long timeMs) {
        Date date = new Date(timeMs);
        SimpleDateFormat dateFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        SimpleDateFormat timeFmt = new SimpleDateFormat("HH-mm-ss", Locale.US);
        dateFmt.setTimeZone(TimeZone.getTimeZone("UTC"));
        timeFmt.setTimeZone(TimeZone.getTimeZone("UTC"));
        return "dena_" + dateFmt.format(date) + "_" + timeFmt.format(date) + "_backup.json";
    }

    private static String toIsoUtc(long timeMs) {
        Date date = new Date(timeMs);
        SimpleDateFormat isoFmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        isoFmt.setTimeZone(TimeZone.getTimeZone("UTC"));
        return isoFmt.format(date);
    }

    private static long parseIsoMs(String value) {
        try {
            return java.time.Instant.parse(value).toEpochMilli();
        } catch (Exception ignored) {
            return 0L;
        }
    }

    private static void copyFile(File source, File target) throws IOException {
        try (
            BufferedInputStream in = new BufferedInputStream(new FileInputStream(source));
            BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(target))
        ) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
            out.flush();
        }
    }

    private static String readUtf8(File file) throws IOException {
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] bytes = input.readAllBytes();
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }

    private static void writeUtf8(File file, String data) throws IOException {
        try (FileOutputStream output = new FileOutputStream(file, false)) {
            output.write(data.getBytes(StandardCharsets.UTF_8));
            output.flush();
        }
    }
}
