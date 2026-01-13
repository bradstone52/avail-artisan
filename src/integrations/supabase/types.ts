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
          published_at: string | null
          removed_count: number
          secondary_contact_email: string | null
          secondary_contact_name: string | null
          secondary_contact_phone: string | null
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
          published_at?: string | null
          removed_count?: number
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
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
          published_at?: string | null
          removed_count?: number
          secondary_contact_email?: string | null
          secondary_contact_name?: string | null
          secondary_contact_phone?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
