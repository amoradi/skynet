import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('relationships')
export class Relationship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_type' })
  eventType: string; // 'vix_spike', 'insider_buy', etc.

  @Column({ name: 'market_asset' })
  marketAsset: string; // 'SPY', 'BTC', etc.

  @Column({ type: 'decimal', name: 'hit_rate' })
  hitRate: number; // 0-1

  @Column({ type: 'decimal' })
  edge: number; // Expected return in basis points

  @Column({ type: 'decimal', name: 'p_value' })
  pValue: number;

  @Column({ name: 'sample_size' })
  sampleSize: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // test details, confidence intervals, etc.

  @Column({ default: true, name: 'is_significant' })
  isSignificant: boolean; // After Bonferroni correction

  @CreateDateColumn({ name: 'discovered_at' })
  discoveredAt: Date;

  @UpdateDateColumn({ name: 'validated_at' })
  validatedAt: Date;
}
