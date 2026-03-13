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
      airport_transfers: {
        Row: {
          airport_id: string
          car_type: Database["public"]["Enums"]["car_type"]
          created_at: string | null
          id: string
          price: number
        }
        Insert: {
          airport_id: string
          car_type: Database["public"]["Enums"]["car_type"]
          created_at?: string | null
          id?: string
          price?: number
        }
        Update: {
          airport_id?: string
          car_type?: Database["public"]["Enums"]["car_type"]
          created_at?: string | null
          id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "airport_transfers_airport_id_fkey"
            columns: ["airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
        ]
      }
      airports: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name_ar: string
          name_en: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name_ar: string
          name_en: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name_ar?: string
          name_en?: string
        }
        Relationships: []
      }
      cars: {
        Row: {
          car_type: Database["public"]["Enums"]["car_type"]
          created_at: string | null
          id: string
          is_active: boolean | null
          max_pax: number
          min_pax: number
          name_ar: string
          name_en: string
          price_per_day_high: number
          price_per_day_low: number
          price_per_day_mid: number
          updated_at: string | null
        }
        Insert: {
          car_type: Database["public"]["Enums"]["car_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_pax: number
          min_pax: number
          name_ar: string
          name_en: string
          price_per_day_high?: number
          price_per_day_low?: number
          price_per_day_mid?: number
          updated_at?: string | null
        }
        Update: {
          car_type?: Database["public"]["Enums"]["car_type"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_pax?: number
          min_pax?: number
          name_ar?: string
          name_en?: string
          price_per_day_high?: number
          price_per_day_low?: number
          price_per_day_mid?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string | null
          id: string
          name_ar: string
          name_en: string
          sort_order: number | null
          supports_view: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name_ar: string
          name_en: string
          sort_order?: number | null
          supports_view?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          sort_order?: number | null
          supports_view?: boolean | null
        }
        Relationships: []
      }
      city_routes: {
        Row: {
          arrival_airport_id: string | null
          city_id: string
          created_at: string | null
          departure_airport_id: string | null
          id: string
          nights_in_city: number
          route_order: number
          total_nights: number
        }
        Insert: {
          arrival_airport_id?: string | null
          city_id: string
          created_at?: string | null
          departure_airport_id?: string | null
          id?: string
          nights_in_city: number
          route_order?: number
          total_nights: number
        }
        Update: {
          arrival_airport_id?: string | null
          city_id?: string
          created_at?: string | null
          departure_airport_id?: string | null
          id?: string
          nights_in_city?: number
          route_order?: number
          total_nights?: number
        }
        Relationships: [
          {
            foreignKeyName: "city_routes_arrival_airport_id_fkey"
            columns: ["arrival_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_routes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_routes_departure_airport_id_fkey"
            columns: ["departure_airport_id"]
            isOneToOne: false
            referencedRelation: "airports"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          city_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name_ar: string
          name_en: string
          price_double: number
          price_double_view: number | null
          price_single: number
          price_single_view: number | null
          price_triple: number
          price_triple_view: number | null
          tier: Database["public"]["Enums"]["hotel_tier"]
          updated_at: string | null
        }
        Insert: {
          city_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar: string
          name_en: string
          price_double?: number
          price_double_view?: number | null
          price_single?: number
          price_single_view?: number | null
          price_triple?: number
          price_triple_view?: number | null
          tier?: Database["public"]["Enums"]["hotel_tier"]
          updated_at?: string | null
        }
        Update: {
          city_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name_ar?: string
          name_en?: string
          price_double?: number
          price_double_view?: number | null
          price_single?: number
          price_single_view?: number | null
          price_triple?: number
          price_triple_view?: number | null
          tier?: Database["public"]["Enums"]["hotel_tier"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotels_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      mandatory_services: {
        Row: {
          created_at: string | null
          id: string
          insurance_price_per_day_per_pax: number
          sim_card_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          insurance_price_per_day_per_pax?: number
          sim_card_price?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          insurance_price_per_day_per_pax?: number
          sim_card_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          active_season: Database["public"]["Enums"]["season_type"]
          base_currency: string | null
          created_at: string | null
          exchange_rate_usd_to_sar: number | null
          free_sim_cards_allowance: number | null
          id: string
          profit_margin: number
          updated_at: string | null
        }
        Insert: {
          active_season?: Database["public"]["Enums"]["season_type"]
          base_currency?: string | null
          created_at?: string | null
          exchange_rate_usd_to_sar?: number | null
          free_sim_cards_allowance?: number | null
          id?: string
          profit_margin?: number
          updated_at?: string | null
        }
        Update: {
          active_season?: Database["public"]["Enums"]["season_type"]
          base_currency?: string | null
          created_at?: string | null
          exchange_rate_usd_to_sar?: number | null
          free_sim_cards_allowance?: number | null
          id?: string
          profit_margin?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      car_pricing: {
        Row: {
          id: string
          min_pax: number
          max_pax: number
          price_per_day: number
          description_ar: string | null
          description_en: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          min_pax: number
          max_pax: number
          price_per_day: number
          description_ar?: string | null
          description_en?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          min_pax?: number
          max_pax?: number
          price_per_day?: number
          description_ar?: string | null
          description_en?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hotel_offers: {
        Row: {
          id: string
          category: string
          city: string
          hotel_name: string
          dbl_view: number
          dbl_no_view: number
          trbl_view: number
          trbl_no_view: number
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          category: string
          city: string
          hotel_name: string
          dbl_view?: number
          dbl_no_view?: number
          trbl_view?: number
          trbl_no_view?: number
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          category?: string
          city?: string
          hotel_name?: string
          dbl_view?: number
          dbl_no_view?: number
          trbl_view?: number
          trbl_no_view?: number
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      car_type: "sedan" | "minivan" | "van" | "sprinter"
      hotel_tier: "economy" | "standard" | "superior" | "deluxe" | "luxury"
      offer_tier_type: "tier_1" | "tier_2" | "tier_3" | "tier_4" | "tier_5"
      hotel_category: "عرض 1" | "عرض 2" | "عرض 3" | "عرض 4" | "عرض 5" | "عرض 6" | "هنيمون 1" | "هنيمون 2" | "هنيمون 3" | "هنيمون 4" | "هنيمون 5" | "هنيمون 6"
      season_type: "high" | "low" | "mid"
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
      car_type: ["sedan", "minivan", "van", "sprinter"],
      hotel_tier: ["economy", "standard", "superior", "deluxe", "luxury"],
      season_type: ["high", "low", "mid"],
    },
  },
} as const
