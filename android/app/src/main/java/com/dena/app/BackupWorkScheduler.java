package com.dena.app;

import android.content.Context;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

public final class BackupWorkScheduler {
    private BackupWorkScheduler() {}

    public static void ensureScheduled(Context context) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.NOT_REQUIRED)
            .setRequiresBatteryNotLow(true)
            .build();

        // Run once per day to keep battery/RAM impact low.
        // Real backup interval (1..365 days) is still enforced by worker metadata.
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(
            AutoBackupWorker.class,
            1,
            TimeUnit.DAYS,
            6,
            TimeUnit.HOURS
        )
            .setConstraints(constraints)
            .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            AutoBackupWorker.UNIQUE_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            request
        );
    }
}
