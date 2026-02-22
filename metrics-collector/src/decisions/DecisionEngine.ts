import { SignalBundle, Decision, PatternSignal, DriftSignal } from '../signals/SignalTypes';

export class DecisionEngine {

    /**
     * Evaluates a SignalBundle to decide if AI analysis is needed.
     * Returns a Decision object with scoring and reasoning.
     */
    public evaluate(bundle: SignalBundle): Decision {
        let priority = 0;
        const reasons: string[] = [];
        const context: string[] = [];

        // 1. Check for Unknown Pattern Failures (Highest Priority)
        // If a job failed and we don't have a clear pattern for it (or it's explicitly 'unknown')
        const unknownFailures = bundle.patterns.filter(p =>
            p.status === 'failure' &&
            (p.failureType === 'unknown' || !p.failureType)
        );

        if (unknownFailures.length > 0) {
            priority += 50;
            reasons.push(`Detected ${unknownFailures.length} unknown failure patterns`);
            context.push(...unknownFailures.map(f => `pattern:${f.name}`));
        }

        // 2. Check for Significant Drift (Medium Priority)
        // Only care if drift is a REGRESSION (positive % change) and high confidence
        const significantDrift = bundle.drift.filter(d =>
            d.isAnomaly &&
            d.percentChange > 40 &&
            d.confidence > 0.7
        );

        if (significantDrift.length > 0) {
            priority += 30;
            reasons.push(`Detected ${significantDrift.length} significant performance regressions (>40%)`);
            context.push(...significantDrift.map(d => `drift:${d.name}`));
        }

        // 3. Check for High Impact Changes AND Failures (Context Booster)
        // If code changed a lot AND we failed, it's likely related
        const highImpactChanges = bundle.changes.filter(c => c.impact === 'high');
        const hasFailures = bundle.patterns.some(p => p.status === 'failure');

        if (highImpactChanges.length > 0 && hasFailures) {
            priority += 20;
            reasons.push('High impact code changes coincided with pipeline failure');
            context.push(...highImpactChanges.map(c => `change:${c.name}`));
        }

        // 4. Threshold Logic
        const SHOULD_INVOKE_THRESHOLD = 45; // Tune this value
        const shouldInvokeLLM = priority >= SHOULD_INVOKE_THRESHOLD;

        if (priority === 0 && hasFailures) {
            // TODO: Ensure standard deterministic failures without drift or strict pattern match 
            // are properly prioritized for safety.
        }

        return {
            shouldInvokeLLM,
            priority,
            reason: reasons.length > 0 ? reasons.join('; ') : 'No significant proprietary signals detected.',
            context
        };
    }
}
