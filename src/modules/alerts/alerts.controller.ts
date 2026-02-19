import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { Alert, AlertSeverity } from '../../entities/alert.entity';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  async create(@Body() data: Partial<Alert>): Promise<Alert> {
    return this.alertsService.create(data);
  }

  @Get()
  async findAll(
    @Query('severity') severity?: AlertSeverity,
    @Query('signalType') signalType?: string,
    @Query('isRead') isRead?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<Alert[]> {
    return this.alertsService.findAll({
      severity,
      signalType,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('unread-count')
  async getUnreadCount(): Promise<{ count: number }> {
    const count = await this.alertsService.getUnreadCount();
    return { count };
  }

  @Get('by-severity')
  async getBySeverity(): Promise<Record<AlertSeverity, number>> {
    return this.alertsService.getRecentBySeverity();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Alert | null> {
    return this.alertsService.findOne(id);
  }

  @Patch(':id/read')
  async markRead(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Alert | null> {
    return this.alertsService.markRead(id);
  }

  @Patch(':id/dismiss')
  async markDismissed(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Alert | null> {
    return this.alertsService.markDismissed(id);
  }
}
