export interface PathTreeSectionDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
}

export interface PathTreeModuleDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  sections: PathTreeSectionDto[];
}

export interface PathTreeDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  modules: PathTreeModuleDto[];
}
