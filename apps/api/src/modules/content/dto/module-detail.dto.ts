import type { ContentLockMetadataDto } from './lock-metadata.dto';

export interface ModuleDetailSectionDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  lock?: ContentLockMetadataDto;
}

export interface ModuleDetailDto {
  id: string;
  pathId: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  sections: ModuleDetailSectionDto[];
  lock?: ContentLockMetadataDto;
}
