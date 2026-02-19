import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Alert, AlertSeverity } from '../../entities/alert.entity';
import {
  AppEvents,
  AlertTriggeredPayload,
  RelationshipDiscoveredPayload,
} from '../../common/events';

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private alertsRepository: Repository<Alert>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(data: Partial<Alert>): Promise<Alert> {
    const alert = this.alertsRepository.create(data);
    const saved = await this.alertsRepository.save(alert);

    // Emit alert created event
    const payload: AlertTriggeredPayload = {
      alertId: saved.id,
      signalType: saved.signalType,
      severity: saved.severity,
      eventId: saved.eventId,
      relationshipId: saved.relationshipId,
    };
    this.eventEmitter.emit(AppEvents.ALERT_TRIGGERED, payload);

    return saved;
  }

  async findAll(filters: {
    severity?: AlertSeverity;
    signalType?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Alert[]> {
    const { severity, signalType, isRead, limit = 50, offset = 0 } = filters;

    const query = this.alertsRepository.createQueryBuilder('alert');

    if (severity) {
      query.andWhere('alert.severity = :severity', { severity });
    }
    if (signalType) {
      query.andWhere('alert.signalType = :signalType', { signalType });
    }
    if (isRead !== undefined) {
      query.andWhere('alert.isRead = :isRead', { isRead });
    }

    query
      .andWhere('alert.isDismissed = false')
      .orderBy('alert.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    return query.getMany();
  }

  async findOne(id: string): Promise<Alert | null> {
    return this.alertsRepository.findOne({
      where: { id },
      relations: ['event', 'relationship'],
    });
  }

  async markRead(id: string): Promise<Alert | null> {
    await this.alertsRepository.update(id, { isRead: true });
    return this.findOne(id);
  }

  async markDismissed(id: string): Promise<Alert | null> {
    await this.alertsRepository.update(id, { isDismissed: true });
    return this.findOne(id);
  }

  async getUnreadCount(): Promise<number> {
    return this.alertsRepository.count({
      where: { isRead: false, isDismissed: false },
    });
  }

  async getRecentBySeverity(): Promise<Record<AlertSeverity, number>> {
    const result = await this.alertsRepository
      .createQueryBuilder('alert')
      .select('alert.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where('alert.isDismissed = false')
      .andWhere("alert.createdAt > NOW() - INTERVAL '24 hours'")
      .groupBy('alert.severity')
      .getRawMany();

    const counts: Record<AlertSeverity, number> = {
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.CRITICAL]: 0,
    };

    result.forEach((r) => {
      counts[r.severity as AlertSeverity] = parseInt(r.count, 10);
    });

    return counts;
  }

  // React to new relationship discoveries
  @OnEvent(AppEvents.RELATIONSHIP_DISCOVERED)
  async handleRelationshipDiscovered(payload: RelationshipDiscoveredPayload) {
    // Auto-create alert for significant discoveries
    if (payload.pValue < 0.01 && payload.hitRate > 0.6) {
      await this.create({
        signalType: 'relationship_discovered',
        title: 'New Significant Relationship Found',
        message: `${payload.eventType} → ${payload.marketAsset}: ${(payload.hitRate * 100).toFixed(0)}% hit rate (p=${payload.pValue.toFixed(4)})`,
        severity: AlertSeverity.HIGH,
        confidence: payload.hitRate,
        relationshipId: payload.relationshipId,
        metadata: {
          eventType: payload.eventType,
          marketAsset: payload.marketAsset,
          pValue: payload.pValue,
          hitRate: payload.hitRate,
        },
      });
    }
  }
}
