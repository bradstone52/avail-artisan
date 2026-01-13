import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileSpreadsheet,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

interface SyncReportSummaryProps {
  report: SyncReportData | null;
  className?: string;
}

export function SyncReportSummary({ report, className }: SyncReportSummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (!report) {
    return null;
  }

  const formattedTime = format(new Date(report.timestamp), 'MMM d, yyyy h:mm a');

  return (
    <div className={cn(
      "bg-card border-2 border-ink rounded-xl p-5 animate-fade-in",
      className
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          report.success ? "bg-green-100" : "bg-red-100"
        )}>
          {report.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
        </div>
        <div>
          <h4 className="font-display font-semibold text-sm">
            {report.success ? 'Sync Complete' : 'Sync Failed'}
          </h4>
          <p className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formattedTime}
          </p>
        </div>
      </div>

      {report.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{report.error_message}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-paper border border-ink/10 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-ink">{report.rows_read}</div>
          <div className="text-xs text-muted">Rows Read</div>
        </div>
        <div className="bg-blue/10 border border-blue/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-blue">{report.rows_imported}</div>
          <div className="text-xs text-muted">Imported</div>
        </div>
        <div className="bg-yellow/10 border border-yellow/20 rounded-lg p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">{report.rows_skipped}</div>
          <div className="text-xs text-muted">Skipped</div>
        </div>
      </div>

      {/* Skip Breakdown */}
      {report.rows_skipped > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-medium text-muted uppercase tracking-wide">
            Skip Reasons
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {report.skipped_breakdown.inactive > 0 && (
              <div className="flex items-center gap-2 text-muted">
                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                <span>Inactive: {report.skipped_breakdown.inactive}</span>
              </div>
            )}
            {report.skipped_breakdown.not_distribution > 0 && (
              <div className="flex items-center gap-2 text-muted">
                <AlertTriangle className="w-3 h-3 text-yellow-500" />
                <span>Not Distribution: {report.skipped_breakdown.not_distribution}</span>
              </div>
            )}
            {report.skipped_breakdown.missing_fields > 0 && (
              <div className="flex items-center gap-2 text-muted">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
                <span>Missing Fields: {report.skipped_breakdown.missing_fields}</span>
              </div>
            )}
            {report.skipped_breakdown.duplicate_listing_id > 0 && (
              <div className="flex items-center gap-2 text-muted">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span>Duplicates: {report.skipped_breakdown.duplicate_listing_id}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expandable Details */}
      {report.skipped_details.length > 0 && (
        <div className="border-t border-ink/10 pt-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-blue hover:text-blue/80 transition-colors"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show Skipped Rows ({report.skipped_details.length})
              </>
            )}
          </button>

          {showDetails && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-1 text-xs">
              {report.skipped_details.slice(0, 50).map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 p-2 bg-paper rounded border border-ink/10"
                >
                  <span className="font-mono text-muted shrink-0">Row {item.row}:</span>
                  <span className="text-ink">{item.reason}</span>
                </div>
              ))}
              {report.skipped_details.length > 50 && (
                <div className="text-muted text-center py-2">
                  ... and {report.skipped_details.length - 50} more
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Missing Headers Warning */}
      {report.missing_headers.length > 0 && (
        <div className="border-t border-ink/10 pt-3 mt-3">
          <div className="flex items-center gap-2 text-xs text-yellow-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Missing optional columns: {report.missing_headers.slice(0, 5).join(', ')}</span>
            {report.missing_headers.length > 5 && (
              <span> and {report.missing_headers.length - 5} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
