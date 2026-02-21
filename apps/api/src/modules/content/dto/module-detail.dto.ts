export interface ModuleDetailSectionDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
}

export interface ModuleDetailDto {
  id: string;
  pathId: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  sections: ModuleDetailSectionDto[];
}
