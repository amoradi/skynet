// Common event types for loose coupling between modules

export const AppEvents = {
  // Event ingestion
  EVENT_CREATED: 'event.created',
  EVENT_BATCH_CREATED: 'event.batch.created',

  // Market data
  MARKET_DATA_CREATED: 'market_data.created',

  // Relationships
  RELATIONSHIP_DISCOVERED: 'relationship.discovered',
  RELATIONSHIP_VALIDATED: 'relationship.validated',

  // Hypotheses
  HYPOTHESIS_CREATED: 'hypothesis.created',
  HYPOTHESIS_TESTED: 'hypothesis.tested',

  // Alerts
  ALERT_CREATED: 'alert.created',
  ALERT_TRIGGERED: 'alert.triggered',

  // Analysis
  ANALYSIS_REQUESTED: 'analysis.requested',
  ANALYSIS_COMPLETED: 'analysis.completed',
} as const;

export type AppEventType = (typeof AppEvents)[keyof typeof AppEvents];

// Event payloads
export interface EventCreatedPayload {
  eventId: string;
  source: string;
  eventType: string;
  entity?: string;
  timestamp: Date;
}

export interface EventBatchCreatedPayload {
  count: number;
  source: string;
  eventIds: string[];
}

export interface RelationshipDiscoveredPayload {
  relationshipId: string;
  eventType: string;
  marketAsset: string;
  pValue: number;
  hitRate: number;
}

export interface HypothesisTestedPayload {
  hypothesisId: string;
  status: 'completed' | 'failed';
  pValue?: number;
  hitRate?: number;
}

export interface AlertTriggeredPayload {
  alertId: string;
  signalType: string;
  severity: string;
  eventId?: string;
  relationshipId?: string;
}

export interface AnalysisRequestedPayload {
  hypothesisId: string;
  eventType: string;
  marketAsset: string;
  testType: string;
}

export interface AnalysisCompletedPayload {
  hypothesisId: string;
  success: boolean;
  results?: Record<string, any>;
  error?: string;
}
