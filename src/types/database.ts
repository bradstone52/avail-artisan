export type ListingType = 'Lease' | 'Sale' | 'Sublease';

export interface LeaseRateYear {
  year: number;
  rate_psf: number;
  months: number;
}

/** Shared helper: calculate total lease value from a rate schedule */
export function calcLeaseValue(rates: LeaseRateYear[], sizeSf: number): number {
  return rates.reduce((sum, r) => sum + (r.rate_psf * sizeSf * r.months / 12), 0);
}

/** Weighted average PSF across all years */
export function weightedAvgRate(rates: LeaseRateYear[]): number {
  const totalMonths = rates.reduce((s, r) => s + r.months, 0);
  if (!totalMonths) return 0;
  const weightedSum = rates.reduce((s, r) => s + r.rate_psf * r.months, 0);
  return weightedSum / totalMonths;
}
export type ListingStatus = 'Active' | 'Under Contract' | 'Sold/Leased' | 'Unknown/Removed';
export type DealSource = 'Direct' | 'Referral' | 'Marketing' | 'Cold Call' | 'Website' | 'Other';
export type DealType = 'Lease' | 'Sale' | 'Sublease' | 'Renewal';
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
  id: string;
  deal_id: string;
  amount: number;
  due_date?: string | null;
  received: boolean;
  held_by?: string | null;
  created_at: string;
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
  size_sf?: number | null;
  is_land_deal?: boolean;
  lease_rate_psf?: number | null;
  lease_term_months?: number | null;
  commencement_date?: string | null;
  expiry_date?: string | null;
  lease_rates?: LeaseRateYear[] | null;
  deal_value?: number | null;
  commission_percent?: number | null;
  close_date?: string | null;
  closing_date?: string | null;
  lease_value?: number | null;
  status: string;
  conditions?: string | null;
  deposit_amount?: number | null;
  deposit_due_date?: string | null;
  listing_id?: string | null;
  listing?: Listing | null;
  property_id?: string | null;
  internal_listing_id?: string | null;
  notes?: string | null;
  // Agent fields
  listing_brokerage_id?: string | null;
  listing_agent1_id?: string | null;
  listing_agent2_id?: string | null;
  selling_brokerage_id?: string | null;
  selling_agent1_id?: string | null;
  selling_agent2_id?: string | null;
  cv_agent_id?: string | null;
  // Party fields
  seller_name?: string | null;
  seller_brokerage_id?: string | null;
  buyer_name?: string | null;
  buyer_brokerage_id?: string | null;
  // Lawyer fields
  seller_lawyer_name?: string | null;
  seller_lawyer_firm?: string | null;
  seller_lawyer_phone?: string | null;
  seller_lawyer_email?: string | null;
  buyer_lawyer_name?: string | null;
  buyer_lawyer_firm?: string | null;
  buyer_lawyer_phone?: string | null;
  buyer_lawyer_email?: string | null;
  // Nomenclature toggle
  use_purchaser_vendor?: boolean;
  // Financial fields
  other_brokerage_percent?: number | null;
  clearview_percent?: number | null;
  gst_rate?: number | null;
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
  size_sf?: number | null;
  is_land_deal?: boolean;
  lease_rate_psf?: number | null;
  lease_term_months?: number | null;
  commencement_date?: string | null;
  expiry_date?: string | null;
  deal_value?: number | null;
  commission_percent?: number;
  close_date?: string | null;
  effective_date?: string | null;
  status: DealStatus;
  listing_id?: string;
  property_id?: string;
  notes?: string;
  // Party fields
  seller_name?: string | null;
  buyer_name?: string | null;
  seller_brokerage_id?: string | null;
  buyer_brokerage_id?: string | null;
  // Lawyer fields
  seller_lawyer_name?: string | null;
  seller_lawyer_firm?: string | null;
  seller_lawyer_phone?: string | null;
  seller_lawyer_email?: string | null;
  buyer_lawyer_name?: string | null;
  buyer_lawyer_firm?: string | null;
  buyer_lawyer_phone?: string | null;
  buyer_lawyer_email?: string | null;
  // Nomenclature toggle
  use_purchaser_vendor?: boolean;
  // Agent fields
  listing_brokerage_id?: string | null;
  listing_agent1_id?: string | null;
  listing_agent2_id?: string | null;
  selling_brokerage_id?: string | null;
  selling_agent1_id?: string | null;
  selling_agent2_id?: string | null;
  cv_agent_id?: string | null;
  // Financial fields
  other_brokerage_percent?: number | null;
  clearview_percent?: number | null;
  gst_rate?: number | null;
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
