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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      agent_parsing_logs: {
        Row: {
          context: Json | null
          created_at: string
          description: string
          error_message: string | null
          id: string
          processing_time_ms: number | null
          result: Json | null
          success: boolean
          type: string | null
          user_id: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          description: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          result?: Json | null
          success?: boolean
          type?: string | null
          user_id: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          description?: string
          error_message?: string | null
          id?: string
          processing_time_ms?: number | null
          result?: Json | null
          success?: boolean
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      agent_refinement_logs: {
        Row: {
          adjustments: Json | null
          created_at: string
          error_message: string | null
          feedback: string | null
          id: string
          original_structure: Json
          processing_time_ms: number | null
          result: Json | null
          success: boolean
          user_id: string
        }
        Insert: {
          adjustments?: Json | null
          created_at?: string
          error_message?: string | null
          feedback?: string | null
          id?: string
          original_structure: Json
          processing_time_ms?: number | null
          result?: Json | null
          success?: boolean
          user_id: string
        }
        Update: {
          adjustments?: Json | null
          created_at?: string
          error_message?: string | null
          feedback?: string | null
          id?: string
          original_structure?: Json
          processing_time_ms?: number | null
          result?: Json | null
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      alert_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          default_filters: Json | null
          description: string
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          name: string
          popularity_score: number | null
          success_rate: number | null
          tags: string[] | null
          template_config: Json
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_filters?: Json | null
          description: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name: string
          popularity_score?: number | null
          success_rate?: number | null
          tags?: string[] | null
          template_config: Json
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          default_filters?: Json | null
          description?: string
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          name?: string
          popularity_score?: number | null
          success_rate?: number | null
          tags?: string[] | null
          template_config?: Json
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      alert_triggers: {
        Row: {
          accuracy_score: number | null
          action_taken: string | null
          alert_id: string
          confidence_score: number
          context_pack: Json
          id: string
          market_context: Json
          price_change_1h: number | null
          price_change_24h: number | null
          signal_values: Json
          triggered_at: string
          user_feedback: Json | null
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          action_taken?: string | null
          alert_id: string
          confidence_score: number
          context_pack?: Json
          id?: string
          market_context: Json
          price_change_1h?: number | null
          price_change_24h?: number | null
          signal_values: Json
          triggered_at?: string
          user_feedback?: Json | null
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          action_taken?: string | null
          alert_id?: string
          confidence_score?: number
          context_pack?: Json
          id?: string
          market_context?: Json
          price_change_1h?: number | null
          price_change_24h?: number | null
          signal_values?: Json
          triggered_at?: string
          user_feedback?: Json | null
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_triggers_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          adaptive_baselines: boolean | null
          ai_context: Json | null
          confidence_threshold: number | null
          cooldown_minutes: number | null
          created_at: string
          description: string | null
          expires_at: string | null
          false_positive_count: number | null
          filters: Json
          id: string
          last_triggered_at: string | null
          learning_enabled: boolean | null
          name: string
          priority: string
          routing: Json
          sequence_config: Json | null
          signals: Json
          status: string
          success_rate: number | null
          tags: string[] | null
          trigger_count: number | null
          updated_at: string
          user_feedback_score: number | null
          user_id: string
          version: number
        }
        Insert: {
          adaptive_baselines?: boolean | null
          ai_context?: Json | null
          confidence_threshold?: number | null
          cooldown_minutes?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          false_positive_count?: number | null
          filters?: Json
          id?: string
          last_triggered_at?: string | null
          learning_enabled?: boolean | null
          name: string
          priority?: string
          routing?: Json
          sequence_config?: Json | null
          signals?: Json
          status?: string
          success_rate?: number | null
          tags?: string[] | null
          trigger_count?: number | null
          updated_at?: string
          user_feedback_score?: number | null
          user_id: string
          version?: number
        }
        Update: {
          adaptive_baselines?: boolean | null
          ai_context?: Json | null
          confidence_threshold?: number | null
          cooldown_minutes?: number | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          false_positive_count?: number | null
          filters?: Json
          id?: string
          last_triggered_at?: string | null
          learning_enabled?: boolean | null
          name?: string
          priority?: string
          routing?: Json
          sequence_config?: Json | null
          signals?: Json
          status?: string
          success_rate?: number | null
          tags?: string[] | null
          trigger_count?: number | null
          updated_at?: string
          user_feedback_score?: number | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      Alerts: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
        }
        Relationships: []
      }
      feedback_tracking: {
        Row: {
          created_at: string
          dismissed_count: number
          feedback_count: number
          first_feedback_submitted_at: string | null
          id: string
          second_feedback_submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_count?: number
          feedback_count?: number
          first_feedback_submitted_at?: string | null
          id?: string
          second_feedback_submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_count?: number
          feedback_count?: number
          first_feedback_submitted_at?: string | null
          id?: string
          second_feedback_submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_context: {
        Row: {
          asset_symbol: string
          bid_ask_spread: number | null
          correlation_breaks: number | null
          depth_imbalance: number | null
          exchange_inflows: number | null
          exchange_outflows: number | null
          fear_greed_index: number | null
          funding_rate: number | null
          id: string
          liquidation_risk: number | null
          market_cap: number | null
          news_sentiment: number | null
          open_interest: number | null
          price: number
          social_sentiment: number | null
          timestamp: string
          volatility: number | null
          volume_24h: number | null
          whale_activity_score: number | null
        }
        Insert: {
          asset_symbol: string
          bid_ask_spread?: number | null
          correlation_breaks?: number | null
          depth_imbalance?: number | null
          exchange_inflows?: number | null
          exchange_outflows?: number | null
          fear_greed_index?: number | null
          funding_rate?: number | null
          id?: string
          liquidation_risk?: number | null
          market_cap?: number | null
          news_sentiment?: number | null
          open_interest?: number | null
          price: number
          social_sentiment?: number | null
          timestamp?: string
          volatility?: number | null
          volume_24h?: number | null
          whale_activity_score?: number | null
        }
        Update: {
          asset_symbol?: string
          bid_ask_spread?: number | null
          correlation_breaks?: number | null
          depth_imbalance?: number | null
          exchange_inflows?: number | null
          exchange_outflows?: number | null
          fear_greed_index?: number | null
          funding_rate?: number | null
          id?: string
          liquidation_risk?: number | null
          market_cap?: number | null
          news_sentiment?: number | null
          open_interest?: number | null
          price?: number
          social_sentiment?: number | null
          timestamp?: string
          volatility?: number | null
          volume_24h?: number | null
          whale_activity_score?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          auto_pause_threshold: number | null
          channels: Json
          created_at: string
          custom_sounds: Json | null
          grouping_enabled: boolean | null
          learning_rate: number | null
          max_daily_alerts: number | null
          priority_override: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sound_enabled: boolean | null
          sound_volume: number | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_pause_threshold?: number | null
          channels?: Json
          created_at?: string
          custom_sounds?: Json | null
          grouping_enabled?: boolean | null
          learning_rate?: number | null
          max_daily_alerts?: number | null
          priority_override?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          sound_volume?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_pause_threshold?: number | null
          channels?: Json
          created_at?: string
          custom_sounds?: Json | null
          grouping_enabled?: boolean | null
          learning_rate?: number | null
          max_daily_alerts?: number | null
          priority_override?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sound_enabled?: boolean | null
          sound_volume?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signal_sources: {
        Row: {
          asset_symbol: string | null
          change_rate: number | null
          confidence: number | null
          current_value: number | null
          data_quality: string | null
          id: string
          last_updated: string
          previous_value: number | null
          raw_data: Json | null
          source_name: string
          source_type: string
          z_score: number | null
        }
        Insert: {
          asset_symbol?: string | null
          change_rate?: number | null
          confidence?: number | null
          current_value?: number | null
          data_quality?: string | null
          id?: string
          last_updated?: string
          previous_value?: number | null
          raw_data?: Json | null
          source_name: string
          source_type: string
          z_score?: number | null
        }
        Update: {
          asset_symbol?: string | null
          change_rate?: number | null
          confidence?: number | null
          current_value?: number | null
          data_quality?: string | null
          id?: string
          last_updated?: string
          previous_value?: number | null
          raw_data?: Json | null
          source_name?: string
          source_type?: string
          z_score?: number | null
        }
        Relationships: []
      }
      whale_activities: {
        Row: {
          action: string
          amount: number
          asset_symbol: string
          block_number: number | null
          confidence: number | null
          exchange: string | null
          id: string
          impact_score: number | null
          metadata: Json | null
          price: number | null
          timestamp: string
          transaction_hash: string
          whale_address_id: string
        }
        Insert: {
          action: string
          amount: number
          asset_symbol: string
          block_number?: number | null
          confidence?: number | null
          exchange?: string | null
          id?: string
          impact_score?: number | null
          metadata?: Json | null
          price?: number | null
          timestamp?: string
          transaction_hash: string
          whale_address_id: string
        }
        Update: {
          action?: string
          amount?: number
          asset_symbol?: string
          block_number?: number | null
          confidence?: number | null
          exchange?: string | null
          id?: string
          impact_score?: number | null
          metadata?: Json | null
          price?: number | null
          timestamp?: string
          transaction_hash?: string
          whale_address_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whale_activities_whale_address_id_fkey"
            columns: ["whale_address_id"]
            isOneToOne: false
            referencedRelation: "whale_addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      whale_addresses: {
        Row: {
          address: string
          category: string
          confidence_score: number
          created_at: string
          id: string
          label: string | null
          last_activity: string | null
          metadata: Json | null
          risk_level: string | null
          success_rate: number | null
          total_volume: number | null
          updated_at: string
        }
        Insert: {
          address: string
          category: string
          confidence_score?: number
          created_at?: string
          id?: string
          label?: string | null
          last_activity?: string | null
          metadata?: Json | null
          risk_level?: string | null
          success_rate?: number | null
          total_volume?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          category?: string
          confidence_score?: number
          created_at?: string
          id?: string
          label?: string | null
          last_activity?: string | null
          metadata?: Json | null
          risk_level?: string | null
          success_rate?: number | null
          total_volume?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      log_security_event: {
        Args: { details?: Json; event_type: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
