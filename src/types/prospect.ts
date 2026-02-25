export type ProspectType = 'Tenant' | 'Buyer' | 'Listing';
export type ProspectSource = 'Past Client' | 'Network' | 'Sign Call' | 'Cold Call' | 'Referral';

export interface FollowUpDate {
  id: string;
  date: string;
  notes?: string;
  completed: boolean;
}

export interface Prospect {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  requirements?: string | null;
  min_size?: number | null;
  max_size?: number | null;
  budget?: number | null;
  follow_up_date?: string | null;
  status: string;
  notes?: string | null;
  prospect_type?: string | null;
  source?: string | null;
  referral?: string | null;
  loading?: string | null;
  use_type?: string | null;
  occupancy_date?: string | null;
  yard_required?: boolean | null;
  estimated_value?: number | null;
  commission?: number | null;
  priority?: string | null;
  last_contacted_at?: string | null;
  user_id: string;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectTask {
  id: string;
  prospect_id: string;
  org_id?: string | null;
  created_by?: string | null;
  title: string;
  notes?: string | null;
  due_date?: string | null;
  completed: boolean;
  reminder_at?: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProspectFormData {
  name: string;
  prospect_type?: ProspectType;
  source?: ProspectSource;
  follow_up_date?: string;
  referral?: string;
  max_size?: number;
  loading?: string;
  use_type?: string;
  occupancy_date?: string;
  yard_required?: boolean;
  estimated_value?: number;
  commission?: number;
  notes?: string;
  priority?: string;
  email?: string;
  phone?: string;
}

export interface ProspectTaskFormData {
  title: string;
  notes?: string;
  due_date?: string;
  reminder_at?: string;
}
