import { Module } from '@nestjs/common';
import { UnlocksController } from './unlocks.controller';
import { UnlocksService } from './unlocks.service';

@Module({
  controllers: [UnlocksController],
  providers: [UnlocksService],
  exports: [UnlocksService]
})
export class UnlocksModule {}
