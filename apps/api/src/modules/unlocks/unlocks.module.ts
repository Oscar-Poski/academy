import { Module } from '@nestjs/common';
import { UnlocksService } from './unlocks.service';

@Module({
  providers: [UnlocksService]
})
export class UnlocksModule {}
