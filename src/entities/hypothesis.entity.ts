import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum HypothesisStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum TestType {
  CORRELATION = 'correlation',
  GRANGER_CAUSALITY = 'granger_causality',
  EVENT_STUDY = 'event_study',
  PERMUTATION = 'permutation',
}

@Entity('hypotheses')
export class Hypothesis {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  hypothesis: string; // "VIX spikes > 20% predict equity volatility within 5 days"

  @Column({ type: 'text', name: 'null_hypothesis' })
  nullHypothesis: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'market_asset' })
  marketAsset: string;

  @Column({ type: 'enum', enum: TestType, name: 'test_type' })
  testType: TestType;

  @Column({ name: 'lookback_days', default: 365 })
  lookbackDays: number;

  @Column({ type: 'enum', enum: HypothesisStatus, default: HypothesisStatus.PENDING })
  status: HypothesisStatus;

  // Results (populated after test runs)
  @Column({ type: 'decimal', nullable: true, name: 'p_value' })
  pValue: number;

  @Column({ type: 'decimal', nullable: true, name: 'hit_rate' })
  hitRate: number;

  @Column({ type: 'decimal', nullable: true })
  edge: number;

  @Column({ nullable: true, name: 'sample_size' })
  sampleSize: number;

  @Column({ type: 'jsonb', nullable: true, name: 'test_results' })
  testResults: Record<string, any>;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  // AI-generated
  @Column({ default: false, name: 'ai_generated' })
  aiGenerated: boolean;

  @Column({ type: 'decimal', nullable: true, name: 'ai_confidence' })
  aiConfidence: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'tested_at' })
  testedAt: Date;
}
