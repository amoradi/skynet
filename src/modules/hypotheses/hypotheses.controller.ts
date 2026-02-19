import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HypothesesService } from './hypotheses.service';
import { Hypothesis, HypothesisStatus } from '../../entities/hypothesis.entity';

@Controller('hypotheses')
export class HypothesesController {
  constructor(private readonly hypothesesService: HypothesesService) {}

  @Post()
  async create(@Body() data: Partial<Hypothesis>): Promise<Hypothesis> {
    return this.hypothesesService.create(data);
  }

  @Get()
  async findAll(@Query('status') status?: HypothesisStatus): Promise<Hypothesis[]> {
    return this.hypothesesService.findAll(status);
  }

  @Get('pending')
  async findPending(): Promise<Hypothesis[]> {
    return this.hypothesesService.findPending();
  }

  @Get('stats')
  async getStats() {
    return this.hypothesesService.getStats();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Hypothesis | null> {
    return this.hypothesesService.findOne(id);
  }

  @Post(':id/test')
  async queueForTesting(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Hypothesis | null> {
    return this.hypothesesService.queueForTesting(id);
  }

  @Post(':id/results')
  async updateResults(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    results: {
      pValue: number;
      hitRate: number;
      edge: number;
      sampleSize: number;
      testResults?: Record<string, any>;
    },
  ): Promise<Hypothesis | null> {
    return this.hypothesesService.updateResults(id, results);
  }

  @Post('generate-common')
  async generateCommon(): Promise<Hypothesis[]> {
    return this.hypothesesService.generateCommonHypotheses();
  }
}
