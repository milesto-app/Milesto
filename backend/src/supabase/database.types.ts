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
          task_ratings: Json | null;
          user_id: string;
          weekly_plan_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          date: string;
          goal_id: string;
          id?: string;
          note: string;
          task_ratings?: Json | null;
          user_id: string;
          weekly_plan_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string;
          goal_id?: string;
          id?: string;
          note?: string;
          task_ratings?: Json | null;
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
          created_at: string;
          generation_type: string;
          id: string;
          usage_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          generation_type: string;
          id?: string;
          usage_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          generation_type?: string;
          id?: string;
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
          roadmap_quality_scores: Json | null;
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
          roadmap_quality_scores?: Json | null;
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
          roadmap_quality_scores?: Json | null;
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
          is_fallback: boolean;
          quality_score: number | null;
        };
        Insert: {
          batch_number: number;
          created_at?: string;
          embedded?: boolean;
          goal_id: string;
          id?: string;
          is_answered?: boolean;
          is_fallback?: boolean;
          quality_score?: number | null;
        };
        Update: {
          batch_number?: number;
          created_at?: string;
          embedded?: boolean;
          goal_id?: string;
          id?: string;
          is_answered?: boolean;
          is_fallback?: boolean;
          quality_score?: number | null;
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
          target_date: string | null;
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
          target_date?: string | null;
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
          target_date?: string | null;
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
      notification_deliveries: {
        Row: {
          apns_response: Json | null;
          created_at: string;
          device_token: string;
          dismissed_at: string | null;
          id: string;
          job_id: string;
          opened_at: string | null;
          received_at: string | null;
          sent_at: string | null;
        };
        Insert: {
          apns_response?: Json | null;
          created_at?: string;
          device_token: string;
          dismissed_at?: string | null;
          id?: string;
          job_id: string;
          opened_at?: string | null;
          received_at?: string | null;
          sent_at?: string | null;
        };
        Update: {
          apns_response?: Json | null;
          created_at?: string;
          device_token?: string;
          dismissed_at?: string | null;
          id?: string;
          job_id?: string;
          opened_at?: string | null;
          received_at?: string | null;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "notification_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_experiments: {
        Row: {
          concluded_at: string | null;
          created_at: string;
          id: string;
          kind: string;
          started_at: string | null;
          status: string;
          variants: Json;
          winner: string | null;
        };
        Insert: {
          concluded_at?: string | null;
          created_at?: string;
          id: string;
          kind: string;
          started_at?: string | null;
          status?: string;
          variants?: Json;
          winner?: string | null;
        };
        Update: {
          concluded_at?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          started_at?: string | null;
          status?: string;
          variants?: Json;
          winner?: string | null;
        };
        Relationships: [];
      };
      notification_jobs: {
        Row: {
          attempts: number;
          claimed_at: string | null;
          claimed_by: string | null;
          created_at: string;
          dedup_key: string;
          experiment_id: string | null;
          id: string;
          kind: string;
          last_error: string | null;
          local_date: string | null;
          payload: Json;
          scheduled_for_utc: string;
          sent_at: string | null;
          sequence_id: string | null;
          sequence_step: number | null;
          skip_reason: string | null;
          status: string;
          tier: number;
          user_id: string;
          variant: string | null;
        };
        Insert: {
          attempts?: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          dedup_key: string;
          experiment_id?: string | null;
          id?: string;
          kind: string;
          last_error?: string | null;
          local_date?: string | null;
          payload?: Json;
          scheduled_for_utc: string;
          sent_at?: string | null;
          sequence_id?: string | null;
          sequence_step?: number | null;
          skip_reason?: string | null;
          status?: string;
          tier: number;
          user_id: string;
          variant?: string | null;
        };
        Update: {
          attempts?: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          created_at?: string;
          dedup_key?: string;
          experiment_id?: string | null;
          id?: string;
          kind?: string;
          last_error?: string | null;
          local_date?: string | null;
          payload?: Json;
          scheduled_for_utc?: string;
          sent_at?: string | null;
          sequence_id?: string | null;
          sequence_step?: number | null;
          skip_reason?: string | null;
          status?: string;
          tier?: number;
          user_id?: string;
          variant?: string | null;
        };
        Relationships: [];
      };
      notification_system_alerts: {
        Row: {
          created_at: string;
          id: string;
          kind: string;
          payload: Json;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind: string;
          payload?: Json;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: string;
          payload?: Json;
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
      profiles: {
        Row: {
          coach_id: number | null;
          created_at: string | null;
          date_of_birth: string | null;
          first_name: string | null;
          id: string;
          language: string | null;
          last_active_at: string | null;
          last_name: string | null;
          notif_enabled: boolean;
          notif_permission_requested_at: string | null;
          notif_permission_status: string;
          notif_preferences: Json;
          notif_quiet_end: number | null;
          notif_quiet_start: number | null;
          sto_active_hour: number | null;
          subscription_apple_signed_at: string | null;
          subscription_auto_renew_status: boolean | null;
          subscription_environment: string | null;
          subscription_expires_at: string | null;
          subscription_original_transaction_id: string | null;
          subscription_product_id: string | null;
          subscription_status: string;
          subscription_verified_at: string | null;
          tenure_start_date: string | null;
          timezone: string | null;
          updated_at: string | null;
        };
        Insert: {
          coach_id?: number | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          first_name?: string | null;
          id: string;
          language?: string | null;
          last_active_at?: string | null;
          last_name?: string | null;
          notif_enabled?: boolean;
          notif_permission_requested_at?: string | null;
          notif_permission_status?: string;
          notif_preferences?: Json;
          notif_quiet_end?: number | null;
          notif_quiet_start?: number | null;
          sto_active_hour?: number | null;
          subscription_apple_signed_at?: string | null;
          subscription_auto_renew_status?: boolean | null;
          subscription_environment?: string | null;
          subscription_expires_at?: string | null;
          subscription_original_transaction_id?: string | null;
          subscription_product_id?: string | null;
          subscription_status?: string;
          subscription_verified_at?: string | null;
          tenure_start_date?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Update: {
          coach_id?: number | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          first_name?: string | null;
          id?: string;
          language?: string | null;
          last_active_at?: string | null;
          last_name?: string | null;
          notif_enabled?: boolean;
          notif_permission_requested_at?: string | null;
          notif_permission_status?: string;
          notif_preferences?: Json;
          notif_quiet_end?: number | null;
          notif_quiet_start?: number | null;
          sto_active_hour?: number | null;
          subscription_apple_signed_at?: string | null;
          subscription_auto_renew_status?: boolean | null;
          subscription_environment?: string | null;
          subscription_expires_at?: string | null;
          subscription_original_transaction_id?: string | null;
          subscription_product_id?: string | null;
          subscription_status?: string;
          subscription_verified_at?: string | null;
          tenure_start_date?: string | null;
          timezone?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_activity_events: {
        Row: {
          id: number;
          kind: string;
          local_hour: number | null;
          occurred_at: string;
          user_id: string;
        };
        Insert: {
          id?: number;
          kind: string;
          local_hour?: number | null;
          occurred_at?: string;
          user_id: string;
        };
        Update: {
          id?: number;
          kind?: string;
          local_hour?: number | null;
          occurred_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_streaks: {
        Row: {
          created_at: string;
          current_weeks: number;
          freeze_tokens: number;
          freezes_last_granted_at: string | null;
          goal_id: string;
          id: string;
          last_extended_at: string | null;
          last_extended_week: string | null;
          longest_weeks: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_weeks?: number;
          freeze_tokens?: number;
          freezes_last_granted_at?: string | null;
          goal_id: string;
          id?: string;
          last_extended_at?: string | null;
          last_extended_week?: string | null;
          longest_weeks?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_weeks?: number;
          freeze_tokens?: number;
          freezes_last_granted_at?: string | null;
          goal_id?: string;
          id?: string;
          last_extended_at?: string | null;
          last_extended_week?: string | null;
          longest_weeks?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_streaks_goal_id_fkey";
            columns: ["goal_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id"];
          },
        ];
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
          quality_scores: Json | null;
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
          quality_scores?: Json | null;
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
          quality_scores?: Json | null;
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
      weekly_task_intentions: {
        Row: {
          captured_at: string;
          day_of_week: number;
          local_hour: number;
          location_label: string | null;
          task_id: string;
        };
        Insert: {
          captured_at?: string;
          day_of_week: number;
          local_hour: number;
          location_label?: string | null;
          task_id: string;
        };
        Update: {
          captured_at?: string;
          day_of_week?: number;
          local_hour?: number;
          location_label?: string | null;
          task_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_task_intentions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: true;
            referencedRelation: "weekly_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      weekly_tasks: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          description: string;
          difficulty_rating: string | null;
          goal_id: string;
          id: string;
          is_completed: boolean;
          is_fallback: boolean;
          order_index: number;
          quality_scores: Json | null;
          title: string;
          user_id: string;
          weekly_plan_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          description: string;
          difficulty_rating?: string | null;
          goal_id: string;
          id?: string;
          is_completed?: boolean;
          is_fallback?: boolean;
          order_index: number;
          quality_scores?: Json | null;
          title: string;
          user_id: string;
          weekly_plan_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          description?: string;
          difficulty_rating?: string | null;
          goal_id?: string;
          id?: string;
          is_completed?: boolean;
          is_fallback?: boolean;
          order_index?: number;
          quality_scores?: Json | null;
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
      claim_notification_jobs: {
        Args: { p_batch_size?: number; p_worker_id: string };
        Returns: {
          attempts: number;
          claimed_at: string | null;
          claimed_by: string | null;
          created_at: string;
          dedup_key: string;
          experiment_id: string | null;
          id: string;
          kind: string;
          last_error: string | null;
          local_date: string | null;
          payload: Json;
          scheduled_for_utc: string;
          sent_at: string | null;
          sequence_id: string | null;
          sequence_step: number | null;
          skip_reason: string | null;
          status: string;
          tier: number;
          user_id: string;
          variant: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "notification_jobs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      daily_check_in_candidates: {
        Args: Record<string, never>;
        Returns: {
          coach_id: number;
          language: string;
          timezone: string;
          user_id: string;
        }[];
      };
      daily_check_in_predicate: {
        Args: { p_user_id: string };
        Returns: boolean;
      };
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
      populate_milestone_target_dates: {
        Args: { p_goal_id: string };
        Returns: undefined;
      };
      record_user_activity: {
        Args: { p_kind: string; p_occurred_at?: string; p_user_id: string };
        Returns: undefined;
      };
      reserve_generation: {
        Args: {
          p_free_limit: number;
          p_pro_limit: number;
          p_type: string;
          p_user_id: string;
        };
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
