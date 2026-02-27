import { Controller, Get, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { OptionalBearerAuthGuard } from '../auth/optional-bearer-auth.guard';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { ContentService } from './content.service';

@Controller('v1')
export class ContentController {
  constructor(@Inject(ContentService) private readonly contentService: ContentService) {}

  @Get('paths')
  getPaths() {
    return this.contentService.getPaths();
  }

  @Get('paths/:pathId')
  @UseGuards(OptionalBearerAuthGuard)
  getPath(
    @Param('pathId') pathId: string,
    @Req() request: AuthenticatedRequest
  ) {
    return this.contentService.getPathTree(pathId, request.user?.sub);
  }

  @Get('modules/:moduleId')
  @UseGuards(OptionalBearerAuthGuard)
  getModule(
    @Param('moduleId') moduleId: string,
    @Req() request: AuthenticatedRequest
  ) {
    return this.contentService.getModule(moduleId, request.user?.sub);
  }

  @Get('sections/:sectionId')
  @UseGuards(OptionalBearerAuthGuard)
  getSection(
    @Param('sectionId') sectionId: string,
    @Req() request: AuthenticatedRequest
  ) {
    return this.contentService.getSection(sectionId, request.user?.sub);
  }
}
