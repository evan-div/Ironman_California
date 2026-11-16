
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "activity_date": string,"activity_type": string,"athlete_id": string,"avg_cadence_rpm": number | null,"avg_heart_rate": number | null,"avg_power_watts": number | null,"created_at": string,"distance_meters": number | null,"distance_unit": string | null,"duration_seconds": number | null,"external_id": string | null,"external_provider": string | null,"id": string,"is_indoor": boolean | null,"is_run_walk": boolean | null,"max_heart_rate": number | null,"normalized_power_watts": number | null,"notes": string | null,"origin": string,"planned_session_id": string | null,"recovery_subtype": string | null,"rpe": number | null,"seed_key": string | null,"start_time": string | null,"started_at": string | null,"strength_focus": string | null,"swim_environment": string | null,"title": string,"trainer_platform": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_date": string,"activity_type": string,"athlete_id"?: string,"avg_cadence_rpm"?: number | null,"avg_heart_rate"?: number | null,"avg_power_watts"?: number | null,"created_at"?: string,"distance_meters"?: number | null,"distance_unit"?: string | null,"duration_seconds"?: number | null,"external_id"?: string | null,"external_provider"?: string | null,"id"?: string,"is_indoor"?: boolean | null,"is_run_walk"?: boolean | null,"max_heart_rate"?: number | null,"normalized_power_watts"?: number | null,"notes"?: string | null,"origin"?: string,"planned_session_id"?: string | null,"recovery_subtype"?: string | null,"rpe"?: number | null,"seed_key"?: string | null,"start_time"?: string | null,"started_at"?: string | null,"strength_focus"?: string | null,"swim_environment"?: string | null,"title": string,"trainer_platform"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "activity_date"?: string,"activity_type"?: string,"athlete_id"?: string,"avg_cadence_rpm"?: number | null,"avg_heart_rate"?: number | null,"avg_power_watts"?: number | null,"created_at"?: string,"distance_meters"?: number | null,"distance_unit"?: string | null,"duration_seconds"?: number | null,"external_id"?: string | null,"external_provider"?: string | null,"id"?: string,"is_indoor"?: boolean | null,"is_run_walk"?: boolean | null,"max_heart_rate"?: number | null,"normalized_power_watts"?: number | null,"notes"?: string | null,"origin"?: string,"planned_session_id"?: string | null,"recovery_subtype"?: string | null,"rpe"?: number | null,"seed_key"?: string | null,"start_time"?: string | null,"started_at"?: string | null,"strength_focus"?: string | null,"swim_environment"?: string | null,"title"?: string,"trainer_platform"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_planned_session_fk"
      columns: ["planned_session_id","athlete_id"]
