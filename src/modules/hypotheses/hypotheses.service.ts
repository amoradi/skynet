import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Hypothesis,
  HypothesisStatus,
  TestType,
} from '../../entities/hypothesis.entity';
import {
  AppEvents,
  AnalysisRequestedPayload,
  HypothesisTestedPayload,
} from '../../common/events';

@Injectable()
export class HypothesesService {
  constructor(
    @InjectRepository(Hypothesis)
    private hypothesesRepository: Repository<Hypothesis>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(data: Partial<Hypothesis>): Promise<Hypothesis> {
    const hypothesis = this.hypothesesRepository.create(data);
    const saved = await this.hypothesesRepository.save(hypothesis);

    this.eventEmitter.emit(AppEvents.HYPOTHESIS_CREATED, {
      hypothesisId: saved.id,
      eventType: saved.eventType,
      marketAsset: saved.marketAsset,
    });

    return saved;
  }

  async findAll(status?: HypothesisStatus): Promise<Hypothesis[]> {
    const where = status ? { status } : {};
    return this.hypothesesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findPending(): Promise<Hypothesis[]> {
    return this.hypothesesRepository.find({
      where: { status: HypothesisStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Hypothesis | null> {
    return this.hypothesesRepository.findOne({ where: { id } });
  }

  async queueForTesting(id: string): Promise<Hypothesis | null> {
    const hypothesis = await this.findOne(id);
    if (!hypothesis) return null;

    await this.hypothesesRepository.update(id, {
      status: HypothesisStatus.RUNNING,
    });

    // Emit analysis request for Python worker
    const payload: AnalysisRequestedPayload = {
      hypothesisId: id,
      eventType: hypothesis.eventType,
      marketAsset: hypothesis.marketAsset,
      testType: hypothesis.testType,
    };
    this.eventEmitter.emit(AppEvents.ANALYSIS_REQUESTED, payload);

    return this.findOne(id);
  }

  async updateResults(
    id: string,
    results: {
      pValue: number;
      hitRate: number;
      edge: number;
      sampleSize: number;
      testResults?: Record<string, any>;
    },
  ): Promise<Hypothesis | null> {
    await this.hypothesesRepository.update(id, {
      status: HypothesisStatus.COMPLETED,
      pValue: results.pValue,
      hitRate: results.hitRate,
      edge: results.edge,
      sampleSize: results.sampleSize,
      testResults: results.testResults,
      testedAt: new Date(),
    });

    const payload: HypothesisTestedPayload = {
      hypothesisId: id,
      status: 'completed',
      pValue: results.pValue,
      hitRate: results.hitRate,
    };
    this.eventEmitter.emit(AppEvents.HYPOTHESIS_TESTED, payload);

    return this.findOne(id);
  }

  async markFailed(id: string, errorMessage: string): Promise<Hypothesis | null> {
    await this.hypothesesRepository.update(id, {
      status: HypothesisStatus.FAILED,
      errorMessage,
      testedAt: new Date(),
    });

    const payload: HypothesisTestedPayload = {
      hypothesisId: id,
      status: 'failed',
    };
    this.eventEmitter.emit(AppEvents.HYPOTHESIS_TESTED, payload);

    return this.findOne(id);
  }

  async getStats(): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    significant: number;
  }> {
    const all = await this.hypothesesRepository.find();

    return {
      total: all.length,
      pending: all.filter((h) => h.status === HypothesisStatus.PENDING).length,
      running: all.filter((h) => h.status === HypothesisStatus.RUNNING).length,
      completed: all.filter((h) => h.status === HypothesisStatus.COMPLETED)
        .length,
      failed: all.filter((h) => h.status === HypothesisStatus.FAILED).length,
      significant: all.filter(
        (h) =>
          h.status === HypothesisStatus.COMPLETED &&
          h.pValue !== null &&
          Number(h.pValue) < 0.05,
      ).length,
    };
  }

  // Generate common hypotheses for testing
  async generateCommonHypotheses(): Promise<Hypothesis[]> {
    const commonTests = [
      {
        hypothesis: 'Insider buying clusters predict stock outperformance',
        nullHypothesis:
          'Insider buying has no predictive value for future returns',
        eventType: 'insider_buy',
        marketAsset: 'equity_sector',
        testType: TestType.EVENT_STUDY,
      },
      {
        hypothesis: 'VIX spikes above 25 predict increased equity volatility',
        nullHypothesis: 'VIX level has no predictive value for future volatility',
        eventType: 'vix_spike',
        marketAsset: 'SPY',
        testType: TestType.GRANGER_CAUSALITY,
      },
      {
        hypothesis:
          'Geopolitical conflict events predict oil price volatility',
        nullHypothesis:
          'Conflict events have no effect on oil price volatility',
        eventType: 'conflict',
        marketAsset: 'WTI',
        testType: TestType.EVENT_STUDY,
      },
      {
        hypothesis: 'Fed speech sentiment predicts treasury yield movements',
        nullHypothesis:
          'Fed speech sentiment has no predictive value for yields',
        eventType: 'fed_speech',
        marketAsset: 'TLT',
        testType: TestType.CORRELATION,
      },
      {
        hypothesis:
          'Prediction market probability shifts lead equity sector moves',
        nullHypothesis:
          'Prediction markets do not lead equity price movements',
        eventType: 'polymarket_shift',
        marketAsset: 'sector_etf',
        testType: TestType.GRANGER_CAUSALITY,
      },
    ];

    const hypotheses: Hypothesis[] = [];
    for (const test of commonTests) {
      const existing = await this.hypothesesRepository.findOne({
        where: {
          eventType: test.eventType,
          marketAsset: test.marketAsset,
          testType: test.testType,
        },
      });

      if (!existing) {
        const created = await this.create({
          ...test,
          aiGenerated: false,
        });
        hypotheses.push(created);
      }
    }

    return hypotheses;
  }
}
