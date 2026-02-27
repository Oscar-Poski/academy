import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { OptionalBearerAuthGuard } from '../auth/optional-bearer-auth.guard';
import { resolveUserIdFromRequest } from '../auth/resolve-user-id';
import type { AuthenticatedRequest } from '../auth/auth.types';
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
  @UseGuards(OptionalBearerAuthGuard)
  startSection(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.startSection(resolveUserIdFromRequest(request, userId) ?? '', sectionId);
  }

  @Patch('sections/:sectionId/position')
  @UseGuards(OptionalBearerAuthGuard)
  updatePosition(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: UpdateSectionPositionDto,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.updateSectionPosition(
      resolveUserIdFromRequest(request, userId) ?? '',
      sectionId,
      body
    );
  }

  @Post('sections/:sectionId/complete')
  @UseGuards(OptionalBearerAuthGuard)
  completeSection(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.completeSection(resolveUserIdFromRequest(request, userId) ?? '', sectionId);
  }

  @Get('sections/:sectionId')
  @UseGuards(OptionalBearerAuthGuard)
  getSectionProgress(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<SectionProgressDto> {
    return this.progressService.getSectionProgress(resolveUserIdFromRequest(request, userId) ?? '', sectionId);
  }

  @Get('modules/:moduleId')
  @UseGuards(OptionalBearerAuthGuard)
  getModuleProgress(
    @Param('moduleId') moduleId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<ModuleProgressDto> {
    return this.progressService.getModuleProgress(resolveUserIdFromRequest(request, userId) ?? '', moduleId);
  }

  @Get('paths/:pathId')
  @UseGuards(OptionalBearerAuthGuard)
  getPathProgress(
    @Param('pathId') pathId: string,
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<PathProgressDto> {
    return this.progressService.getPathProgress(resolveUserIdFromRequest(request, userId) ?? '', pathId);
  }

  @Get('continue')
  @UseGuards(OptionalBearerAuthGuard)
  getContinue(
    @Headers('x-user-id') userId: string,
    @Req() request: AuthenticatedRequest
  ): Promise<ContinueLearningDto> {
    return this.progressService.getContinue(resolveUserIdFromRequest(request, userId) ?? '');
  }
}
