import { Module } from '@nestjs/common';
import { UnlocksModule } from '../unlocks/unlocks.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [UnlocksModule],
  controllers: [ContentController],
  providers: [ContentService]
})
export class ContentModule {}
