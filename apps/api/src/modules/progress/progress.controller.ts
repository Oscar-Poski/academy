import { Body, Controller, Get, Headers, Inject, Param, Patch, Post } from '@nestjs/common';
import type {
  ContinueLearningDto,
  ModuleProgressDto,
  PathProgressDto,
  SectionProgressDto,
  UpdateSectionPositionDto
} from './dto';
import { ProgressService } from './progress.service';

@Controller('v1/progress')
export class ProgressController {
  constructor(@Inject(ProgressService) private readonly progressService: ProgressService) {}

  @Post('sections/:sectionId/start')
  startSection(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string
  ): Promise<SectionProgressDto> {
    return this.progressService.startSection(userId, sectionId);
  }

  @Patch('sections/:sectionId/position')
  updatePosition(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: UpdateSectionPositionDto
  ): Promise<SectionProgressDto> {
    return this.progressService.updateSectionPosition(userId, sectionId, body);
  }

  @Post('sections/:sectionId/complete')
  completeSection(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string
  ): Promise<SectionProgressDto> {
    return this.progressService.completeSection(userId, sectionId);
  }

  @Get('sections/:sectionId')
  getSectionProgress(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string
  ): Promise<SectionProgressDto> {
    return this.progressService.getSectionProgress(userId, sectionId);
  }

  @Get('modules/:moduleId')
  getModuleProgress(
    @Param('moduleId') moduleId: string,
    @Headers('x-user-id') userId: string
  ): Promise<ModuleProgressDto> {
    return this.progressService.getModuleProgress(userId, moduleId);
  }

  @Get('paths/:pathId')
  getPathProgress(
    @Param('pathId') pathId: string,
    @Headers('x-user-id') userId: string
  ): Promise<PathProgressDto> {
    return this.progressService.getPathProgress(userId, pathId);
  }

  @Get('continue')
  getContinue(@Headers('x-user-id') userId: string): Promise<ContinueLearningDto> {
    return this.progressService.getContinue(userId);
  }
}
