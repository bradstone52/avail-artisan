import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function TransactionRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) { navigate('/lease-comps', { replace: true }); return; }

    async function redirect() {
      const { data: txn } = await supabase
        .from('transactions')
        .select('transaction_type, address, transaction_date, size_sf, org_id')
        .eq('id', id)
        .maybeSingle();

      if (!txn) {
        navigate('/lease-comps', { replace: true });
        return;
      }

      if (txn.transaction_type === 'Sale' || txn.transaction_type === 'Sublease') {
        toast.info('Sale and sublease comps are archived and not shown in Lease Comps.');
        navigate('/lease-comps', { replace: true });
        return;
      }

      if (txn.transaction_type === 'Lease' || txn.transaction_type === 'Renewal') {
        let query = supabase
          .from('lease_comps')
          .select('id')
          .eq('address', txn.address)
          .eq('org_id', txn.org_id);

        if (txn.transaction_date) {
          query = query.eq('commencement_date', txn.transaction_date);
        }
        if (txn.size_sf != null) {
          query = query.eq('size_sf', txn.size_sf);
        }

        const { data: matches } = await query;

        if (matches && matches.length === 1) {
          navigate(`/lease-comps/${matches[0].id}`, { replace: true });
          return;
        }
      }

      // Unknown/Removed, no match, or multiple matches — go to list silently
      navigate('/lease-comps', { replace: true });
    }

    redirect();
  }, [id, navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
