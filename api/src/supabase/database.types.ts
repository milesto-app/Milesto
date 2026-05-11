export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      apple_subscription_accounts: {
        Row: {
          apple_signed_at: string | null;
          apple_status_code: number | null;
          auto_renew_status: boolean | null;
          created_at: string;
          environment: string;
          expires_at: string | null;
          id: string;
          last_synced_at: string;
          last_transaction_id: string | null;
          original_transaction_id: string;
          product_id: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          apple_signed_at?: string | null;
          apple_status_code?: number | null;
          auto_renew_status?: boolean | null;
          created_at?: string;
          environment: string;
          expires_at?: string | null;
          id?: string;
          last_synced_at?: string;
          last_transaction_id?: string | null;
          original_transaction_id: string;
          product_id?: string | null;
          status: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          apple_signed_at?: string | null;
          apple_status_code?: number | null;
          auto_renew_status?: boolean | null;
          created_at?: string;
          environment?: string;
          expires_at?: string | null;
          id?: string;
          last_synced_at?: string;
          last_transaction_id?: string | null;
          original_transaction_id?: string;
          product_id?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      apple_subscription_events: {
        Row: {
          environment: string | null;
          error_message: string | null;
          id: string;
          notification_type: string;
          notification_uuid: string;
          original_transaction_id: string | null;
          processed_at: string;
          result: string;
          subtype: string | null;
          user_id: string | null;
        };
        Insert: {
          environment?: string | null;
          error_message?: string | null;
          id?: string;
          notification_type: string;
          notification_uuid: string;
          original_transaction_id?: string | null;
          processed_at?: string;
          result: string;
          subtype?: string | null;
          user_id?: string | null;
        };
        Update: {
          environment?: string | null;
          error_message?: string | null;
          id?: string;
          notification_type?: string;
          notification_uuid?: string;
          original_transaction_id?: string | null;
          processed_at?: string;
          result?: string;
          subtype?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      coach_memories: {
        Row: {
          content: string;
          goal_id: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          goal_id: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content?: string;
          goal_id?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_memories_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      context_embeddings: {
        Row: {
          batch_id: string | null;
          content_text: string;
          content_type: string;
          created_at: string;
          embedding: string;
          goal_id: string;
          id: string;
          metadata: Json | null;
          user_id: string;
        };
        Insert: {
          batch_id?: string | null;
          content_text: string;
          content_type?: string;
          created_at?: string;
          embedding: string;
          goal_id: string;
          id?: string;
          metadata?: Json | null;
          user_id: string;
        };
        Update: {
          batch_id?: string | null;
          content_text?: string;
          content_type?: string;
          created_at?: string;
          embedding?: string;
          goal_id?: string;
          id?: string;
          metadata?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "context_embeddings_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "intake_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "context_embeddings_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          goal_id: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          goal_id: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          goal_id?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      debriefs: {
        Row: {
          created_at: string | null;
          date: string;
          goal_id: string;
          id: string;
          note: string;
          user_id: string;
          weekly_plan_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          goal_id: string;
          id?: string;
          note: string;
          user_id: string;
          weekly_plan_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          goal_id?: string;
          id?: string;
          note?: string;
          user_id?: string;
          weekly_plan_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "debriefs_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debriefs_weekly_plan_id_fkey";
            columns: ["weekly_plan_id"];
            isOneToOne: false;
            referencedRelation: "weekly_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      device_tokens: {
        Row: {
          created_at: string;
          environment: string;
          id: string;
          platform: string;
          token: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          environment?: string;
          id?: string;
          platform?: string;
          token: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          environment?: string;
          id?: string;
          platform?: string;
          token?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      generation_usage: {
        Row: {
          completion_tokens: number | null;
          created_at: string;
          generation_type: string;
          id: string;
          model: string | null;
          prompt_tokens: number | null;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          completion_tokens?: number | null;
          created_at?: string;
          generation_type: string;
          id?: string;
          model?: string | null;
          prompt_tokens?: number | null;
          usage_date?: string;
          user_id: string;
        };
        Update: {
          completion_tokens?: number | null;
          created_at?: string;
          generation_type?: string;
          id?: string;
          model?: string | null;
          prompt_tokens?: number | null;
          usage_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description: string;
          id: string;
          narrative_summary: string | null;
          profile_created_at: string | null;
          profile_data: Json | null;
          profile_embedded: boolean;
          profile_generation_attempts: number;
          roadmap_created_at: string | null;
          roadmap_generation_attempts: number;
          roadmap_generation_metadata: Json | null;
          roadmap_model_used: string | null;
          roadmap_status: string | null;
          roadmap_updated_at: string | null;
          status: string;
          target_date: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          user_motivation_quote: string | null;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description: string;
          id?: string;
          narrative_summary?: string | null;
          profile_created_at?: string | null;
          profile_data?: Json | null;
          profile_embedded?: boolean;
          profile_generation_attempts?: number;
          roadmap_created_at?: string | null;
          roadmap_generation_attempts?: number;
          roadmap_generation_metadata?: Json | null;
          roadmap_model_used?: string | null;
          roadmap_status?: string | null;
          roadmap_updated_at?: string | null;
          status?: string;
          target_date?: string | null;
          title: string;
          updated_at?: string;
          user_id: string;
          user_motivation_quote?: string | null;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          narrative_summary?: string | null;
          profile_created_at?: string | null;
          profile_data?: Json | null;
          profile_embedded?: boolean;
          profile_generation_attempts?: number;
          roadmap_created_at?: string | null;
          roadmap_generation_attempts?: number;
          roadmap_generation_metadata?: Json | null;
          roadmap_model_used?: string | null;
          roadmap_status?: string | null;
          roadmap_updated_at?: string | null;
          status?: string;
          target_date?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          user_motivation_quote?: string | null;
        };
        Relationships: [];
      };
      intake_batches: {
        Row: {
          batch_number: number;
          created_at: string;
          embedded: boolean;
          goal_id: string;
          id: string;
          is_answered: boolean;
        };
        Insert: {
          batch_number: number;
          created_at?: string;
          embedded?: boolean;
          goal_id: string;
          id?: string;
          is_answered?: boolean;
        };
        Update: {
          batch_number?: number;
          created_at?: string;
          embedded?: boolean;
          goal_id?: string;
          id?: string;
          is_answered?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "intake_batches_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      intake_questions: {
        Row: {
          answer_numeric: number | null;
          answer_text: string | null;
          answered_at: string | null;
          batch_id: string | null;
          batch_number: number;
          config: Json | null;
          created_at: string;
          goal_id: string;
          id: string;
          order_in_batch: number;
          question_text: string;
          question_type: string;
          selected_options: Json | null;
        };
        Insert: {
          answer_numeric?: number | null;
          answer_text?: string | null;
          answered_at?: string | null;
          batch_id?: string | null;
          batch_number: number;
          config?: Json | null;
          created_at?: string;
          goal_id: string;
          id?: string;
          order_in_batch: number;
          question_text: string;
          question_type: string;
          selected_options?: Json | null;
        };
        Update: {
          answer_numeric?: number | null;
          answer_text?: string | null;
          answered_at?: string | null;
          batch_id?: string | null;
          batch_number?: number;
          config?: Json | null;
          created_at?: string;
          goal_id?: string;
          id?: string;
          order_in_batch?: number;
          question_text?: string;
          question_type?: string;
          selected_options?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "intake_questions_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "intake_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "intake_questions_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          content: string | null;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          tool_call_id: string | null;
          tool_calls: Json | null;
          tool_name: string | null;
        };
        Insert: {
          content?: string | null;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          tool_call_id?: string | null;
          tool_calls?: Json | null;
          tool_name?: string | null;
        };
        Update: {
          content?: string | null;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          tool_call_id?: string | null;
          tool_calls?: Json | null;
          tool_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      milestones: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          description: string;
          expected_outcome: string;
          goal_id: string;
          id: string;
          is_monthly_checkpoint: boolean;
          monthly_summary: Json | null;
          order_index: number;
          target_month: number;
          target_week: number;
          title: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          description: string;
          expected_outcome: string;
          goal_id: string;
          id?: string;
          is_monthly_checkpoint?: boolean;
          monthly_summary?: Json | null;
          order_index: number;
          target_month: number;
          target_week: number;
          title: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          description?: string;
          expected_outcome?: string;
          goal_id?: string;
          id?: string;
          is_monthly_checkpoint?: boolean;
          monthly_summary?: Json | null;
          order_index?: number;
          target_month?: number;
          target_week?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_sends: {
        Row: {
          body: string;
          id: string;
          sent_at: string;
          title: string;
          user_id: string;
        };
        Insert: {
          body: string;
          id?: string;
          sent_at?: string;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string;
          id?: string;
          sent_at?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      processed_notifications: {
        Row: {
          notification_type: string;
          notification_uuid: string;
          received_at: string;
          subtype: string | null;
        };
        Insert: {
          notification_type: string;
          notification_uuid: string;
          received_at?: string;
          subtype?: string | null;
        };
        Update: {
          notification_type?: string;
          notification_uuid?: string;
          received_at?: string;
          subtype?: string | null;
        };
        Relationships: [];
      };
      subscription_overrides: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          id: string;
          reason: string;
          revoked_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at: string;
          id?: string;
          reason?: string;
          revoked_at?: string | null;
          status: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          id?: string;
          reason?: string;
          revoked_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      system_logs: {
        Row: {
          context: string | null;
          id: string;
          level: string;
          logged_at: string;
          message: string;
          metadata: Json | null;
          stack: string | null;
        };
        Insert: {
          context?: string | null;
          id?: string;
          level: string;
          logged_at?: string;
          message: string;
          metadata?: Json | null;
          stack?: string | null;
        };
        Update: {
          context?: string | null;
          id?: string;
          level?: string;
          logged_at?: string;
          message?: string;
          metadata?: Json | null;
          stack?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          birth_year: number | null;
          coach_id: number | null;
          created_at: string | null;
          first_name: string | null;
          id: string;
          language: string | null;
          last_name: string | null;
          subscription_apple_signed_at: string | null;
          subscription_auto_renew_status: boolean | null;
          subscription_environment: string | null;
          subscription_expires_at: string | null;
          subscription_original_transaction_id: string | null;
          subscription_product_id: string | null;
          subscription_status: string;
          subscription_verified_at: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          birth_year?: number | null;
          coach_id?: number | null;
          created_at?: string | null;
          first_name?: string | null;
          id: string;
          language?: string | null;
          last_name?: string | null;
          subscription_apple_signed_at?: string | null;
          subscription_auto_renew_status?: boolean | null;
          subscription_environment?: string | null;
          subscription_expires_at?: string | null;
          subscription_original_transaction_id?: string | null;
          subscription_product_id?: string | null;
          subscription_status?: string;
          subscription_verified_at?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          birth_year?: number | null;
          coach_id?: number | null;
          created_at?: string | null;
          first_name?: string | null;
          id?: string;
          language?: string | null;
          last_name?: string | null;
          subscription_apple_signed_at?: string | null;
          subscription_auto_renew_status?: boolean | null;
          subscription_environment?: string | null;
          subscription_expires_at?: string | null;
          subscription_original_transaction_id?: string | null;
          subscription_product_id?: string | null;
          subscription_status?: string;
          subscription_verified_at?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      weekly_plans: {
        Row: {
          created_at: string | null;
          expected_end_date: string | null;
          generation_context: Json | null;
          generation_metadata: Json | null;
          goal_id: string;
          id: string;
          is_fallback: boolean;
          milestone_id: string;
          model_used: string | null;
          objectives: Json;
          status: string;
          summary: Json | null;
          user_id: string;
          week_number: number;
          week_start_date: string;
        };
        Insert: {
          created_at?: string | null;
          expected_end_date?: string | null;
          generation_context?: Json | null;
          generation_metadata?: Json | null;
          goal_id: string;
          id?: string;
          is_fallback?: boolean;
          milestone_id: string;
          model_used?: string | null;
          objectives?: Json;
          status?: string;
          summary?: Json | null;
          user_id: string;
          week_number: number;
          week_start_date: string;
        };
        Update: {
          created_at?: string | null;
          expected_end_date?: string | null;
          generation_context?: Json | null;
          generation_metadata?: Json | null;
          goal_id?: string;
          id?: string;
          is_fallback?: boolean;
          milestone_id?: string;
          model_used?: string | null;
          objectives?: Json;
          status?: string;
          summary?: Json | null;
          user_id?: string;
          week_number?: number;
          week_start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_plans_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_plans_milestone_id_fkey";
            columns: ["milestone_id"];
            isOneToOne: false;
            referencedRelation: "milestones";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_tasks: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          description: string;
          estimated_minutes: number | null;
          goal_id: string;
          id: string;
          is_completed: boolean;
          is_fallback: boolean;
          order_index: number;
          title: string;
          user_id: string;
          weekly_plan_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          description: string;
          estimated_minutes?: number | null;
          goal_id: string;
          id?: string;
          is_completed?: boolean;
          is_fallback?: boolean;
          order_index: number;
          title: string;
          user_id: string;
          weekly_plan_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          description?: string;
          estimated_minutes?: number | null;
          goal_id?: string;
          id?: string;
          is_completed?: boolean;
          is_fallback?: boolean;
          order_index?: number;
          title?: string;
          user_id?: string;
          weekly_plan_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_tasks_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_tasks_weekly_plan_id_fkey";
            columns: ["weekly_plan_id"];
            isOneToOne: false;
            referencedRelation: "weekly_plans";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_goal_context: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          p_content_types?: string[];
          p_goal_id: string;
          p_user_id: string;
          query_embedding: string;
        };
        Returns: {
          content_text: string;
          content_type: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      pick_notification_candidates: {
        Args: {
          p_max_per_day: number;
          p_min_minutes_between: number;
          p_window_end_hour: number;
          p_window_start_hour: number;
        };
        Returns: {
          coach_id: number;
          goal_id: string;
          goal_title: string;
          language: string;
          local_hour: number;
          next_task_title: string;
          recent_completed_titles: string[];
          timezone: string;
          user_id: string;
          user_motivation_quote: string;
          weekly_objectives: Json;
          weekly_task_completed: number;
          weekly_task_total: number;
        }[];
      };
      reserve_generation: {
        Args: { p_limit: number; p_type: string; p_user_id: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
