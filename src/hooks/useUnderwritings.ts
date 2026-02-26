import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/hooks/useOrg'
import { toast } from '@/hooks/use-toast'

export interface Underwriting {
  id: string
  org_id: string
  user_id: string
  property_name: string
  address: string
  submarket: string
  building_size_sf: number | null
  year_built: number | null
  land_size_ac: number | null
  proposed_ask_price: number | null
  status: string
  phase_completion: Record<string, boolean>
  created_at: string
  updated_at: string
}

export interface UnderwritingDocument {
  id: string
  underwriting_id: string
  document_type: string
  file_name: string
  storage_path: string
  created_at: string
}

export interface UnderwritingPhaseData {
  id: string
  underwriting_id: string
  phase: number
  raw_perplexity_response: string | null
  structured_data: Record<string, unknown> | null
  broker_notes: string | null
  created_at: string
  updated_at: string
}

// ─── Query hooks ─────────────────────────────────────────────────────────────

export function useUnderwritings() {
  const { orgId } = useOrg()
  return useQuery({
    queryKey: ['underwritings', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('underwritings')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as Underwriting[]
    },
  })
}

export function useUnderwriting(id: string | undefined) {
  return useQuery({
    queryKey: ['underwriting', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('underwritings')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Underwriting
    },
  })
}

export function useUnderwritingDocuments(underwritingId: string | undefined) {
  return useQuery({
    queryKey: ['underwriting_documents', underwritingId],
    enabled: !!underwritingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('underwriting_documents')
        .select('*')
        .eq('underwriting_id', underwritingId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data || []) as UnderwritingDocument[]
    },
  })
}

export function useUnderwritingPhaseData(underwritingId: string | undefined) {
  return useQuery({
    queryKey: ['underwriting_phase_data', underwritingId],
    enabled: !!underwritingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('underwriting_phase_data')
        .select('*')
        .eq('underwriting_id', underwritingId!)
        .order('phase', { ascending: true })
      if (error) throw error
      return (data || []) as UnderwritingPhaseData[]
    },
  })
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateUnderwriting() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { orgId } = useOrg()

  return useMutation({
    mutationFn: async (values: Partial<Underwriting>) => {
      const { data, error } = await supabase
        .from('underwritings')
        .insert([{
          property_name: values.property_name!,
          address: values.address!,
          submarket: values.submarket!,
          building_size_sf: values.building_size_sf,
          year_built: values.year_built,
          land_size_ac: values.land_size_ac,
          proposed_ask_price: values.proposed_ask_price,
          user_id: user!.id,
          org_id: orgId!,
        }])
        .select()
        .single()
      if (error) throw error
      return data as Underwriting
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwritings'] })
      toast({ title: 'Underwriting created' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })
}

export function useUpdateUnderwriting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Underwriting> & { id: string }) => {
      const { data, error } = await supabase
        .from('underwritings')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Underwriting
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['underwriting', data.id] })
      queryClient.invalidateQueries({ queryKey: ['underwritings'] })
      toast({ title: 'Underwriting updated' })
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    },
  })
}

export function useUploadDocument(underwritingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const ext = file.name.split('.').pop()
      const path = `${underwritingId}/${documentType}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('underwriting-docs')
        .upload(path, file)
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('underwriting_documents')
        .insert({
          underwriting_id: underwritingId,
          document_type: documentType,
          file_name: file.name,
          storage_path: path,
        })
        .select()
        .single()
      if (error) throw error
      return data as UnderwritingDocument
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwriting_documents', underwritingId] })
      toast({ title: 'Document uploaded' })
    },
    onError: (err: Error) => {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' })
    },
  })
}

export function useDeleteDocument(underwritingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      await supabase.storage.from('underwriting-docs').remove([storagePath])
      const { error } = await supabase.from('underwriting_documents').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwriting_documents', underwritingId] })
      toast({ title: 'Document removed' })
    },
  })
}

export function useAnalyzePhase(underwritingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (phase: number) => {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/underwriting-perplexity`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ underwritingId, phase }),
        }
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error || 'Analysis failed')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwriting_phase_data', underwritingId] })
      queryClient.invalidateQueries({ queryKey: ['underwriting', underwritingId] })
      queryClient.invalidateQueries({ queryKey: ['underwritings'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' })
    },
  })
}

export function useSavePhaseData(underwritingId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      phase,
      structuredData,
      brokerNotes,
    }: {
      phase: number
      structuredData: Record<string, unknown>
      brokerNotes?: string
    }) => {
      // Check if record exists
      const { data: existing } = await supabase
        .from('underwriting_phase_data')
        .select('id')
        .eq('underwriting_id', underwritingId)
        .eq('phase', phase)
        .maybeSingle()

      let result
      if (existing) {
        const { data, error } = await supabase
          .from('underwriting_phase_data')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ structured_data: structuredData as any, broker_notes: brokerNotes })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from('underwriting_phase_data')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert([{ underwriting_id: underwritingId, phase, structured_data: structuredData as any, broker_notes: brokerNotes }])
          .select()
          .single()
        if (error) throw error
        result = data
      }
      return result as UnderwritingPhaseData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['underwriting_phase_data', underwritingId] })
      toast({ title: 'Changes saved' })
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' })
    },
  })
}
