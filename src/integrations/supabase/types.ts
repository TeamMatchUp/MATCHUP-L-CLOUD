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
      ad_enquiries: {
        Row: {
          budget_range: string | null
          company_name: string
          company_website: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          proposal: string
          status: string
        }
        Insert: {
          budget_range?: string | null
          company_name: string
          company_website?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          proposal: string
          status?: string
        }
        Update: {
          budget_range?: string | null
          company_name?: string
          company_website?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          proposal?: string
          status?: string
        }
        Relationships: []
      }
      coach_event_nominations: {
        Row: {
          coach_id: string
          created_at: string
          event_id: string
          fighter_id: string
          id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          event_id: string
          fighter_id: string
          id?: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          event_id?: string
          fighter_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_event_nominations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_event_nominations_fighter_id_fkey"
            columns: ["fighter_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          city: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          date: string
          description: string | null
          discipline: string | null
          event_type: string | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          organiser_id: string | null
          postcode: string | null
          promotion_name: string | null
          promotion_status: string | null
          status: Database["public"]["Enums"]["event_status"]
          ticket_enabled: boolean
          ticket_url: string | null
          title: string
          updated_at: string
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          date: string
          description?: string | null
          discipline?: string | null
          event_type?: string | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          organiser_id?: string | null
          postcode?: string | null
          promotion_name?: string | null
          promotion_status?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          ticket_enabled?: boolean
          ticket_url?: string | null
          title: string
          updated_at?: string
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          date?: string
          description?: string | null
          discipline?: string | null
          event_type?: string | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          organiser_id?: string | null
          postcode?: string | null
          promotion_name?: string | null
          promotion_status?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          ticket_enabled?: boolean
          ticket_url?: string | null
          title?: string
          updated_at?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      fight_results: {
        Row: {
          created_at: string
          event_id: string
          fighter_a_id: string
          fighter_b_id: string
          id: string
          method: string | null
          round: number | null
          time: string | null
          updated_at: string
          verification_status: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          fighter_a_id: string
          fighter_b_id: string
          id?: string
          method?: string | null
          round?: number | null
          time?: string | null
          updated_at?: string
          verification_status?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          fighter_a_id?: string
          fighter_b_id?: string
          id?: string
          method?: string | null
          round?: number | null
          time?: string | null
          updated_at?: string
          verification_status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fight_results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fight_results_fighter_a_id_fkey"
            columns: ["fighter_a_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fight_results_fighter_b_id_fkey"
            columns: ["fighter_b_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fight_results_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fight_slots: {
        Row: {
          card_position: string
          created_at: string
          event_id: string
          experience_level: string | null
          id: string
          max_weight_kg: number | null
          max_wins: number | null
          min_weight_kg: number | null
          min_wins: number | null
          slot_number: number
          status: Database["public"]["Enums"]["fight_slot_status"]
          updated_at: string
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Insert: {
          card_position?: string
          created_at?: string
          event_id: string
          experience_level?: string | null
          id?: string
          max_weight_kg?: number | null
          max_wins?: number | null
          min_weight_kg?: number | null
          min_wins?: number | null
          slot_number?: number
          status?: Database["public"]["Enums"]["fight_slot_status"]
          updated_at?: string
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Update: {
          card_position?: string
          created_at?: string
          event_id?: string
          experience_level?: string | null
          id?: string
          max_weight_kg?: number | null
          max_wins?: number | null
          min_weight_kg?: number | null
          min_wins?: number | null
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
      fighter_event_interests: {
        Row: {
          created_at: string
          event_id: string
          fighter_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          fighter_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          fighter_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fighter_event_interests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fighter_event_interests_fighter_id_fkey"
            columns: ["fighter_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
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
          role: string | null
          status: string
        }
        Insert: {
          created_at?: string
          fighter_id: string
          gym_id: string
          id?: string
          is_primary?: boolean
          role?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          fighter_id?: string
          gym_id?: string
          id?: string
          is_primary?: boolean
          role?: string | null
          status?: string
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
          amateur_draws: number
          amateur_losses: number
          amateur_wins: number
          available: boolean
          bio: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          created_by_coach_id: string | null
          date_of_birth: string | null
          discipline: string | null
          email: string | null
          fighting_substyle: string | null
          height: number | null
          id: string
          name: string
          profile_image: string | null
          reach: number | null
          record_draws: number
          record_losses: number
          record_wins: number
          stance: string | null
          style: Database["public"]["Enums"]["fighting_style"] | null
          updated_at: string
          user_id: string | null
          verified: boolean
          visibility: string
          walk_around_weight_kg: number | null
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Insert: {
          amateur_draws?: number
          amateur_losses?: number
          amateur_wins?: number
          available?: boolean
          bio?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          created_by_coach_id?: string | null
          date_of_birth?: string | null
          discipline?: string | null
          email?: string | null
          fighting_substyle?: string | null
          height?: number | null
          id?: string
          name: string
          profile_image?: string | null
          reach?: number | null
          record_draws?: number
          record_losses?: number
          record_wins?: number
          stance?: string | null
          style?: Database["public"]["Enums"]["fighting_style"] | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          visibility?: string
          walk_around_weight_kg?: number | null
          weight_class: Database["public"]["Enums"]["weight_class"]
        }
        Update: {
          amateur_draws?: number
          amateur_losses?: number
          amateur_wins?: number
          available?: boolean
          bio?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          created_by_coach_id?: string | null
          date_of_birth?: string | null
          discipline?: string | null
          email?: string | null
          fighting_substyle?: string | null
          height?: number | null
          id?: string
          name?: string
          profile_image?: string | null
          reach?: number | null
          record_draws?: number
          record_losses?: number
          record_wins?: number
          stance?: string | null
          style?: Database["public"]["Enums"]["fighting_style"] | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          visibility?: string
          walk_around_weight_kg?: number | null
          weight_class?: Database["public"]["Enums"]["weight_class"]
        }
        Relationships: []
      }
      fighter_records: {
        Row: {
          created_at: string
          draws: number
          fighter_id: string
          id: string
          losses: number
          no_contests: number
          updated_at: string
          updated_by_gym_id: string | null
          wins: number
        }
        Insert: {
          created_at?: string
          draws?: number
          fighter_id: string
          id?: string
          losses?: number
          no_contests?: number
          updated_at?: string
          updated_by_gym_id?: string | null
          wins?: number
        }
        Update: {
          created_at?: string
          draws?: number
          fighter_id?: string
          id?: string
          losses?: number
          no_contests?: number
          updated_at?: string
          updated_by_gym_id?: string | null
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "fighter_records_fighter_id_fkey"
            columns: ["fighter_id"]
            isOneToOne: true
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fighter_records_updated_by_gym_id_fkey"
            columns: ["updated_by_gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      fights: {
        Row: {
          created_at: string
          created_by_coach_id: string | null
          event_date: string | null
          event_id: string | null
          event_name: string | null
          fighter_a_id: string
          fighter_b_id: string
          id: string
          method: string | null
          opponent_gym: string | null
          opponent_name: string | null
          result: string
          round: number | null
          updated_at: string
          verification_status: Database["public"]["Enums"]["fight_verification_status"]
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_coach_id?: string | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          fighter_a_id: string
          fighter_b_id: string
          id?: string
          method?: string | null
          opponent_gym?: string | null
          opponent_name?: string | null
          result?: string
          round?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["fight_verification_status"]
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_coach_id?: string | null
          event_date?: string | null
          event_id?: string | null
          event_name?: string | null
          fighter_a_id?: string
          fighter_b_id?: string
          id?: string
          method?: string | null
          opponent_gym?: string | null
          opponent_name?: string | null
          result?: string
          round?: number | null
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["fight_verification_status"]
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fights_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fights_fighter_a_id_fkey"
            columns: ["fighter_a_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fights_fighter_b_id_fkey"
            columns: ["fighter_b_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fights_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "fighter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_claims: {
        Row: {
          claimant_email: string
          claimant_name: string
          claimant_role: string
          created_at: string
          gym_id: string
          id: string
          message: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          claimant_email: string
          claimant_name: string
          claimant_role: string
          created_at?: string
          gym_id: string
          id?: string
          message?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          claimant_email?: string
          claimant_name?: string
          claimant_role?: string
          created_at?: string
          gym_id?: string
          id?: string
          message?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_claims_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string | null
          city: string | null
          claimed: boolean | null
          coach_id: string | null
          contact_email: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          description: string | null
          discipline_tags: string | null
          id: string
          lat: number | null
          latitude: number | null
          listing_tier: string | null
          lng: number | null
          location: string | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          postcode: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          claimed?: boolean | null
          coach_id?: string | null
          contact_email?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          description?: string | null
          discipline_tags?: string | null
          id?: string
          lat?: number | null
          latitude?: number | null
          listing_tier?: string | null
          lng?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          claimed?: boolean | null
          coach_id?: string | null
          contact_email?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          description?: string | null
          discipline_tags?: string | null
          id?: string
          lat?: number | null
          latitude?: number | null
          listing_tier?: string | null
          lng?: number | null
          location?: string | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          postcode?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
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
          message: string | null
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
          message?: string | null
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
          message?: string | null
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
          country: string | null
          created_at: string
          full_name: string | null
          gym_id: string | null
          id: string
          marketing_opt_in: boolean
          notification_event_updates: boolean
          notification_match_proposals: boolean
          notification_match_updates: boolean
          notification_system: boolean
          onboarding_completed: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          gym_id?: string | null
          id: string
          marketing_opt_in?: boolean
          notification_event_updates?: boolean
          notification_match_proposals?: boolean
          notification_match_updates?: boolean
          notification_system?: boolean
          onboarding_completed?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          gym_id?: string | null
          id?: string
          marketing_opt_in?: boolean
          notification_event_updates?: boolean
          notification_match_proposals?: boolean
          notification_match_updates?: boolean
          notification_system?: boolean
          onboarding_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          boost_level: number | null
          created_at: string
          end_date: string | null
          id: string
          owner_id: string
          payment_status: string | null
          promotion_type: string
          start_date: string | null
          target_id: string
          updated_at: string
        }
        Insert: {
          boost_level?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          owner_id: string
          payment_status?: string | null
          promotion_type: string
          start_date?: string | null
          target_id: string
          updated_at?: string
        }
        Update: {
          boost_level?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          owner_id?: string
          payment_status?: string | null
          promotion_type?: string
          start_date?: string | null
          target_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      result_verifications: {
        Row: {
          created_at: string
          id: string
          result_id: string
          verification_action: string
          verifier_id: string
          verifier_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          result_id: string
          verification_action?: string
          verifier_id: string
          verifier_type: string
        }
        Update: {
          created_at?: string
          id?: string
          result_id?: string
          verification_action?: string
          verifier_id?: string
          verifier_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_verifications_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "fight_results"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          created_at: string
          event_id: string
          external_link: string | null
          id: string
          price: number | null
          quantity_available: number | null
          sales_end: string | null
          sales_start: string | null
          ticket_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          external_link?: string | null
          id?: string
          price?: number | null
          quantity_available?: number | null
          sales_end?: string | null
          sales_start?: string | null
          ticket_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          external_link?: string | null
          id?: string
          price?: number | null
          quantity_available?: number | null
          sales_end?: string | null
          sales_start?: string | null
          ticket_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      app_role: "organiser" | "coach" | "fighter" | "gym_owner" | "admin"
      confirmation_decision: "accepted" | "declined"
      country_code: "UK" | "USA" | "AUS"
      event_status: "draft" | "published" | "completed" | "cancelled"
      fight_slot_status: "open" | "proposed" | "confirmed" | "cancelled"
      fight_verification_status: "coach_verified" | "event_verified"
      fighting_style: "boxing" | "muay_thai" | "mma" | "kickboxing" | "bjj"
      match_status:
        | "pending_coach_a"
        | "pending_coach_b"
        | "pending_fighter_a"
        | "pending_fighter_b"
        | "confirmed"
        | "declined"
        | "withdrawn"
        | "pending"
      notification_type:
        | "match_proposed"
        | "match_accepted"
        | "match_declined"
        | "match_confirmed"
        | "match_withdrawn"
        | "event_update"
        | "system"
        | "gym_request"
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
      app_role: ["organiser", "coach", "fighter", "gym_owner", "admin"],
      confirmation_decision: ["accepted", "declined"],
      country_code: ["UK", "USA", "AUS"],
      event_status: ["draft", "published", "completed", "cancelled"],
      fight_slot_status: ["open", "proposed", "confirmed", "cancelled"],
      fight_verification_status: ["coach_verified", "event_verified"],
      fighting_style: ["boxing", "muay_thai", "mma", "kickboxing", "bjj"],
      match_status: [
        "pending_coach_a",
        "pending_coach_b",
        "pending_fighter_a",
        "pending_fighter_b",
        "confirmed",
        "declined",
        "withdrawn",
        "pending",
      ],
      notification_type: [
        "match_proposed",
        "match_accepted",
        "match_declined",
        "match_confirmed",
        "match_withdrawn",
        "event_update",
        "system",
        "gym_request",
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
