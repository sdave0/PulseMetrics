import { SignalBundle, SignalContext } from './SignalTypes';
import { PatternProcessor } from './PatternProcessor';
import { DriftProcessor } from './DriftProcessor';
import { ChangeProcessor } from './ChangeProcessor';
import { DecisionEngine } from '../decisions/DecisionEngine';
import { MetricsPayload, WorkflowRunRow } from '../types';

import { AiService } from '../services/AiService';

/**
 * SignalOrchestrator
 * 
 * Coordinates all signal processors and produces a unified SignalBundle.
 * This is the main entry point for the Signal Extraction Layer.
 */
export class SignalOrchestrator {

    private patternProcessor: PatternProcessor;
    private driftProcessor: DriftProcessor;
    private changeProcessor: ChangeProcessor;
    private decisionEngine: DecisionEngine;
    private aiService: AiService;

    constructor() {
        this.patternProcessor = new PatternProcessor();
        this.driftProcessor = new DriftProcessor();
        this.changeProcessor = new ChangeProcessor();
        this.decisionEngine = new DecisionEngine();
        this.aiService = new AiService();
    }

    /**
     * Transform MetricsPayload into SignalContext
     */
    private buildContext(
        payload: MetricsPayload,
        historicalRuns: WorkflowRunRow[]
    ): SignalContext {
        return {
            currentRun: {
                runId: payload.workflow.run_id,
                workflowName: payload.workflow.name,
                status: payload.workflow.status,
                durationSeconds: payload.workflow.duration_seconds,
                jobs: payload.jobs.map(j => ({
                    name: j.name,
                    status: j.status,
                    duration_seconds: j.duration_seconds,
                })),
                commitAnalysis: payload.commit_analysis || undefined,
                testSummary: payload.test_summary || undefined,
            },
            historicalRuns: historicalRuns.map(run => ({
                runId: run.run_number,
                durationSeconds: run.duration_seconds,
                jobs: (run.jobs || []).map(j => ({
                    name: j.name,
                    status: j.status,
                    duration_seconds: j.duration_seconds,
                })),
                testSummary: run.test_summary,
                commitSha: run.commit_sha,
            })),
        };
    }

    /**
     * Extract all signals from a pipeline run
     * 
     * @param payload - The incoming metrics payload
     * @param historicalRuns - Recent historical runs for baseline comparison
     * @returns SignalBundle containing all extracted signals
     */
    async extractSignals(
        payload: MetricsPayload,
        historicalRuns: WorkflowRunRow[]
    ): Promise<SignalBundle> {
        const context = this.buildContext(payload, historicalRuns);

        // Run all processors in parallel
        const [patterns, drift, changes] = await Promise.all([
            Promise.resolve(this.patternProcessor.extract(context)),
            Promise.resolve(this.driftProcessor.extract(context)),
            Promise.resolve(this.changeProcessor.extract(context)),
        ]);

        const bundle: SignalBundle = {
            runId: payload.workflow.run_id,
            workflowName: payload.workflow.name,
            patterns,
            drift,
            changes,
            recurrences: [], // Phase 4 - Memory
            generatedAt: new Date(),
        };

        // Phase 2: Decision Engine
        // Evaluate the bundle to decide if AI should be invoked
        bundle.decision = this.decisionEngine.evaluate(bundle);

        if (bundle.decision.shouldInvokeLLM) {
            console.log(`[PulseAI] Decision: INVOKE LLM (Priority: ${bundle.decision.priority})`);
            console.log(`[PulseAI] Reason: ${bundle.decision.reason}`);

            // Phase 3: Agentic RCA
            const analysis = await this.aiService.analyzeFailure(bundle);
            if (analysis) {
                console.log(`[PulseAI] Agent Analysis Complete: ${analysis.summary}`);
                bundle.aiAnalysis = analysis;
            }
        } else {
            console.log(`[PulseAI] Decision: SKIP LLM (Priority: ${bundle.decision.priority})`);
        }

        return bundle;
    }
}
