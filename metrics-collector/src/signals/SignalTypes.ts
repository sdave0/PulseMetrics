/**
 * Signal Type Definitions
 * 
 * These types define the structured output of the Signal Extraction Layer.
 * Each signal represents a specific piece of intelligence extracted from CI/CD data.
 */

/**
 * Base signal interface - all signals extend this
 */
export interface Signal {
  type: 'pattern' | 'drift' | 'change' | 'recurrence' | 'decision' | 'ai_analysis';
  name: string;
  confidence: number; // 0.0 to 1.0
  timestamp: Date;
}

/**
 * Pattern Signal - Failure classifications and job categorization
 */
export interface PatternSignal extends Signal {
  type: 'pattern';
  category: 'test' | 'build' | 'lint' | 'deploy' | 'dependency' | 'unknown';
  failureType?: 'timeout' | 'oom' | 'flaky' | 'dependency' | 'unknown';
  jobName: string;
  status: string | null;
}

/**
 * Drift Signal - Performance regressions and anomalies
 */
export interface DriftSignal extends Signal {
  type: 'drift';
  metric: 'duration' | 'job_duration';
  currentValue: number;
  baselineValue: number;
  percentChange: number;
  isAnomaly: boolean;
  jobName?: string; // Present for job-level drift
}

/**
 * Change Signal - Commit analysis and code churn
 */
export interface ChangeSignal extends Signal {
  type: 'change';
  changeType: 'lockfile' | 'test_count' | 'code_churn';
  description: string;
  impact: 'low' | 'medium' | 'high';
  metadata: {
    filesChanged?: number;
    testCountDelta?: number;
    lockfileChanged?: boolean;
  };
}

/**
 * Recurrence Signal - Historical pattern matches
 * (Placeholder for Phase 4 - Memory)
 */
export interface RecurrenceSignal extends Signal {
  type: 'recurrence';
  signatureHash: string;
  timesSeen: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

/**
 * Signal Bundle - Aggregated output from all processors
 */
export interface SignalBundle {
  runId: number;
  workflowName: string;
  patterns: PatternSignal[];
  drift: DriftSignal[];
  changes: ChangeSignal[];
  recurrences: any[]; // Placeholder for Phase 4
  decision?: Decision; // Added in Phase 2
  aiAnalysis?: AiAnalysisResult; // Added in Phase 3
  generatedAt: Date;
}

/**
 * Signal Processor Context - Input data for processors
 */
export interface SignalContext {
  currentRun: {
    runId: number;
    workflowName: string;
    status: string | null;
    durationSeconds: number | null;
    jobs: Array<{
      name: string;
      status: string | null;
      duration_seconds: number | null;
    }>;
    commitAnalysis?: {
      total_files: number;
      lockfile_changed: boolean;
      test_files_count: number;
      src_files_count: number;
    };
    testSummary?: {
      passed: number;
      failed: number;
      total: number;
    };
  };
  historicalRuns: Array<{
    runId: number;
    durationSeconds: number | null;
    jobs: Array<{
      name: string;
      status: string | null;
      duration_seconds: number | null;
    }>;
    testSummary?: {
      total: number;
    };
    commitSha?: string;
  }>;
}

/**
 * Decision - Output from Decision Engine
 */
export interface Decision {
  shouldInvokeLLM: boolean;
  reason: string;
  priority: number; // 0-100
  context: string[]; // List of signal names that triggered this decision
}

/**
 * AI Analysis Result - Structured output from LLM
 */
export interface AiAnalysisResult {
  root_cause: string;
  confidence: 'high' | 'medium' | 'low';
  remediation: string;
  relevant_files: string[];
  summary: string;
}