import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { ContentModule } from './modules/content/content.module';
import { ProgressModule } from './modules/progress/progress.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ContentModule, ProgressModule, AnalyticsModule, AdminModule],
  controllers: [HealthController]
})
export class AppModule {}
