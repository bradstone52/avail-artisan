import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContactResult {
  id?: string | null;
  name: string | null;
  title: string | null;
  company: string | null;
  emails: string[];
  phones: string[];
  linkedin_url: string | null;
  photo_url?: string | null;
}

interface UseContactFinderReturn {
  loading: boolean;
  error: string | null;
  personResult: ContactResult | null;
  peopleResults: ContactResult[];
  totalResults: number;
  currentPage: number;
  pageSize: number;
  lookupPerson: (params: { name?: string; company?: string; linkedin_url?: string }) => Promise<void>;
  searchPeople: (params: { company: string; title?: string; page?: number }) => Promise<void>;
  clearResults: () => void;
}

export function useContactFinder(): UseContactFinderReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personResult, setPersonResult] = useState<ContactResult | null>(null);
  const [peopleResults, setPeopleResults] = useState<ContactResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const invoke = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const res = await supabase.functions.invoke('rocketreach-lookup', { body });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const lookupPerson = async (params: { name?: string; company?: string; linkedin_url?: string }) => {
    setLoading(true);
    setError(null);
    setPersonResult(null);
    try {
      const data = await invoke({ operation: 'person_lookup', ...params });
      if (data.error) {
        setError(data.error);
      } else {
        setPersonResult(data.result ?? null);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const searchPeople = async (params: { company: string; title?: string; page?: number }) => {
    const page = params.page ?? 1;
    setLoading(true);
    setError(null);
    setPeopleResults([]);
    setCurrentPage(page);
    try {
      const data = await invoke({ operation: 'people_search', ...params, page, page_size: pageSize });
      if (data.error) {
        setError(data.error);
      } else {
        setPeopleResults(data.results ?? []);
        setTotalResults(data.total ?? 0);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setPersonResult(null);
    setPeopleResults([]);
    setTotalResults(0);
    setCurrentPage(1);
    setError(null);
  };

  return { loading, error, personResult, peopleResults, totalResults, currentPage, pageSize, lookupPerson, searchPeople, clearResults };
}
