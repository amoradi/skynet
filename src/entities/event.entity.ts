import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum EventSource {
  EDGAR = 'edgar',
  FRED = 'fred',
  GDELT = 'gdelt',
  ACLED = 'acled',
  POLYMARKET = 'polymarket',
  EIA = 'eia',
}

@Entity('events')
@Index(['source', 'eventType', 'timestamp'])
@Index(['entity', 'timestamp'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'enum', enum: EventSource })
  source: EventSource;

  @Column({ name: 'event_type' })
  eventType: string; // 'insider_buy', 'cpi_release', 'conflict', etc.

  @Column({ nullable: true })
  entity: string; // ticker, country, indicator

  @Column({ type: 'decimal', nullable: true })
  value: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  summary: string; // AI-generated summary

  @Column({ type: 'decimal', nullable: true })
  sentiment: number; // -1 to 1

  @Column({ type: 'vector', nullable: true })
  embedding: number[]; // For RAG/similarity search

  @CreateDateColumn({ name: 'ingested_at' })
  ingestedAt: Date;
}
