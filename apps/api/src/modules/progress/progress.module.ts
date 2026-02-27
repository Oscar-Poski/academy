import { Module } from '@nestjs/common';
import { UnlocksModule } from '../unlocks/unlocks.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [UnlocksModule],
  controllers: [ProgressController],
  providers: [ProgressService]
})
export class ProgressModule {}
