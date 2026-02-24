import {
  applyParsedContentReport,
  createDryRunApplyReport,
  parseContentBundle,
  type ContentImportApplyReport
} from '@academy/content-importer';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import path from 'node:path';
import type { ImportContentRequestDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async importContent(body: ImportContentRequestDto): Promise<ContentImportApplyReport> {
    const bundlePath = this.validateBundlePath(body?.bundle_path);
    const mode = this.validateMode(body?.mode);
    this.assertWithinConfiguredImportRoot(bundlePath);

    try {
      const parseReport = await parseContentBundle(bundlePath);

      if (mode === 'dryRun') {
        return createDryRunApplyReport(parseReport);
      }

      return applyParsedContentReport(parseReport, { prisma: this.prisma });
    } catch (error) {
      if (this.isPathAccessError(error)) {
        throw new BadRequestException(`bundle_path is not readable: ${bundlePath}`);
      }

      throw error;
    }
  }

  private validateBundlePath(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('bundle_path is required');
    }

    return path.resolve(value.trim());
  }

  private validateMode(value: unknown): 'dryRun' | 'apply' {
    if (value !== 'dryRun' && value !== 'apply') {
      throw new BadRequestException('mode must be "dryRun" or "apply"');
    }

    return value;
  }

  private assertWithinConfiguredImportRoot(bundlePath: string): void {
    const configuredRoot = process.env.CONTENT_IMPORT_ROOT?.trim();
    if (!configuredRoot) {
      return;
    }

    const resolvedRoot = path.resolve(configuredRoot);
    const relative = path.relative(resolvedRoot, bundlePath);
    const isOutside =
      relative === '' ? false : relative.startsWith('..') || path.isAbsolute(relative);

    if (isOutside) {
      throw new BadRequestException('bundle_path is outside CONTENT_IMPORT_ROOT');
    }
  }

  private isPathAccessError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: unknown }).code;
    return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EACCES' || code === 'EPERM';
  }
}

