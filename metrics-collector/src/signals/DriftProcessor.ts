import { DriftSignal, SignalContext } from './SignalTypes';

/**
 * DriftProcessor
 * 
 * Extracts drift-based signals:
 * - Duration anomalies (workflow-level)
 * - Job-level performance regressions
 */
export class DriftProcessor {

    private readonly ANOMALY_WINDOW_SIZE = 5;
    private readonly ANOMALY_THRESHOLD_DURATION = 1.3; // 30% increase
    private readonly ANOMALY_THRESHOLD_JOB = 1.25;      // 25% increase

    /**
     * Detect workflow-level duration drift
     */
    private detectWorkflowDrift(context: SignalContext): DriftSignal | null {
        const { currentRun, historicalRuns } = context;

        if (!currentRun.durationSeconds || historicalRuns.length < this.ANOMALY_WINDOW_SIZE) {
            return null;
        }

        // Calculate baseline from recent successful runs
        const recentRuns = historicalRuns.slice(0, this.ANOMALY_WINDOW_SIZE);
        const validDurations = recentRuns
            .map(r => r.durationSeconds)
            .filter((d): d is number => d !== null && d > 0);

        if (validDurations.length === 0) return null;

        const baselineAvg = validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
        const percentChange = ((currentRun.durationSeconds - baselineAvg) / baselineAvg) * 100;
        const isAnomaly = currentRun.durationSeconds > baselineAvg * this.ANOMALY_THRESHOLD_DURATION;

        if (!isAnomaly) return null;

        return {
            type: 'drift',
            name: 'workflow_duration_drift',
            confidence: 0.85,
            timestamp: new Date(),
            metric: 'duration',
            currentValue: currentRun.durationSeconds,
            baselineValue: baselineAvg,
            percentChange: parseFloat(percentChange.toFixed(1)),
            isAnomaly: true,
        };
    }

    /**
     * Detect job-level duration drift
     */
    private detectJobDrift(context: SignalContext): DriftSignal[] {
        const signals: DriftSignal[] = [];
        const { currentRun, historicalRuns } = context;

        if (historicalRuns.length < 2) return signals;

        // Build historical baseline for each job
        const jobBaselines = new Map<string, number[]>();

        for (const run of historicalRuns) {
            for (const job of run.jobs) {
                if (job.status === 'success' && job.duration_seconds !== null) {
                    if (!jobBaselines.has(job.name)) {
                        jobBaselines.set(job.name, []);
                    }
                    jobBaselines.get(job.name)!.push(job.duration_seconds);
                }
            }
        }

        // Check current jobs against baseline
        for (const job of currentRun.jobs) {
            if (job.status !== 'success' || job.duration_seconds === null) continue;

            const baseline = jobBaselines.get(job.name);
            if (!baseline || baseline.length === 0) continue;

            const baselineAvg = baseline.reduce((a, b) => a + b, 0) / baseline.length;
            const percentChange = ((job.duration_seconds - baselineAvg) / baselineAvg) * 100;
            const isAnomaly = job.duration_seconds > baselineAvg * this.ANOMALY_THRESHOLD_JOB;

            if (isAnomaly) {
                signals.push({
                    type: 'drift',
                    name: `job_drift_${job.name}`,
                    confidence: 0.8,
                    timestamp: new Date(),
                    metric: 'job_duration',
                    currentValue: job.duration_seconds,
                    baselineValue: baselineAvg,
                    percentChange: parseFloat(percentChange.toFixed(1)),
                    isAnomaly: true,
                    jobName: job.name,
                });
            }
        }

        return signals;
    }

    /**
     * Extract all drift signals
     */
    extract(context: SignalContext): DriftSignal[] {
        const signals: DriftSignal[] = [];

        const workflowDrift = this.detectWorkflowDrift(context);
        if (workflowDrift) {
            signals.push(workflowDrift);
        }

        const jobDrifts = this.detectJobDrift(context);
        signals.push(...jobDrifts);

        return signals;
    }
}
