import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UnlocksModule } from '../unlocks/unlocks.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [AuthModule, UnlocksModule, GamificationModule],
  controllers: [ProgressController],
  providers: [ProgressService]
})
export class ProgressModule {}
