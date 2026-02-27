import { Controller, Get, Headers, Inject, Param, Req, UseGuards } from '@nestjs/common';
import { OptionalBearerAuthGuard } from '../auth/optional-bearer-auth.guard';
import { resolveUserIdFromRequest } from '../auth/resolve-user-id';
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
    @Headers('x-user-id') userId: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.contentService.getPathTree(pathId, resolveUserIdFromRequest(request, userId));
  }

  @Get('modules/:moduleId')
  @UseGuards(OptionalBearerAuthGuard)
  getModule(
    @Param('moduleId') moduleId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.contentService.getModule(moduleId, resolveUserIdFromRequest(request, userId));
  }

  @Get('sections/:sectionId')
  @UseGuards(OptionalBearerAuthGuard)
  getSection(
    @Param('sectionId') sectionId: string,
    @Headers('x-user-id') userId: string | undefined,
    @Req() request: AuthenticatedRequest
  ) {
    return this.contentService.getSection(sectionId, resolveUserIdFromRequest(request, userId));
  }
}
