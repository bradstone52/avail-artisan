/**
 * PrintPreview Page
 * 
 * This page renders the exact same HTML/CSS that DocRaptor will receive.
 * No interactive UI chrome - just the print template.
 * 
 * URL: /print-preview/:issueId
 * Query params:
 *   - debug=1  → Show debug overlay with HTML length and hash
 */

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  buildPrintHtml, 
  logTemplateDebug,
  DEFAULT_PRIMARY_CONTACT,
  DEFAULT_SECONDARY_CONTACT,
  PrintTemplateData,
  PrintTemplateListing 
} from '@/lib/print-template';

interface IssueData {
  id: string;
  title: string;
  market: string;
  size_threshold: number;
  user_id: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  secondary_contact_name: string | null;
  secondary_contact_email: string | null;
  secondary_contact_phone: string | null;
}

export default function PrintPreview() {
  const { issueId } = useParams<{ issueId: string }>();
  const [searchParams] = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';
  const sizeThresholdMax = Number(searchParams.get('maxSF')) || 500000;
  
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!issueId) {
        setError('No issue ID provided');
        setLoading(false);
        return;
      }

      try {
        // Fetch issue
        const { data: issue, error: issueErr } = await supabase
          .from('issues')
          .select('*')
          .eq('id', issueId)
          .single();

        if (issueErr || !issue) {
          throw new Error('Issue not found');
        }

        // Fetch issue_listings to get selected listings and their notes
        const { data: issueListings, error: ilErr } = await supabase
          .from('issue_listings')
          .select('listing_id, change_status, executive_note, sort_order')
          .eq('issue_id', issueId)
          .order('sort_order', { ascending: true });

        if (ilErr) {
          console.error('Error fetching issue_listings:', ilErr);
        }

        // Build executive notes map
        const executiveNotes: Record<string, string> = {};
        const listingIds: string[] = [];
        
        if (issueListings && issueListings.length > 0) {
          issueListings.forEach((il) => {
            listingIds.push(il.listing_id);
            if (il.executive_note) {
              executiveNotes[il.listing_id] = il.executive_note;
            }
          });
        }

        // Count new listings
        const newCount = issueListings?.filter(il => il.change_status === 'new').length || issue.new_count || 0;

        // Fetch listings
        let listings: PrintTemplateListing[] = [];
        
        if (listingIds.length > 0) {
          const { data: listingsData, error: listingsErr } = await supabase
            .from('listings')
            .select('id, listing_id, property_name, display_address, address, city, submarket, size_sf, clear_height_ft, dock_doors, drive_in_doors, availability_date, notes_public, trailer_parking')
            .in('id', listingIds);

          if (listingsErr) {
            throw new Error('Failed to load listings');
          }

          // Sort by the order in issue_listings
          const byId = new Map<string, PrintTemplateListing>();
          (listingsData || []).forEach((l) => {
            byId.set(l.id, l as PrintTemplateListing);
          });

          listings = listingIds
            .map((id) => byId.get(id))
            .filter(Boolean) as PrintTemplateListing[];
        } else {
          // Fallback: get all active listings that match criteria
          const { data: listingsData, error: listingsErr } = await supabase
            .from('listings')
            .select('id, listing_id, property_name, display_address, address, city, submarket, size_sf, clear_height_ft, dock_doors, drive_in_doors, availability_date, notes_public, trailer_parking')
            .eq('user_id', issue.user_id)
            .eq('include_in_issue', true)
            .eq('status', 'Active')
            .gte('size_sf', issue.size_threshold)
            .lte('size_sf', sizeThresholdMax)
            .order('size_sf', { ascending: false });

          if (listingsErr) {
            throw new Error('Failed to load listings');
          }

          listings = (listingsData || []) as PrintTemplateListing[];
        }

        // Build template data
        const templateData: PrintTemplateData = {
          title: issue.title,
          market: issue.market,
          sizeThreshold: issue.size_threshold,
          sizeThresholdMax,
          listings,
          primary: {
            name: issue.primary_contact_name || DEFAULT_PRIMARY_CONTACT.name,
            email: issue.primary_contact_email || DEFAULT_PRIMARY_CONTACT.email,
            phone: issue.primary_contact_phone || DEFAULT_PRIMARY_CONTACT.phone,
          },
          secondary: {
            name: issue.secondary_contact_name || DEFAULT_SECONDARY_CONTACT.name,
            email: issue.secondary_contact_email || DEFAULT_SECONDARY_CONTACT.email,
            phone: issue.secondary_contact_phone || DEFAULT_SECONDARY_CONTACT.phone,
          },
          newCount,
          includeDetails: false,
          executiveNotes,
          debugMode,
        };

        const generatedHtml = buildPrintHtml(templateData);
        
        // Log debug info
        if (debugMode) {
          logTemplateDebug('PrintPreview', generatedHtml);
        }

        setHtml(generatedHtml);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        console.error('PrintPreview error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [issueId, debugMode, sizeThresholdMax]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif'
      }}>
        Loading print preview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
        color: '#dc2626'
      }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  // Render the raw HTML directly
  // Using dangerouslySetInnerHTML is intentional here - we want to render exactly
  // what DocRaptor will receive
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: html }} 
      style={{ margin: 0, padding: 0 }}
    />
  );
}
