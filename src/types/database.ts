export type ListingType = 'Lease' | 'Sale' | 'Sublease';
export type ListingStatus = 'Active' | 'Under Contract' | 'Sold/Leased' | 'Unknown/Removed';
export type DealSource = 'Direct' | 'Referral' | 'Marketing' | 'Cold Call' | 'Website' | 'Other';
export type DealType = 'Lease' | 'Sale' | 'Sublease' | 'Renewal' | 'Expansion';
export type DealStatus = 'Active' | 'Under Contract' | 'Closed' | 'Lost' | 'On Hold';

export interface Listing {
  id: string;
  listing_id: string;
  address: string;
  display_address?: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  warehouse_sf?: number | null;
  office_sf?: number | null;
  clear_height_ft?: number | null;
  dock_doors?: number | null;
  drive_in_doors?: number | null;
  listing_type?: string | null;
  status: string;
  asking_rate_psf?: string | null;
  sale_price?: string | null;
  landlord?: string | null;
  broker_source?: string | null;
  link?: string | null;
  notes_public?: string | null;
  internal_note?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Brokerage {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  user_id: string;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  brokerage_id?: string | null;
  brokerage?: Brokerage | null;
  notes?: string | null;
  user_id: string;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealCondition {
  id: string;
  description: string;
  due_date?: string | null;
  is_satisfied: boolean;
}

export interface DealDeposit {
  amount: number;
  due_date?: string | null;
  received: boolean;
}

export interface DealDocument {
  id: string;
  name: string;
  file_path: string;
  file_size?: number | null;
  uploaded_at: string;
}

export interface Deal {
  id: string;
  deal_number?: string | null;
  deal_type: string;
  address: string;
  city: string;
  submarket: string;
  deal_value?: number | null;
  commission_percent?: number | null;
  close_date?: string | null;
  status: string;
  conditions?: string | null;
  deposit_amount?: number | null;
  deposit_due_date?: string | null;
  listing_id?: string | null;
  listing?: Listing | null;
  property_id?: string | null;
  notes?: string | null;
  user_id: string;
  org_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListingFormData {
  listing_id: string;
  address: string;
  display_address?: string;
  city: string;
  submarket: string;
  size_sf: number;
  warehouse_sf?: number;
  office_sf?: number;
  clear_height_ft?: number;
  dock_doors?: number;
  drive_in_doors?: number;
  listing_type?: ListingType;
  status: ListingStatus;
  asking_rate_psf?: string;
  sale_price?: string;
  landlord?: string;
  broker_source?: string;
  link?: string;
  notes_public?: string;
  internal_note?: string;
}

export interface DealFormData {
  deal_number?: string;
  deal_type: DealType;
  address: string;
  city: string;
  submarket: string;
  deal_value?: number;
  commission_percent?: number;
  close_date?: string;
  status: DealStatus;
  listing_id?: string;
  property_id?: string;
  notes?: string;
}

export interface BrokerageFormData {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface AgentFormData {
  name: string;
  email?: string;
  phone?: string;
  brokerage_id?: string;
  notes?: string;
}