isOneToOne: false
      referencedRelation: "planned_sessions"
      referencedColumns: ["id","athlete_id"]
    }
                  ]
                },"allowed_emails": {
                  Row: {
                    "created_at": string,"email": string,"note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"note"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"athlete_seeds": {
                  Row: {
                    "applied_at": string,"athlete_id": string,"seed_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string,"athlete_id"?: string,"seed_key": string
                  }
                  Update: {
                    "applied_at"?: string,"athlete_id"?: string,"seed_key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"goal_events": {
                  Row: {
                    "athlete_id": string,"created_at": string,"event_date": string,"goal_description": string | null,"id": string,"is_primary": boolean,"location": string | null,"name": string,"seed_key": string | null,"target_bike_seconds": number | null,"target_finish_seconds": number | null,"target_run_seconds": number | null,"target_swim_seconds": number | null,"target_transition_seconds": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string,"created_at"?: string,"event_date": string,"goal_description"?: string | null,"id"?: string,"is_primary"?: boolean,"location"?: string | null,"name": string,"seed_key"?: string | null,"target_bike_seconds"?: number | null,"target_finish_seconds"?: number | null,"target_run_seconds"?: number | null,"target_swim_seconds"?: number | null,"target_transition_seconds"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string,"created_at"?: string,"event_date"?: string,"goal_description"?: string | null,"id"?: string,"is_primary"?: boolean,"location"?: string | null,"name"?: string,"seed_key"?: string | null,"target_bike_seconds"?: number | null,"target_finish_seconds"?: number | null,"target_run_seconds"?: number | null,"target_swim_seconds"?: number | null,"target_transition_seconds"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"integrations": {
                  Row: {
                    "athlete_id": string,"created_at": string,"external_athlete_id": string | null,"id": string,"last_synced_at": string | null,"provider": string,"settings": NonNullable<Json>,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string,"created_at"?: string,"external_athlete_id"?: string | null,"id"?: string,"last_synced_at"?: string | null,"provider": string,"settings"?: NonNullable<Json>,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string,"created_at"?: string,"external_athlete_id"?: string | null,"id"?: string,"last_synced_at"?: string | null,"provider"?: string,"settings"?: NonNullable<Json>,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"milestones": {
                  Row: {
                    "athlete_id": string,"completed_at": string | null,"created_at": string,"description": string | null,"id": string,"seed_key": string | null,"target_date": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"seed_key"?: string | null,"target_date": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"seed_key"?: string | null,"target_date"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"planned_sessions": {
                  Row: {
                    "activity_type": string,"athlete_id": string,"created_at": string,"description": string | null,"id": string,"is_indoor": boolean | null,"original_date": string | null,"planned_distance_meters": number | null,"planned_distance_unit": string | null,"planned_duration_max_seconds": number | null,"planned_duration_seconds": number | null,"rescheduled_at": string | null,"seed_key": string | null,"session_date": string,"status": string,"structured_workout": Json | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_type": string,"athlete_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_indoor"?: boolean | null,"original_date"?: string | null,"planned_distance_meters"?: number | null,"planned_distance_unit"?: string | null,"planned_duration_max_seconds"?: number | null,"planned_duration_seconds"?: number | null,"rescheduled_at"?: string | null,"seed_key"?: string | null,"session_date": string,"status"?: string,"structured_workout"?: Json | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "activity_type"?: string,"athlete_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_indoor"?: boolean | null,"original_date"?: string | null,"planned_distance_meters"?: number | null,"planned_distance_unit"?: string | null,"planned_duration_max_seconds"?: number | null,"planned_duration_seconds"?: number | null,"rescheduled_at"?: string | null,"seed_key"?: string | null,"session_date"?: string,"status"?: string,"structured_workout"?: Json | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"default_activity_type": string,"default_bike_indoor": boolean,"default_swim_environment": string,"default_trainer_platform": string | null,"distance_unit": string,"id": string,"onboarded_at": string | null,"preferred_name": string | null,"swim_unit": string,"timezone": string,"updated_at": string,"weekly_goal_hours": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_activity_type"?: string,"default_bike_indoor"?: boolean,"default_swim_environment"?: string,"default_trainer_platform"?: string | null,"distance_unit"?: string,"id": string,"onboarded_at"?: string | null,"preferred_name"?: string | null,"swim_unit"?: string,"timezone"?: string,"updated_at"?: string,"weekly_goal_hours"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"default_activity_type"?: string,"default_bike_indoor"?: boolean,"default_swim_environment"?: string,"default_trainer_platform"?: string | null,"distance_unit"?: string,"id"?: string,"onboarded_at"?: string | null,"preferred_name"?: string | null,"swim_unit"?: string,"timezone"?: string,"updated_at"?: string,"weekly_goal_hours"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"training_phases": {
                  Row: {
                    "athlete_id": string,"created_at": string,"end_date": string,"focus": string | null,"id": string,"name": string,"seed_key": string | null,"sort_order": number,"start_date": string,"target_hours_max": number | null,"target_hours_min": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "athlete_id"?: string,"created_at"?: string,"end_date": string,"focus"?: string | null,"id"?: string,"name": string,"seed_key"?: string | null,"sort_order"?: number,"start_date": string,"target_hours_max"?: number | null,"target_hours_min"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "athlete_id"?: string,"created_at"?: string,"end_date"?: string,"focus"?: string | null,"id"?: string,"name"?: string,"seed_key"?: string | null,"sort_order"?: number,"start_date"?: string,"target_hours_max"?: number | null,"target_hours_min"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "hook_restrict_signup_to_allowlist":
{ Args: { "event": Json }; Returns: Json
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
