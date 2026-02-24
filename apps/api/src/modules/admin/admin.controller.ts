import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import type { ImportContentRequestDto, ImportContentResponseDto } from './dto';
import { AdminService } from './admin.service';

@Controller('v1/admin')
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

  @Post('content/import')
  @HttpCode(200)
  importContent(@Body() body: ImportContentRequestDto): Promise<ImportContentResponseDto> {
    return this.adminService.importContent(body);
  }
}
