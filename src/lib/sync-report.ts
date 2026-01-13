export interface SyncReportData {
  timestamp: string;
  rows_read: number;
  rows_imported: number;
  rows_skipped: number;
  skipped_breakdown: {
    inactive: number;
    not_distribution: number;
    missing_fields: number;
    duplicate_listing_id: number;
  };
  skipped_details: Array<{ row: number; reason: string }>;
  missing_headers: string[];
  success: boolean;
  error_message?: string;
}
