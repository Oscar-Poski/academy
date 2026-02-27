import { Module } from '@nestjs/common';
import { GamificationModule } from '../gamification/gamification.module';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  imports: [GamificationModule],
  controllers: [QuizController],
  providers: [QuizService]
})
export class QuizModule {}
