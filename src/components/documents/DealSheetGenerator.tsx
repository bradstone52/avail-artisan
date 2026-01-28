import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { DealSheetPDF } from './DealSheetPDF';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';
import type { Deal } from '@/types/database';

interface DealSheetGeneratorProps {
  deal: Deal;
}

export function DealSheetGenerator({ deal }: DealSheetGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const { conditions } = useDealConditions(deal.id);
  const { deposits } = useDealDeposits(deal.id);
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();

  // Helper to get agent/brokerage names
  const getAgent = (id: string | null | undefined) => agents?.find(a => a.id === id);
  const getBrokerage = (id: string | null | undefined) => brokerages?.find(b => b.id === id);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(
        <DealSheetPDF 
          deal={deal} 
          conditions={conditions}
          deposits={deposits}
          getAgent={getAgent}
          getBrokerage={getBrokerage}
        />
      ).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deal.address.replace(/[^a-zA-Z0-9]/g, '_')}_Dealsheet.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Deal Sheet PDF generated successfully');
    } catch (error) {
      console.error('Error generating deal sheet:', error);
      toast.error('Failed to generate deal sheet');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Deal Sheet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a formatted Deal Sheet PDF with all deal details, conditions, and commission calculations.
        </p>
        <Button onClick={handleGenerate} disabled={generating}>
          <Download className="w-4 h-4 mr-2" />
          {generating ? 'Generating...' : 'Generate PDF'}
        </Button>
      </CardContent>
    </Card>
  );
}
