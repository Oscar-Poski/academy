import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UnlocksController } from './unlocks.controller';
import { UnlocksService } from './unlocks.service';

@Module({
  imports: [AuthModule],
  controllers: [UnlocksController],
  providers: [UnlocksService],
  exports: [UnlocksService]
})
export class UnlocksModule {}
