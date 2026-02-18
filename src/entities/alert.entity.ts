import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Relationship } from './relationship.entity';

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('alerts')
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'signal_type' })
  signalType: string; // 'pattern_match', 'anomaly', 'threshold', etc.

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.MEDIUM })
  severity: AlertSeverity;

  @Column({ type: 'decimal', nullable: true })
  confidence: number; // 0-1

  // Links to source event
  @Column({ nullable: true, name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event: Event;

  // Links to matched relationship/pattern
  @Column({ nullable: true, name: 'relationship_id' })
  relationshipId: string;

  @ManyToOne(() => Relationship, { nullable: true })
  @JoinColumn({ name: 'relationship_id' })
  relationship: Relationship;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // AI-generated context
  @Column({ type: 'text', nullable: true, name: 'ai_analysis' })
  aiAnalysis: string;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;

  @Column({ default: false, name: 'is_dismissed' })
  isDismissed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
