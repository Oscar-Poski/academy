import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ObservabilityService } from './observability.service';
import { RequestLoggingMiddleware } from './request-logging.middleware';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [ObservabilityService, RequestLoggingMiddleware],
  exports: [ObservabilityService]
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
