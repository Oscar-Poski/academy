import type { ContentLockMetadataDto } from './lock-metadata.dto';

export interface PathTreeSectionDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  lock?: ContentLockMetadataDto;
}

export interface PathTreeModuleDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  sections: PathTreeSectionDto[];
  lock?: ContentLockMetadataDto;
}

export interface PathTreeDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  modules: PathTreeModuleDto[];
}
