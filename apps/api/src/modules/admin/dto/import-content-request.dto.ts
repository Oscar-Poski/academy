export interface ImportContentRequestDto {
  bundle_path: string;
  mode: 'dryRun' | 'apply';
}

