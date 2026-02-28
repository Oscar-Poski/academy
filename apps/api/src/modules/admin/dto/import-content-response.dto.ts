import type { ContentImportApplyReport } from '@academy/content-importer';

export interface ImportValidationSummaryBucketDto {
  code: string;
  count: number;
}

export interface ImportValidationSummaryDto {
  errorCount: number;
  warningCount: number;
  errorsByCode: ImportValidationSummaryBucketDto[];
  warningsByCode: ImportValidationSummaryBucketDto[];
}

export type ImportContentResponseDto = ContentImportApplyReport & {
  validationSummary: ImportValidationSummaryDto;
};
