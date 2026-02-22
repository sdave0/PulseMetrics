import { ChangeSignal, SignalContext } from './SignalTypes';

/**
 * ChangeProcessor
 * 
 * Extracts change-based signals:
 * - Lockfile modifications
 * - Test count changes
 * - Code churn analysis
 */
export class ChangeProcessor {

    /**
     * Detect lockfile changes
     */
    private detectLockfileChange(context: SignalContext): ChangeSignal | null {
        const { currentRun } = context;

        if (!currentRun.commitAnalysis?.lockfile_changed) {
            return null;
        }

        return {
            type: 'change',
            name: 'lockfile_change',
            confidence: 1.0, // Deterministic
            timestamp: new Date(),
            changeType: 'lockfile',
            description: 'Dependency lockfile was modified',
            impact: 'medium',
            metadata: {
                lockfileChanged: true,
            },
        };
    }

    /**
     * Detect test count changes
     */
    private detectTestCountChange(context: SignalContext): ChangeSignal | null {
        const { currentRun, historicalRuns } = context;

        if (!currentRun.testSummary || historicalRuns.length === 0) {
            return null;
        }

        // Find most recent run with test data
        const baselineRun = historicalRuns.find(r => r.testSummary && r.testSummary.total > 0);
        if (!baselineRun || !baselineRun.testSummary) {
            return null;
        }

        const currentTotal = currentRun.testSummary.total;
        const baselineTotal = baselineRun.testSummary.total;
        const delta = currentTotal - baselineTotal;
        const percentChange = (delta / baselineTotal) * 100;

        // Only signal if change is significant (>5%)
        if (Math.abs(percentChange) < 5) {
            return null;
        }

        const impact = Math.abs(percentChange) > 20 ? 'high' : 'medium';

        return {
            type: 'change',
            name: 'test_count_change',
            confidence: 0.9,
            timestamp: new Date(),
            changeType: 'test_count',
            description: `Test count changed from ${baselineTotal} to ${currentTotal} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`,
            impact,
            metadata: {
                testCountDelta: delta,
            },
        };
    }

    /**
     * Detect code churn
     */
    private detectCodeChurn(context: SignalContext): ChangeSignal | null {
        const { currentRun } = context;

        if (!currentRun.commitAnalysis?.total_files) {
            return null;
        }

        const filesChanged = currentRun.commitAnalysis.total_files;

        // Thresholds for impact assessment
        let impact: 'low' | 'medium' | 'high' = 'low';
        if (filesChanged > 50) {
            impact = 'high';
        } else if (filesChanged > 20) {
            impact = 'medium';
        } else if (filesChanged < 5) {
            return null; // Don't signal for very small changes
        }

        return {
            type: 'change',
            name: 'code_churn',
            confidence: 1.0, // Deterministic
            timestamp: new Date(),
            changeType: 'code_churn',
            description: `${filesChanged} files modified in this commit`,
            impact,
            metadata: {
                filesChanged,
            },
        };
    }

    /**
     * Extract all change signals
     */
    extract(context: SignalContext): ChangeSignal[] {
        const signals: ChangeSignal[] = [];

        const lockfileSignal = this.detectLockfileChange(context);
        if (lockfileSignal) signals.push(lockfileSignal);

        const testCountSignal = this.detectTestCountChange(context);
        if (testCountSignal) signals.push(testCountSignal);

        const churnSignal = this.detectCodeChurn(context);
        if (churnSignal) signals.push(churnSignal);

        return signals;
    }
}
