import { Controller, Get, Headers, Inject, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('v1')
export class ContentController {
  constructor(@Inject(ContentService) private readonly contentService: ContentService) {}

  @Get('paths')
  getPaths() {
    return this.contentService.getPaths();
  }

  @Get('paths/:pathId')
  getPath(@Param('pathId') pathId: string, @Headers('x-user-id') userId?: string) {
    return this.contentService.getPathTree(pathId, userId);
  }

  @Get('modules/:moduleId')
  getModule(@Param('moduleId') moduleId: string, @Headers('x-user-id') userId?: string) {
    return this.contentService.getModule(moduleId, userId);
  }

  @Get('sections/:sectionId')
  getSection(@Param('sectionId') sectionId: string, @Headers('x-user-id') userId?: string) {
    return this.contentService.getSection(sectionId, userId);
  }
}
