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
      confirmations: {
        Row: {
          comment: string | null
          decided_at: string
          decision: Database["public"]["Enums"]["confirmation_decision"]
          id: string
          match_proposal_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          comment?: string | null
          decided_at?: string
          decision: Database["public"]["Enums"]["confirmation_decision"]
          id?: string
          match_proposal_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          comment?: string | null
          decided_at?: string
          decision?: Database["public"]["Enums"]["confirmation_decision"]
          id?: string
          match_proposal_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "confirmations_match_proposal_id_fkey"
            columns: ["match_proposal_id"]
            isOneToOne: false
            referencedRelation: "match_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          date: string
          description: string | null
          id: string
          location: string
          organiser_id: string | null
          promotion_name: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          date: string
          description?: string | null
          id?: string
          location: string
          organiser_id?: string | null
          promotion_name?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          location?: string
          organiser_id?: string | null
          promotion_name?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      fight_slots: {
        Row: {
          created_at: string
          event_id: string
          id: string
          slot_number: number
          status: Database["public"]["Enums"]["fight_slot_status"]
          updated_at: string
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          slot_number?: number
          status?: Database["public"]["Enums"]["fight_slot_status"]
          updated_at?: string
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          slot_number?: number
          status?: Database["public"]["Enums"]["fight_slot_status"]
          updated_at?: string
          weight_class?: Database["public"]["Enums"]["weight_class"]
        }
        Relationships: [
          {
            foreignKeyName: "fight_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      fighter_gym_links: {
        Row: {
          created_at: string
          fighter_id: string
          gym_id: string
          id: string
          is_primary: boolean
        }
        Insert: {
          created_at?: string
          fighter_id: string
          gym_id: string
          id?: string
          is_primary?: boolean
        }
        Update: {
          created_at?: string
          fighter_id?: string
          gym_id?: string
          id?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fighter_gym_links_fighter_id_fkey"
            columns: ["fighter_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fighter_gym_links_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      fighter_profiles: {
        Row: {
          available: boolean
          bio: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          created_by_coach_id: string | null
          height: string | null
          id: string
          name: string
          reach: string | null
          record_draws: number
          record_losses: number
          record_wins: number
          style: Database["public"]["Enums"]["fighting_style"] | null
          updated_at: string
          user_id: string | null
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Insert: {
          available?: boolean
          bio?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          created_by_coach_id?: string | null
          height?: string | null
          id?: string
          name: string
          reach?: string | null
          record_draws?: number
          record_losses?: number
          record_wins?: number
          style?: Database["public"]["Enums"]["fighting_style"] | null
          updated_at?: string
          user_id?: string | null
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Update: {
          available?: boolean
          bio?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          created_by_coach_id?: string | null
          height?: string | null
          id?: string
          name?: string
          reach?: string | null
          record_draws?: number
          record_losses?: number
          record_wins?: number
          style?: Database["public"]["Enums"]["fighting_style"] | null
          updated_at?: string
          user_id?: string | null
          weight_class?: Database["public"]["Enums"]["weight_class"]
        }
        Relationships: []
      }
      gyms: {
        Row: {
          coach_id: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          description: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          coach_id?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          coach_id?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_proposals: {
        Row: {
          created_at: string
          fight_slot_id: string
          fighter_a_id: string
          fighter_b_id: string
          id: string
          proposed_by: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          fight_slot_id: string
          fighter_a_id: string
          fighter_b_id: string
          id?: string
          proposed_by: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          fight_slot_id?: string
          fighter_a_id?: string
          fighter_b_id?: string
          id?: string
          proposed_by?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_proposals_fight_slot_id_fkey"
            columns: ["fight_slot_id"]
            isOneToOne: false
            referencedRelation: "fight_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_proposals_fighter_a_id_fkey"
            columns: ["fighter_a_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_proposals_fighter_b_id_fkey"
            columns: ["fighter_b_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          reference_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          reference_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          reference_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_notification: {
        Args: {
          _message?: string
          _reference_id?: string
          _title: string
          _type?: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "organiser" | "coach" | "fighter"
      confirmation_decision: "accepted" | "declined"
      country_code: "UK" | "USA" | "AUS"
      event_status: "draft" | "published" | "completed" | "cancelled"
      fight_slot_status: "open" | "proposed" | "confirmed" | "cancelled"
      fighting_style: "boxing" | "muay_thai" | "mma" | "kickboxing" | "bjj"
      match_status:
        | "pending_coach_a"
        | "pending_coach_b"
        | "pending_fighter_a"
        | "pending_fighter_b"
        | "confirmed"
        | "declined"
        | "withdrawn"
      notification_type:
        | "match_proposed"
        | "match_accepted"
        | "match_declined"
        | "match_confirmed"
        | "match_withdrawn"
        | "event_update"
        | "system"
      weight_class:
        | "strawweight"
        | "flyweight"
        | "bantamweight"
        | "featherweight"
        | "lightweight"
        | "super_lightweight"
        | "welterweight"
        | "super_welterweight"
        | "middleweight"
        | "super_middleweight"
        | "light_heavyweight"
        | "cruiserweight"
        | "heavyweight"
        | "super_heavyweight"
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
      app_role: ["organiser", "coach", "fighter"],
      confirmation_decision: ["accepted", "declined"],
      country_code: ["UK", "USA", "AUS"],
      event_status: ["draft", "published", "completed", "cancelled"],
      fight_slot_status: ["open", "proposed", "confirmed", "cancelled"],
      fighting_style: ["boxing", "muay_thai", "mma", "kickboxing", "bjj"],
      match_status: [
        "pending_coach_a",
        "pending_coach_b",
        "pending_fighter_a",
        "pending_fighter_b",
        "confirmed",
        "declined",
        "withdrawn",
      ],
      notification_type: [
        "match_proposed",
        "match_accepted",
        "match_declined",
        "match_confirmed",
        "match_withdrawn",
        "event_update",
        "system",
      ],
      weight_class: [
        "strawweight",
        "flyweight",
        "bantamweight",
        "featherweight",
        "lightweight",
        "super_lightweight",
        "welterweight",
        "super_welterweight",
        "middleweight",
        "super_middleweight",
        "light_heavyweight",
        "cruiserweight",
        "heavyweight",
        "super_heavyweight",
      ],
    },
  },
} as const
