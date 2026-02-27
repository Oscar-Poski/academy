import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UnlocksModule } from '../unlocks/unlocks.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuthModule, UnlocksModule],
  controllers: [ContentController],
  providers: [ContentService]
})
export class ContentModule {}
