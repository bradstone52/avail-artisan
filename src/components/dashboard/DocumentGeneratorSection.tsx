import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeals } from '@/hooks/useDeals';

export function DocumentGeneratorSection() {
  const navigate = useNavigate();
  const { data: deals } = useDeals();

  const activeDeals = deals?.filter(d => d.status === 'Active' || d.status === 'Under Contract') || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Generator
        </CardTitle>
        <Button size="sm" onClick={() => navigate('/deals/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Deal
        </Button>
      </CardHeader>
      <CardContent>
        {activeDeals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active deals. Create a deal to generate documents.
          </p>
        ) : (
          <div className="space-y-2">
            {activeDeals.slice(0, 3).map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 cursor-pointer hover:bg-muted"
                onClick={() => navigate(`/deals/${deal.id}`)}
              >
                <div>
                  <p className="font-medium">{deal.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {deal.deal_type} • {deal.status}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {activeDeals.length > 3 && (
              <Button
                variant="link"
                className="w-full"
                onClick={() => navigate('/deals')}
              >
                View all {activeDeals.length} active deals
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
