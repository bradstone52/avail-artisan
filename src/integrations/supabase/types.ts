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
      distribution_recipients: {
        Row: {
          company_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          notes: string | null
          title: string | null
        }
        Insert: {
          company_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          notes?: string | null
          title?: string | null
        }
        Update: {
          company_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          notes?: string | null
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
            referencedRelation: "listings"
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
          gross_rate: string | null
          id: string
          include_in_issue: boolean
          internal_note: string | null
          land_acres: string | null
          landlord: string | null
          last_verified_date: string | null
          link: string | null
          listing_id: string
          listing_type: string | null
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
          gross_rate?: string | null
          id?: string
          include_in_issue?: boolean
          internal_note?: string | null
          land_acres?: string | null
          landlord?: string | null
          last_verified_date?: string | null
          link?: string | null
          listing_id: string
          listing_type?: string | null
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
          gross_rate?: string | null
          id?: string
          include_in_issue?: boolean
          internal_note?: string | null
          land_acres?: string | null
          landlord?: string | null
          last_verified_date?: string | null
          link?: string | null
          listing_id?: string
          listing_type?: string | null
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
