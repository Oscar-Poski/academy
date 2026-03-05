import { Body, Controller, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AdminBearerAuthGuard } from '../auth/admin-bearer-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type {
  ContentSectionCatalogItemDto,
  ImportContentRequestDto,
  ImportContentResponseDto,
  PublishSectionVersionResponseDto,
  SectionVersionDetailDto,
  SectionVersionSummaryDto,
  SlugPublishRequestDto
} from './dto';
import { AdminService } from './admin.service';

@Controller('v1/admin')
@UseGuards(AdminBearerAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Post('content/import')
  @HttpCode(200)
  importContent(@Body() body: ImportContentRequestDto): Promise<ImportContentResponseDto> {
    return this.adminService.importContent(body);
  }

  @Get('content/sections')
  listContentSections(): Promise<ContentSectionCatalogItemDto[]> {
    return this.adminService.listContentSections();
  }

  @Get('content/sections/:sectionSlug/versions')
  listSectionVersionsBySlug(
    @Param('sectionSlug') sectionSlug: string
  ): Promise<SectionVersionSummaryDto[]> {
    return this.adminService.listSectionVersionsBySlug(sectionSlug);
  }

  @Post('content/publish')
  @HttpCode(200)
  publishSectionVersionBySlug(
    @Body() body: SlugPublishRequestDto
  ): Promise<PublishSectionVersionResponseDto> {
    return this.adminService.publishSectionVersionBySlug(body);
  }

  @Get('sections/:sectionId/versions')
  listSectionVersions(@Param('sectionId') sectionId: string): Promise<SectionVersionSummaryDto[]> {
    return this.adminService.listSectionVersions(sectionId);
  }

  @Get('sections/:sectionId/versions/:versionId')
  getSectionVersion(
    @Param('sectionId') sectionId: string,
    @Param('versionId') versionId: string
  ): Promise<SectionVersionDetailDto> {
    return this.adminService.getSectionVersion(sectionId, versionId);
  }

  @Post('sections/:sectionId/publish/:versionId')
  @HttpCode(200)
  publishSectionVersion(
    @Param('sectionId') sectionId: string,
    @Param('versionId') versionId: string
  ): Promise<PublishSectionVersionResponseDto> {
    return this.adminService.publishSectionVersion(sectionId, versionId);
  }
}
