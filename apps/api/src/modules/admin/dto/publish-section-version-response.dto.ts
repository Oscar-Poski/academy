export interface PublishSectionVersionResponseDto {
  sectionId: string;
  versionId: string;
  versionNumber: number;
  status: 'published';
  publishedAt: Date;
  archivedVersionIds: string[];
}

