import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ContentModule } from './modules/content/content.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, ContentModule],
  controllers: [HealthController]
})
export class AppModule {}
