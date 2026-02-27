import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { BearerAuthGuard } from '../auth/bearer-auth.guard';
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
  @UseGuards(BearerAuthGuard)
  startSection(
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.startSection(request.user!.sub, sectionId);
  }

  @Patch('sections/:sectionId/position')
  @UseGuards(BearerAuthGuard)
  updatePosition(
    @Param('sectionId') sectionId: string,
    @Body() body: UpdateSectionPositionDto,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.updateSectionPosition(request.user!.sub, sectionId, body);
  }

  @Post('sections/:sectionId/complete')
  @UseGuards(BearerAuthGuard)
  completeSection(
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.completeSection(request.user!.sub, sectionId);
  }

  @Get('sections/:sectionId')
  @UseGuards(BearerAuthGuard)
  getSectionProgress(
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.getSectionProgress(request.user!.sub, sectionId);
  }

  @Get('modules/:moduleId')
  @UseGuards(BearerAuthGuard)
  getModuleProgress(
    @Param('moduleId') moduleId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<ModuleProgressDto> {
    return this.progressService.getModuleProgress(request.user!.sub, moduleId);
  }

  @Get('paths/:pathId')
  @UseGuards(BearerAuthGuard)
  getPathProgress(
    @Param('pathId') pathId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<PathProgressDto> {
    return this.progressService.getPathProgress(request.user!.sub, pathId);
  }

  @Get('continue')
  @UseGuards(BearerAuthGuard)
  getContinue(@Req() request: AuthenticatedRequest): Promise<ContinueLearningDto> {
    return this.progressService.getContinue(request.user!.sub);
  }
}
