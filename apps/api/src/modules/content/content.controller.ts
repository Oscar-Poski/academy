import { Controller, Get, Inject, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('v1')
export class ContentController {
  constructor(@Inject(ContentService) private readonly contentService: ContentService) {}

  @Get('paths')
  getPaths() {
    return this.contentService.getPaths();
  }

  @Get('paths/:pathId')
  getPath(@Param('pathId') pathId: string) {
    return this.contentService.getPathTree(pathId);
  }

  @Get('modules/:moduleId')
  getModule(@Param('moduleId') moduleId: string) {
    return this.contentService.getModule(moduleId);
  }

  @Get('sections/:sectionId')
  getSection(@Param('sectionId') sectionId: string) {
    return this.contentService.getSection(sectionId);
  }
}
