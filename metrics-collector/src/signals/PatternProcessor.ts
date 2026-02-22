import { PatternSignal, SignalContext } from './SignalTypes';

/**
 * PatternProcessor
 * 
 * Extracts pattern-based signals:
 * - Job categorization (test, build, lint, deploy, etc.)
 * - Failure pattern detection (timeout, OOM, flaky tests)
 */
export class PatternProcessor {

    /**
     * Infer job category from job name
     */
    private inferJobCategory(name: string): 'test' | 'build' | 'lint' | 'deploy' | 'dependency' | 'unknown' {
        const n = name.toLowerCase();
        if (n.includes('test') || n.includes('spec') || n.includes('e2e')) return 'test';
        if (n.includes('build') || n.includes('compile') || n.includes('pack')) return 'build';
        if (n.includes('lint') || n.includes('format') || n.includes('check')) return 'lint';
        if (n.includes('deploy') || n.includes('publish') || n.includes('release')) return 'deploy';
        if (n.includes('install') || n.includes('setup') || n.includes('dep')) return 'dependency';
        return 'unknown';
    }

    /**
     * Detect failure type from job status and name
     * (Placeholder - can be enhanced with log parsing in future)
     */
    private detectFailureType(jobName: string, status: string | null): 'timeout' | 'oom' | 'flaky' | 'dependency' | 'unknown' | undefined {
        if (status !== 'failure') return undefined;

        const name = jobName.toLowerCase();

        // Basic heuristics - can be enhanced with actual log analysis
        if (name.includes('timeout')) return 'timeout';
        if (name.includes('memory') || name.includes('oom')) return 'oom';
        if (name.includes('flaky') || name.includes('intermittent')) return 'flaky';
        if (name.includes('install') || name.includes('dependency')) return 'dependency';

        return 'unknown';
    }

    /**
     * Extract pattern signals from current run
     */
    extract(context: SignalContext): PatternSignal[] {
        const signals: PatternSignal[] = [];
        const { currentRun } = context;

        for (const job of currentRun.jobs) {
            const category = this.inferJobCategory(job.name);
            const failureType = this.detectFailureType(job.name, job.status);

            const signal: PatternSignal = {
                type: 'pattern',
                name: `job_pattern_${job.name}`,
                confidence: failureType ? 0.7 : 0.9, // Lower confidence for failure detection without logs
                timestamp: new Date(),
                category,
                failureType,
                jobName: job.name,
                status: job.status,
            };

            signals.push(signal);
        }

        return signals;
    }
}
