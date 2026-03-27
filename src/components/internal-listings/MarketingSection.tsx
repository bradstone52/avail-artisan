import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface MarketingSectionProps {
  listing: {
    id: string;
    address: string;
    description?: string | null;
    broker_remarks?: string | null;
    photo_url?: string | null;
  };
  onPhotoUpdate?: (photoUrl: string | null) => void;
}

export function MarketingSection({ listing }: MarketingSectionProps) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Brochure Builder</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Create professional property brochures with AI-generated marketing copy, export as PDF or PPTX.
        </p>
        <Button
          className="gap-2 mt-2"
          onClick={() => navigate(`/brochure-builder?listingId=${listing.id}`)}
        >
          <Sparkles className="h-4 w-4" />
          Open Brochure Builder
        </Button>
      </CardContent>
    </Card>
  );
}
