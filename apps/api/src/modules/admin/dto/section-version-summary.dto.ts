import { SectionVersionStatus } from '@prisma/client';

export interface SectionVersionSummaryDto {
  id: string;
  sectionId: string;
  versionNumber: number;
  status: SectionVersionStatus;
  changeLog: string | null;
  createdBy: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  blockCount: number;
}

