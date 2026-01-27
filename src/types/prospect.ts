export type ProspectType = 'Tenant' | 'Buyer' | 'Seller' | 'Landlord' | 'Investor' | 'Other';
export type ProspectSource = 'Direct' | 'Referral' | 'Marketing' | 'Cold Call' | 'Website' | 'Other';
export type ProspectStatus = 'New' | 'Contacted' | 'Qualified' | 'Active' | 'On Hold' | 'Lost' | 'Converted';

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
  user_id: string;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectFormData {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  requirements?: string;
  min_size?: number;
  max_size?: number;
  budget?: number;
  follow_up_date?: string;
  status: ProspectStatus;
  notes?: string;
}
