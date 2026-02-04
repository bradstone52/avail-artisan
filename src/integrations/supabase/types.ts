export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          brokerage_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brokerage_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brokerage_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_brokerage_id_fkey"
            columns: ["brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      brokerage_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          extraction_hints: Json | null
          id: string
          name: string
          sample_fields: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          extraction_hints?: Json | null
          id?: string
          name: string
          sample_fields?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          extraction_hints?: Json | null
          id?: string
          name?: string
          sample_fields?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      brokerages: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          org_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          org_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brokerages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_conditions: {
        Row: {
          created_at: string
          deal_id: string
          description: string
          due_date: string | null
          id: string
          is_satisfied: boolean
        }
        Insert: {
          created_at?: string
          deal_id: string
          description: string
          due_date?: string | null
          id?: string
          is_satisfied?: boolean
        }
        Update: {
          created_at?: string
          deal_id?: string
          description?: string
          due_date?: string | null
          id?: string
          is_satisfied?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deal_conditions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_deposits: {
        Row: {
          amount: number
          created_at: string
          deal_id: string
          due_date: string | null
          due_time: string | null
          held_by: string | null
          id: string
          received: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          deal_id: string
          due_date?: string | null
          due_time?: string | null
          held_by?: string | null
          id?: string
          received?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          deal_id?: string
          due_date?: string | null
          due_time?: string | null
          held_by?: string | null
          id?: string
          received?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deal_deposits_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_documents: {
        Row: {
          deal_id: string
          file_path: string
          file_size: number | null
          id: string
          name: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          deal_id: string
          file_path: string
          file_size?: number | null
          id?: string
          name: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          deal_id?: string
          file_path?: string
          file_size?: number | null
          id?: string
          name?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_summary_actions: {
        Row: {
          acting_party: string | null
          created_at: string
          date_met: string | null
          deal_id: string
          description: string
          due_date: string | null
          due_time: string | null
          id: string
          sort_order: number
        }
        Insert: {
          acting_party?: string | null
          created_at?: string
          date_met?: string | null
          deal_id: string
          description: string
          due_date?: string | null
          due_time?: string | null
          id?: string
          sort_order?: number
        }
        Update: {
          acting_party?: string | null
          created_at?: string
          date_met?: string | null
          deal_id?: string
          description?: string
          due_date?: string | null
          due_time?: string | null
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "deal_summary_actions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          address: string
          buyer_brokerage_id: string | null
          buyer_name: string | null
          city: string | null
          clearview_percent: number | null
          close_date: string | null
          closing_date: string | null
          commission_percent: number | null
          conditions: string | null
          created_at: string
          cv_agent_id: string | null
          deal_number: string | null
          deal_type: string
          deal_value: number | null
          deposit_amount: number | null
          deposit_due_date: string | null
          gst_rate: number | null
          id: string
          lease_value: number | null
          listing_agent1_id: string | null
          listing_agent2_id: string | null
          listing_brokerage_id: string | null
          listing_id: string | null
          notes: string | null
          org_id: string | null
          other_brokerage_percent: number | null
          property_id: string | null
          seller_brokerage_id: string | null
          seller_name: string | null
          selling_agent1_id: string | null
          selling_agent2_id: string | null
          selling_brokerage_id: string | null
          size_sf: number | null
          status: string
          submarket: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          buyer_brokerage_id?: string | null
          buyer_name?: string | null
          city?: string | null
          clearview_percent?: number | null
          close_date?: string | null
          closing_date?: string | null
          commission_percent?: number | null
          conditions?: string | null
          created_at?: string
          cv_agent_id?: string | null
          deal_number?: string | null
          deal_type?: string
          deal_value?: number | null
          deposit_amount?: number | null
          deposit_due_date?: string | null
          gst_rate?: number | null
          id?: string
          lease_value?: number | null
          listing_agent1_id?: string | null
          listing_agent2_id?: string | null
          listing_brokerage_id?: string | null
          listing_id?: string | null
          notes?: string | null
          org_id?: string | null
          other_brokerage_percent?: number | null
          property_id?: string | null
          seller_brokerage_id?: string | null
          seller_name?: string | null
          selling_agent1_id?: string | null
          selling_agent2_id?: string | null
          selling_brokerage_id?: string | null
          size_sf?: number | null
          status?: string
          submarket?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          buyer_brokerage_id?: string | null
          buyer_name?: string | null
          city?: string | null
          clearview_percent?: number | null
          close_date?: string | null
          closing_date?: string | null
          commission_percent?: number | null
          conditions?: string | null
          created_at?: string
          cv_agent_id?: string | null
          deal_number?: string | null
          deal_type?: string
          deal_value?: number | null
          deposit_amount?: number | null
          deposit_due_date?: string | null
          gst_rate?: number | null
          id?: string
          lease_value?: number | null
          listing_agent1_id?: string | null
          listing_agent2_id?: string | null
          listing_brokerage_id?: string | null
          listing_id?: string | null
          notes?: string | null
          org_id?: string | null
          other_brokerage_percent?: number | null
          property_id?: string | null
          seller_brokerage_id?: string | null
          seller_name?: string | null
          selling_agent1_id?: string | null
          selling_agent2_id?: string | null
          selling_brokerage_id?: string | null
          size_sf?: number | null
          status?: string
          submarket?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_buyer_brokerage_id_fkey"
            columns: ["buyer_brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_cv_agent_id_fkey"
            columns: ["cv_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_listing_agent1_id_fkey"
            columns: ["listing_agent1_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_listing_agent2_id_fkey"
            columns: ["listing_agent2_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_listing_brokerage_id_fkey"
            columns: ["listing_brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_seller_brokerage_id_fkey"
            columns: ["seller_brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_selling_agent1_id_fkey"
            columns: ["selling_agent1_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_selling_agent2_id_fkey"
            columns: ["selling_agent2_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_selling_brokerage_id_fkey"
            columns: ["selling_brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerages"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_batches: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          period_month: number | null
          period_year: number | null
          status: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          period_month?: number | null
          period_year?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          period_month?: number | null
          period_year?: number | null
          status?: string | null
        }
        Relationships: []
      }
      distribution_events: {
        Row: {
          event_type: string
          id: string
          ip_address: string | null
          send_id: string
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          event_type?: string
          id?: string
          ip_address?: string | null
          send_id: string
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          ip_address?: string | null
          send_id?: string
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_events_send_id_fkey"
            columns: ["send_id"]
            isOneToOne: false
            referencedRelation: "distribution_sends"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_recipient_batch_status: {
        Row: {
          batch_id: string
          id: string
          next_step: string | null
          owner: string | null
          owner_user_id: string | null
          recipient_id: string
          replied: boolean
          reply_date: string | null
          updated_at: string
        }
        Insert: {
          batch_id: string
          id?: string
          next_step?: string | null
          owner?: string | null
          owner_user_id?: string | null
          recipient_id: string
          replied?: boolean
          reply_date?: string | null
          updated_at?: string
        }
        Update: {
          batch_id?: string
          id?: string
          next_step?: string | null
          owner?: string | null
          owner_user_id?: string | null
          recipient_id?: string
          replied?: boolean
          reply_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_recipient_batch_status_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "distribution_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_recipient_batch_status_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "distribution_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_recipients: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          default_owner: string | null
          email: string
          id: string
          notes: string | null
          phone: string | null
          scale: string | null
          title: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          default_owner?: string | null
          email: string
          id?: string
          notes?: string | null
          phone?: string | null
          scale?: string | null
          title?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          default_owner?: string | null
          email?: string
          id?: string
          notes?: string | null
          phone?: string | null
          scale?: string | null
          title?: string | null
        }
        Relationships: []
      }
      distribution_sends: {
        Row: {
          id: string
          recipient_id: string
          report_id: string
          sent_at: string
          tracking_token: string
        }
        Insert: {
          id?: string
          recipient_id: string
          report_id: string
          sent_at?: string
          tracking_token?: string
        }
        Update: {
          id?: string
          recipient_id?: string
          report_id?: string
          sent_at?: string
          tracking_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_sends_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "distribution_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          is_workspace_token: boolean | null
          refresh_token: string | null
          scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_workspace_token?: boolean | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_workspace_token?: boolean | null
          refresh_token?: string | null
          scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      internal_listing_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          listing_id: string
          new_status: string
          notes: string | null
          previous_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          listing_id: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          listing_id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_listing_status_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "internal_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_listings: {
        Row: {
          address: string
          archived_at: string | null
          archived_reason: string | null
          asking_rent_psf: number | null
          asking_sale_price: number | null
          assigned_agent_id: string | null
          broker_remarks: string | null
          cam: number | null
          city: string
          clear_height_ft: number | null
          confidential_summary: string | null
          created_at: string
          created_by: string
          deal_type: string
          description: string | null
          display_address: string | null
          dock_doors: number | null
          drive_in_doors: number | null
          id: string
          land_acres: number | null
          latitude: number | null
          listing_number: string | null
          loading_type: string | null
          longitude: number | null
          office_sf: number | null
          op_costs: number | null
          org_id: string | null
          owner_contact: string | null
          owner_id: string | null
          owner_name: string | null
          owner_phone: string | null
          photo_url: string | null
          power: string | null
          property_type: string | null
          published_at: string | null
          secondary_agent_id: string | null
          size_sf: number | null
          status: string
          submarket: string
          taxes: number | null
          updated_at: string
          warehouse_sf: number | null
          yard: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          archived_at?: string | null
          archived_reason?: string | null
          asking_rent_psf?: number | null
          asking_sale_price?: number | null
          assigned_agent_id?: string | null
          broker_remarks?: string | null
          cam?: number | null
          city?: string
          clear_height_ft?: number | null
          confidential_summary?: string | null
          created_at?: string
          created_by: string
          deal_type?: string
          description?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          id?: string
          land_acres?: number | null
          latitude?: number | null
          listing_number?: string | null
          loading_type?: string | null
          longitude?: number | null
          office_sf?: number | null
          op_costs?: number | null
          org_id?: string | null
          owner_contact?: string | null
          owner_id?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          photo_url?: string | null
          power?: string | null
          property_type?: string | null
          published_at?: string | null
          secondary_agent_id?: string | null
          size_sf?: number | null
          status?: string
          submarket?: string
          taxes?: number | null
          updated_at?: string
          warehouse_sf?: number | null
          yard?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          archived_at?: string | null
          archived_reason?: string | null
          asking_rent_psf?: number | null
          asking_sale_price?: number | null
          assigned_agent_id?: string | null
          broker_remarks?: string | null
          cam?: number | null
          city?: string
          clear_height_ft?: number | null
          confidential_summary?: string | null
          created_at?: string
          created_by?: string
          deal_type?: string
          description?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          id?: string
          land_acres?: number | null
          latitude?: number | null
          listing_number?: string | null
          loading_type?: string | null
          longitude?: number | null
          office_sf?: number | null
          op_costs?: number | null
          org_id?: string | null
          owner_contact?: string | null
          owner_id?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          photo_url?: string | null
          power?: string | null
          property_type?: string | null
          published_at?: string | null
          secondary_agent_id?: string | null
          size_sf?: number | null
          status?: string
          submarket?: string
          taxes?: number | null
          updated_at?: string
          warehouse_sf?: number | null
          yard?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_listings_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_listings_secondary_agent_id_fkey"
            columns: ["secondary_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_redemption_attempts: {
        Row: {
          attempted_code: string
          created_at: string
          email_entered: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          attempted_code: string
          created_at?: string
          email_entered?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          attempted_code?: string
          created_at?: string
          email_entered?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          id: string
          invited_domain: string | null
          invited_email: string | null
          org_id: string
          revoked_at: string | null
          role: string
          used_at: string | null
          used_by_email: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code?: string
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          id?: string
          invited_domain?: string | null
          invited_email?: string | null
          org_id: string
          revoked_at?: string | null
          role?: string
          used_at?: string | null
          used_by_email?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          id?: string
          invited_domain?: string | null
          invited_email?: string | null
          org_id?: string
          revoked_at?: string | null
          role?: string
          used_at?: string | null
          used_by_email?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_listings: {
        Row: {
          change_status: string | null
          created_at: string
          executive_note: string | null
          id: string
          issue_id: string
          listing_id: string
          sort_order: number
        }
        Insert: {
          change_status?: string | null
          created_at?: string
          executive_note?: string | null
          id?: string
          issue_id: string
          listing_id: string
          sort_order?: number
        }
        Update: {
          change_status?: string | null
          created_at?: string
          executive_note?: string | null
          id?: string
          issue_id?: string
          listing_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "issue_listings_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issue_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          brokerage_name: string | null
          changed_count: number
          cover_image_url: string | null
          created_at: string
          id: string
          is_public: boolean
          logo_url: string | null
          market: string
          new_count: number
          pdf_filename: string | null
          pdf_filesize: number | null
          pdf_generated_at: string | null
          pdf_share_enabled: boolean
          pdf_share_token: string | null
          pdf_url: string | null
          primary_contact_email: string | null
          primary_contact_name: string | null
          primary_contact_phone: string | null
          primary_contact_title: string | null
          published_at: string | null
          removed_count: number
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
          secondary_contact_title: string | null
          size_threshold: number
          sort_order: string
          title: string
          total_listings: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brokerage_name?: string | null
          changed_count?: number
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          logo_url?: string | null
          market?: string
          new_count?: number
          pdf_filename?: string | null
          pdf_filesize?: number | null
          pdf_generated_at?: string | null
          pdf_share_enabled?: boolean
          pdf_share_token?: string | null
          pdf_url?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          published_at?: string | null
          removed_count?: number
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          size_threshold?: number
          sort_order?: string
          title: string
          total_listings?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brokerage_name?: string | null
          changed_count?: number
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          logo_url?: string | null
          market?: string
          new_count?: number
          pdf_filename?: string | null
          pdf_filesize?: number | null
          pdf_generated_at?: string | null
          pdf_share_enabled?: boolean
          pdf_share_token?: string | null
          pdf_url?: string | null
          primary_contact_email?: string | null
          primary_contact_name?: string | null
          primary_contact_phone?: string | null
          primary_contact_title?: string | null
          published_at?: string | null
          removed_count?: number
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
          secondary_contact_title?: string | null
          size_threshold?: number
          sort_order?: string
          title?: string
          total_listings?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string
          asking_rate_psf: string | null
          availability_date: string | null
          broker_source: string | null
          building_depth: string | null
          city: string
          clear_height_ft: number | null
          condo_fees: string | null
          crane_tons: string | null
          cranes: string | null
          created_at: string
          cross_dock: string | null
          display_address: string | null
          dock_doors: number | null
          drive_in_doors: number | null
          geocode_source: string | null
          geocoded_at: string | null
          gross_rate: string | null
          id: string
          include_in_issue: boolean
          internal_note: string | null
          land_acres: string | null
          landlord: string | null
          last_verified_date: string | null
          latitude: number | null
          link: string | null
          listing_id: string
          listing_type: string | null
          longitude: number | null
          mua: string | null
          notes_public: string | null
          office_percent: string | null
          office_sf: number | null
          op_costs: string | null
          org_id: string | null
          photo_url: string | null
          power_amps: string | null
          property_name: string | null
          property_tax: string | null
          sale_price: string | null
          size_sf: number
          sprinkler: string | null
          status: string
          sublease_exp: string | null
          submarket: string
          trailer_parking: string | null
          updated_at: string
          user_id: string
          voltage: string | null
          warehouse_sf: number | null
          yard: string | null
          yard_area: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          asking_rate_psf?: string | null
          availability_date?: string | null
          broker_source?: string | null
          building_depth?: string | null
          city: string
          clear_height_ft?: number | null
          condo_fees?: string | null
          crane_tons?: string | null
          cranes?: string | null
          created_at?: string
          cross_dock?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          geocode_source?: string | null
          geocoded_at?: string | null
          gross_rate?: string | null
          id?: string
          include_in_issue?: boolean
          internal_note?: string | null
          land_acres?: string | null
          landlord?: string | null
          last_verified_date?: string | null
          latitude?: number | null
          link?: string | null
          listing_id: string
          listing_type?: string | null
          longitude?: number | null
          mua?: string | null
          notes_public?: string | null
          office_percent?: string | null
          office_sf?: number | null
          op_costs?: string | null
          org_id?: string | null
          photo_url?: string | null
          power_amps?: string | null
          property_name?: string | null
          property_tax?: string | null
          sale_price?: string | null
          size_sf: number
          sprinkler?: string | null
          status?: string
          sublease_exp?: string | null
          submarket: string
          trailer_parking?: string | null
          updated_at?: string
          user_id: string
          voltage?: string | null
          warehouse_sf?: number | null
          yard?: string | null
          yard_area?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          asking_rate_psf?: string | null
          availability_date?: string | null
          broker_source?: string | null
          building_depth?: string | null
          city?: string
          clear_height_ft?: number | null
          condo_fees?: string | null
          crane_tons?: string | null
          cranes?: string | null
          created_at?: string
          cross_dock?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          geocode_source?: string | null
          geocoded_at?: string | null
          gross_rate?: string | null
          id?: string
          include_in_issue?: boolean
          internal_note?: string | null
          land_acres?: string | null
          landlord?: string | null
          last_verified_date?: string | null
          latitude?: number | null
          link?: string | null
          listing_id?: string
          listing_type?: string | null
          longitude?: number | null
          mua?: string | null
          notes_public?: string | null
          office_percent?: string | null
          office_sf?: number | null
          op_costs?: string | null
          org_id?: string | null
          photo_url?: string | null
          power_amps?: string | null
          property_name?: string | null
          property_tax?: string | null
          sale_price?: string | null
          size_sf?: number
          sprinkler?: string | null
          status?: string
          sublease_exp?: string | null
          submarket?: string
          trailer_parking?: string | null
          updated_at?: string
          user_id?: string
          voltage?: string | null
          warehouse_sf?: number | null
          yard?: string | null
          yard_area?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      market_listings: {
        Row: {
          address: string
          asking_rate_psf: string | null
          availability_date: string | null
          brochure_search_url: string | null
          broker_source: string | null
          building_depth: string | null
          city: string
          clear_height_ft: number | null
          condo_fees: string | null
          crane_tons: string | null
          cranes: string | null
          created_at: string
          cross_dock: string | null
          display_address: string | null
          dock_doors: number | null
          drive_in_doors: number | null
          geocode_source: string | null
          geocoded_at: string | null
          gross_rate: string | null
          id: string
          internal_note: string | null
          is_distribution_warehouse: boolean | null
          land_acres: string | null
          landlord: string | null
          last_verified_date: string | null
          latitude: number | null
          link: string | null
          link_last_checked: string | null
          link_status: string | null
          listing_id: string
          listing_type: string | null
          longitude: number | null
          mua: string | null
          notes_public: string | null
          office_sf: number | null
          op_costs: string | null
          org_id: string | null
          power_amps: string | null
          property_tax: string | null
          sale_price: string | null
          size_sf: number
          sprinkler: string | null
          status: string
          sublease_exp: string | null
          submarket: string
          trailer_parking: string | null
          updated_at: string
          user_id: string
          voltage: string | null
          warehouse_sf: number | null
          yard: string | null
          yard_area: string | null
          zoning: string | null
        }
        Insert: {
          address: string
          asking_rate_psf?: string | null
          availability_date?: string | null
          brochure_search_url?: string | null
          broker_source?: string | null
          building_depth?: string | null
          city?: string
          clear_height_ft?: number | null
          condo_fees?: string | null
          crane_tons?: string | null
          cranes?: string | null
          created_at?: string
          cross_dock?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          geocode_source?: string | null
          geocoded_at?: string | null
          gross_rate?: string | null
          id?: string
          internal_note?: string | null
          is_distribution_warehouse?: boolean | null
          land_acres?: string | null
          landlord?: string | null
          last_verified_date?: string | null
          latitude?: number | null
          link?: string | null
          link_last_checked?: string | null
          link_status?: string | null
          listing_id: string
          listing_type?: string | null
          longitude?: number | null
          mua?: string | null
          notes_public?: string | null
          office_sf?: number | null
          op_costs?: string | null
          org_id?: string | null
          power_amps?: string | null
          property_tax?: string | null
          sale_price?: string | null
          size_sf?: number
          sprinkler?: string | null
          status?: string
          sublease_exp?: string | null
          submarket?: string
          trailer_parking?: string | null
          updated_at?: string
          user_id: string
          voltage?: string | null
          warehouse_sf?: number | null
          yard?: string | null
          yard_area?: string | null
          zoning?: string | null
        }
        Update: {
          address?: string
          asking_rate_psf?: string | null
          availability_date?: string | null
          brochure_search_url?: string | null
          broker_source?: string | null
          building_depth?: string | null
          city?: string
          clear_height_ft?: number | null
          condo_fees?: string | null
          crane_tons?: string | null
          cranes?: string | null
          created_at?: string
          cross_dock?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          geocode_source?: string | null
          geocoded_at?: string | null
          gross_rate?: string | null
          id?: string
          internal_note?: string | null
          is_distribution_warehouse?: boolean | null
          land_acres?: string | null
          landlord?: string | null
          last_verified_date?: string | null
          latitude?: number | null
          link?: string | null
          link_last_checked?: string | null
          link_status?: string | null
          listing_id?: string
          listing_type?: string | null
          longitude?: number | null
          mua?: string | null
          notes_public?: string | null
          office_sf?: number | null
          op_costs?: string | null
          org_id?: string | null
          power_amps?: string | null
          property_tax?: string | null
          sale_price?: string | null
          size_sf?: number
          sprinkler?: string | null
          status?: string
          sublease_exp?: string | null
          submarket?: string
          trailer_parking?: string | null
          updated_at?: string
          user_id?: string
          voltage?: string | null
          warehouse_sf?: number | null
          yard?: string | null
          yard_area?: string | null
          zoning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_listings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      market_sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          links_bad: number | null
          links_checked: number | null
          links_ok: number | null
          org_id: string | null
          rows_imported: number | null
          rows_read: number | null
          rows_skipped: number | null
          run_type: string
          skipped_breakdown: Json | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          links_bad?: number | null
          links_checked?: number | null
          links_ok?: number | null
          org_id?: string | null
          rows_imported?: number | null
          rows_read?: number | null
          rows_skipped?: number | null
          run_type?: string
          skipped_breakdown?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          links_bad?: number | null
          links_checked?: number | null
          links_ok?: number | null
          org_id?: string | null
          rows_imported?: number | null
          rows_read?: number | null
          rows_skipped?: number | null
          run_type?: string
          skipped_breakdown?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "market_sync_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_integrations: {
        Row: {
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          header_row: number | null
          last_synced_at: string | null
          org_id: string
          sheet_id: string | null
          sheet_url: string | null
          tab_name: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          header_row?: number | null
          last_synced_at?: string | null
          org_id: string
          sheet_id?: string | null
          sheet_url?: string | null
          tab_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          header_row?: number | null
          last_synced_at?: string | null
          org_id?: string
          sheet_id?: string | null
          sheet_url?: string | null
          tab_name?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: []
      }
      pdf_import_batches: {
        Row: {
          brokerage_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          file_path: string | null
          filename: string
          id: string
          imported_count: number | null
          skipped_count: number | null
          status: string
          total_listings: number | null
        }
        Insert: {
          brokerage_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          filename: string
          id?: string
          imported_count?: number | null
          skipped_count?: number | null
          status?: string
          total_listings?: number | null
        }
        Update: {
          brokerage_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_path?: string | null
          filename?: string
          id?: string
          imported_count?: number | null
          skipped_count?: number | null
          status?: string
          total_listings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pdf_import_batches_brokerage_id_fkey"
            columns: ["brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerage_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_import_staging: {
        Row: {
          brokerage_id: string | null
          created_at: string
          created_by: string | null
          extracted_data: Json
          id: string
          import_action: string | null
          import_batch_id: string
          import_status: string
          imported_at: string | null
          match_confidence: number | null
          matched_listing_id: string | null
          source_filename: string
        }
        Insert: {
          brokerage_id?: string | null
          created_at?: string
          created_by?: string | null
          extracted_data: Json
          id?: string
          import_action?: string | null
          import_batch_id: string
          import_status?: string
          imported_at?: string | null
          match_confidence?: number | null
          matched_listing_id?: string | null
          source_filename: string
        }
        Update: {
          brokerage_id?: string | null
          created_at?: string
          created_by?: string | null
          extracted_data?: Json
          id?: string
          import_action?: string | null
          import_batch_id?: string
          import_status?: string
          imported_at?: string | null
          match_confidence?: number | null
          matched_listing_id?: string | null
          source_filename?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_import_staging_brokerage_id_fkey"
            columns: ["brokerage_id"]
            isOneToOne: false
            referencedRelation: "brokerage_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_import_staging_matched_listing_id_fkey"
            columns: ["matched_listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          assessed_improvement_value: number | null
          assessed_land_value: number | null
          assessed_value: number | null
          building_class: string | null
          city: string
          city_data_fetched_at: string | null
          city_data_raw: Json | null
          city_lookup_address: string | null
          clear_height_ft: number | null
          community_name: string | null
          created_at: string
          created_by: string | null
          display_address: string | null
          dock_doors: number | null
          drive_in_doors: number | null
          geocode_source: string | null
          geocoded_at: string | null
          id: string
          internal_notes: string | null
          land_acres: number | null
          land_use_designation: string | null
          latitude: number | null
          legal_description: string | null
          longitude: number | null
          name: string
          notes: string | null
          photo_url: string | null
          property_tax_annual: number | null
          property_type: string | null
          roll_number: string | null
          size_sf: number | null
          submarket: string
          tax_class: string | null
          updated_at: string
          year_built: number | null
          zoning: string | null
        }
        Insert: {
          address: string
          assessed_improvement_value?: number | null
          assessed_land_value?: number | null
          assessed_value?: number | null
          building_class?: string | null
          city?: string
          city_data_fetched_at?: string | null
          city_data_raw?: Json | null
          city_lookup_address?: string | null
          clear_height_ft?: number | null
          community_name?: string | null
          created_at?: string
          created_by?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          geocode_source?: string | null
          geocoded_at?: string | null
          id?: string
          internal_notes?: string | null
          land_acres?: number | null
          land_use_designation?: string | null
          latitude?: number | null
          legal_description?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          photo_url?: string | null
          property_tax_annual?: number | null
          property_type?: string | null
          roll_number?: string | null
          size_sf?: number | null
          submarket?: string
          tax_class?: string | null
          updated_at?: string
          year_built?: number | null
          zoning?: string | null
        }
        Update: {
          address?: string
          assessed_improvement_value?: number | null
          assessed_land_value?: number | null
          assessed_value?: number | null
          building_class?: string | null
          city?: string
          city_data_fetched_at?: string | null
          city_data_raw?: Json | null
          city_lookup_address?: string | null
          clear_height_ft?: number | null
          community_name?: string | null
          created_at?: string
          created_by?: string | null
          display_address?: string | null
          dock_doors?: number | null
          drive_in_doors?: number | null
          geocode_source?: string | null
          geocoded_at?: string | null
          id?: string
          internal_notes?: string | null
          land_acres?: number | null
          land_use_designation?: string | null
          latitude?: number | null
          legal_description?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          property_tax_annual?: number | null
          property_type?: string | null
          roll_number?: string | null
          size_sf?: number | null
          submarket?: string
          tax_class?: string | null
          updated_at?: string
          year_built?: number | null
          zoning?: string | null
        }
        Relationships: []
      }
      property_brochures: {
        Row: {
          created_at: string
          created_by: string | null
          download_method: string | null
          downloaded_at: string
          file_size: number | null
          id: string
          listing_id: string | null
          listing_snapshot: Json | null
          market_listing_id: string | null
          notes: string | null
          original_url: string
          property_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          download_method?: string | null
          downloaded_at?: string
          file_size?: number | null
          id?: string
          listing_id?: string | null
          listing_snapshot?: Json | null
          market_listing_id?: string | null
          notes?: string | null
          original_url: string
          property_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          download_method?: string | null
          downloaded_at?: string
          file_size?: number | null
          id?: string
          listing_id?: string | null
          listing_snapshot?: Json | null
          market_listing_id?: string | null
          notes?: string | null
          original_url?: string
          property_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_brochures_market_listing_id_fkey"
            columns: ["market_listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_brochures_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_listing_links: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          link_type: string
          market_listing_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          market_listing_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          link_type?: string
          market_listing_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_listing_links_asset_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_listing_links_market_listing_id_fkey"
            columns: ["market_listing_id"]
            isOneToOne: false
            referencedRelation: "market_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      property_permits: {
        Row: {
          applied_date: string | null
          completed_date: string | null
          contractor_name: string | null
          created_at: string
          description: string | null
          estimated_value: number | null
          fetched_at: string
          id: string
          issued_date: string | null
          permit_class: string | null
          permit_number: string
          permit_type: string
          property_id: string
          raw_data: Json | null
          status: string | null
        }
        Insert: {
          applied_date?: string | null
          completed_date?: string | null
          contractor_name?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          fetched_at?: string
          id?: string
          issued_date?: string | null
          permit_class?: string | null
          permit_number: string
          permit_type: string
          property_id: string
          raw_data?: Json | null
          status?: string | null
        }
        Update: {
          applied_date?: string | null
          completed_date?: string | null
          contractor_name?: string | null
          created_at?: string
          description?: string | null
          estimated_value?: number | null
          fetched_at?: string
          id?: string
          issued_date?: string | null
          permit_class?: string | null
          permit_number?: string
          permit_type?: string
          property_id?: string
          raw_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_permits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          id: string
          photo_url: string
          property_id: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url: string
          property_id: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          photo_url?: string
          property_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_photos_asset_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_tenants: {
        Row: {
          created_at: string
          id: string
          lease_expiry: string | null
          notes: string | null
          property_id: string
          size_sf: number | null
          tenant_name: string
          tracked_at: string
          tracked_by: string | null
          unit_number: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lease_expiry?: string | null
          notes?: string | null
          property_id: string
          size_sf?: number | null
          tenant_name: string
          tracked_at?: string
          tracked_by?: string | null
          unit_number?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lease_expiry?: string | null
          notes?: string | null
          property_id?: string
          size_sf?: number | null
          tenant_name?: string
          tracked_at?: string
          tracked_by?: string | null
          unit_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_follow_up_dates: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          id: string
          notes: string | null
          prospect_id: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          prospect_id: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          prospect_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_follow_up_dates_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          budget: number | null
          commission: number | null
          company: string | null
          created_at: string
          email: string | null
          estimated_value: number | null
          follow_up_date: string | null
          id: string
          loading: string | null
          max_size: number | null
          min_size: number | null
          name: string
          notes: string | null
          occupancy_date: string | null
          org_id: string | null
          phone: string | null
          prospect_type: string | null
          referral: string | null
          requirements: string | null
          source: string | null
          status: string
          updated_at: string
          use_type: string | null
          user_id: string
          yard_required: boolean | null
        }
        Insert: {
          budget?: number | null
          commission?: number | null
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          loading?: string | null
          max_size?: number | null
          min_size?: number | null
          name: string
          notes?: string | null
          occupancy_date?: string | null
          org_id?: string | null
          phone?: string | null
          prospect_type?: string | null
          referral?: string | null
          requirements?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          use_type?: string | null
          user_id: string
          yard_required?: boolean | null
        }
        Update: {
          budget?: number | null
          commission?: number | null
          company?: string | null
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          loading?: string | null
          max_size?: number | null
          min_size?: number | null
          name?: string
          notes?: string | null
          occupancy_date?: string | null
          org_id?: string | null
          phone?: string | null
          prospect_type?: string | null
          referral?: string | null
          requirements?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          use_type?: string | null
          user_id?: string
          yard_required?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          filters: Json
          id: string
          is_active: boolean
          issue_id: string | null
          listing_ids: string[] | null
          listing_snapshot: Json | null
          org_id: string | null
          report_type: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          filters?: Json
          id?: string
          is_active?: boolean
          issue_id?: string | null
          listing_ids?: string[] | null
          listing_snapshot?: Json | null
          org_id?: string | null
          report_type?: string
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          filters?: Json
          id?: string
          is_active?: boolean
          issue_id?: string | null
          listing_ids?: string[] | null
          listing_snapshot?: Json | null
          org_id?: string | null
          report_type?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_links_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      sheet_connections: {
        Row: {
          connection_type: string
          created_at: string
          google_sheet_id: string | null
          id: string
          is_workspace_connection: boolean | null
          last_synced_at: string | null
          sheet_name: string
          sheet_url: string
          tab_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          google_sheet_id?: string | null
          id?: string
          is_workspace_connection?: boolean | null
          last_synced_at?: string | null
          sheet_name: string
          sheet_url: string
          tab_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          google_sheet_id?: string | null
          id?: string
          is_workspace_connection?: boolean | null
          last_synced_at?: string | null
          sheet_name?: string
          sheet_url?: string
          tab_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          rows_imported: number | null
          rows_read: number | null
          rows_skipped: number | null
          run_type: string
          skipped_breakdown: Json | null
          started_at: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          rows_imported?: number | null
          rows_read?: number | null
          rows_skipped?: number | null
          run_type: string
          skipped_breakdown?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          rows_imported?: number | null
          rows_read?: number | null
          rows_skipped?: number | null
          run_type?: string
          skipped_breakdown?: Json | null
          started_at?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      sync_settings: {
        Row: {
          evening_sync_time: string
          google_credentials_expired: boolean
          id: string
          last_scheduled_run_at: string | null
          last_scheduled_run_status: string | null
          morning_sync_time: string
          scheduled_sync_enabled: boolean
          size_threshold_max: number
          size_threshold_min: number
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          evening_sync_time?: string
          google_credentials_expired?: boolean
          id?: string
          last_scheduled_run_at?: string | null
          last_scheduled_run_status?: string | null
          morning_sync_time?: string
          scheduled_sync_enabled?: boolean
          size_threshold_max?: number
          size_threshold_min?: number
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          evening_sync_time?: string
          google_credentials_expired?: boolean
          id?: string
          last_scheduled_run_at?: string | null
          last_scheduled_run_status?: string | null
          morning_sync_time?: string
          scheduled_sync_enabled?: boolean
          size_threshold_max?: number
          size_threshold_min?: number
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          address: string
          buyer_tenant_company: string | null
          buyer_tenant_name: string | null
          city: string
          closing_date: string | null
          commission_amount: number | null
          commission_percent: number | null
          created_at: string
          created_by: string | null
          display_address: string | null
          est_op_costs_psf: number | null
          id: string
          lease_rate_psf: number | null
          lease_term_months: number | null
          listing_broker_company: string | null
          listing_broker_name: string | null
          listing_id: string | null
          listing_removal_date: string | null
          market_listing_id: string | null
          market_listing_snapshot: Json | null
          months_gross_fixturing: number | null
          months_net_free_rent: number | null
          notes: string | null
          org_id: string | null
          property_id: string | null
          sale_price: number | null
          seller_landlord_company: string | null
          seller_landlord_name: string | null
          selling_broker_company: string | null
          selling_broker_name: string | null
          size_sf: number
          submarket: string
          ti_allowance_psf: number | null
          transaction_date: string | null
          transaction_type: string
          updated_at: string
          year1_lease_rate_psf: number | null
        }
        Insert: {
          address: string
          buyer_tenant_company?: string | null
          buyer_tenant_name?: string | null
          city?: string
          closing_date?: string | null
          commission_amount?: number | null
          commission_percent?: number | null
          created_at?: string
          created_by?: string | null
          display_address?: string | null
          est_op_costs_psf?: number | null
          id?: string
          lease_rate_psf?: number | null
          lease_term_months?: number | null
          listing_broker_company?: string | null
          listing_broker_name?: string | null
          listing_id?: string | null
          listing_removal_date?: string | null
          market_listing_id?: string | null
          market_listing_snapshot?: Json | null
          months_gross_fixturing?: number | null
          months_net_free_rent?: number | null
          notes?: string | null
          org_id?: string | null
          property_id?: string | null
          sale_price?: number | null
          seller_landlord_company?: string | null
          seller_landlord_name?: string | null
          selling_broker_company?: string | null
          selling_broker_name?: string | null
          size_sf?: number
          submarket?: string
          ti_allowance_psf?: number | null
          transaction_date?: string | null
          transaction_type: string
          updated_at?: string
          year1_lease_rate_psf?: number | null
        }
        Update: {
          address?: string
          buyer_tenant_company?: string | null
          buyer_tenant_name?: string | null
          city?: string
          closing_date?: string | null
          commission_amount?: number | null
          commission_percent?: number | null
          created_at?: string
          created_by?: string | null
          display_address?: string | null
          est_op_costs_psf?: number | null
          id?: string
          lease_rate_psf?: number | null
          lease_term_months?: number | null
          listing_broker_company?: string | null
          listing_broker_name?: string | null
          listing_id?: string | null
          listing_removal_date?: string | null
          market_listing_id?: string | null
          market_listing_snapshot?: Json | null
          months_gross_fixturing?: number | null
          months_net_free_rent?: number | null
          notes?: string | null
          org_id?: string | null
          property_id?: string | null
          sale_price?: number | null
          seller_landlord_company?: string | null
          seller_landlord_name?: string | null
          selling_broker_company?: string | null
          selling_broker_name?: string | null
          size_sf?: number
          submarket?: string
          ti_allowance_psf?: number | null
          transaction_date?: string | null
          transaction_type?: string
          updated_at?: string
          year1_lease_rate_psf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_run_sync: { Args: { _user_id: string }; Returns: boolean }
      check_invite_rate_limit: {
        Args: { _ip_address: string }
        Returns: boolean
      }
      ensure_user_org: { Args: { _user_id: string }; Returns: string }
      generate_invite_code: { Args: never; Returns: string }
      generate_invite_code_v2: { Args: never; Returns: string }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_sync_operator: { Args: { _user_id: string }; Returns: boolean }
      make_first_user_admin: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "member" | "sync_operator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "sync_operator"],
    },
  },
} as const
