import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

@Entity('market_data')
@Index(['asset', 'timestamp'])
export class MarketData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column()
  asset: string; // 'BTC/USD', 'AAPL', 'SPY', etc.

  @Column({ type: 'decimal' })
  price: number;

  @Column({ type: 'decimal', nullable: true })
  open: number;

  @Column({ type: 'decimal', nullable: true })
  high: number;

  @Column({ type: 'decimal', nullable: true })
  low: number;

  @Column({ type: 'decimal', nullable: true })
  close: number;

  @Column({ type: 'decimal', nullable: true })
  volume: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}
