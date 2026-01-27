import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import type { Deal } from '@/types/database';

interface DealSummaryGeneratorProps {
  deal: Deal;
}

export function DealSummaryGenerator({ deal }: DealSummaryGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // For now, show a placeholder message
      toast.info('Deal Summary PDF generation coming soon');
    } catch (error) {
      console.error('Error generating deal summary:', error);
      toast.error('Failed to generate deal summary');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Deal Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a concise Deal Summary PDF for sharing.
        </p>
        <Button onClick={handleGenerate} disabled={generating}>
          <Download className="w-4 h-4 mr-2" />
          {generating ? 'Generating...' : 'Generate PDF'}
        </Button>
      </CardContent>
    </Card>
  );
}
