import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Hypothesis } from '../../entities/hypothesis.entity';
import { HypothesesService } from './hypotheses.service';
import { HypothesesController } from './hypotheses.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Hypothesis])],
  controllers: [HypothesesController],
  providers: [HypothesesService],
  exports: [HypothesesService],
})
export class HypothesesModule {}
