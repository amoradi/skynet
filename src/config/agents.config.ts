export interface AgentConfig {
  llm: {
    provider: 'openai' | 'anthropic';
    model: string;
    temperature: number;
    maxTokens: number;
  };
  research: {
    batchSize: number;
    retryAttempts: number;
    timeoutMs: number;
  };
  analysis: {
    hypothesisLimit: number;
    minConfidence: number;
    lookbackDays: number;
  };
  alert: {
    scanIntervalMs: number;
    minHitRate: number;
    minConfidence: number;
  };
}

export const agentsConfig = (): AgentConfig => ({
  llm: {
    provider: (process.env.LLM_PROVIDER as 'openai' | 'anthropic') || 'openai',
    model: process.env.LLM_MODEL || 'gpt-4o',
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.1,
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS, 10) || 4096,
  },
  research: {
    batchSize: parseInt(process.env.RESEARCH_BATCH_SIZE, 10) || 10,
    retryAttempts: parseInt(process.env.RESEARCH_RETRY_ATTEMPTS, 10) || 3,
    timeoutMs: parseInt(process.env.RESEARCH_TIMEOUT_MS, 10) || 30000,
  },
  analysis: {
    hypothesisLimit: parseInt(process.env.ANALYSIS_HYPOTHESIS_LIMIT, 10) || 50,
    minConfidence: parseFloat(process.env.ANALYSIS_MIN_CONFIDENCE) || 0.6,
    lookbackDays: parseInt(process.env.ANALYSIS_LOOKBACK_DAYS, 10) || 365,
  },
  alert: {
    scanIntervalMs: parseInt(process.env.ALERT_SCAN_INTERVAL_MS, 10) || 60000,
    minHitRate: parseFloat(process.env.ALERT_MIN_HIT_RATE) || 0.5,
    minConfidence: parseFloat(process.env.ALERT_MIN_CONFIDENCE) || 0.7,
  },
});
