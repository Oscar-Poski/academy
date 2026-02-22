import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ContentModule } from './modules/content/content.module';
import { ProgressModule } from './modules/progress/progress.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ContentModule, ProgressModule],
  controllers: [HealthController]
})
export class AppModule {}
