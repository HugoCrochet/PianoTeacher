
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "competencies": {
                  Row: {
                    "description": string,"domain": string,"id": string,"level": number,"name": string,"objective": string,"position": number,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string,"domain": string,"id"?: string,"level": number,"name": string,"objective"?: string,"position": number,"slug": string
                  }
                  Update: {
                    "description"?: string,"domain"?: string,"id"?: string,"level"?: number,"name"?: string,"objective"?: string,"position"?: number,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"exercise_competencies": {
                  Row: {
                    "competency_id": string,"exercise_id": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "competency_id": string,"exercise_id": string,"weight"?: number
                  }
                  Update: {
                    "competency_id"?: string,"exercise_id"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "exercise_competencies_competency_id_fkey"
      columns: ["competency_id"]
isOneToOne: false
      referencedRelation: "competencies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "exercise_competencies_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    }
                  ]
                },"exercises": {
                  Row: {
                    "bpm_increment": number,"bpm_target": number | null,"domain": string,"estimated_minutes": number,"id": string,"instructions": string,"key_mode": string | null,"key_signature": string | null,"level": number,"objective": string,"slug": string,"source_type": string,"source_url": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bpm_increment"?: number,"bpm_target"?: number | null,"domain": string,"estimated_minutes": number,"id"?: string,"instructions": string,"key_mode"?: string | null,"key_signature"?: string | null,"level": number,"objective": string,"slug": string,"source_type": string,"source_url"?: string | null,"title": string
                  }
                  Update: {
                    "bpm_increment"?: number,"bpm_target"?: number | null,"domain"?: string,"estimated_minutes"?: number,"id"?: string,"instructions"?: string,"key_mode"?: string | null,"key_signature"?: string | null,"level"?: number,"objective"?: string,"slug"?: string,"source_type"?: string,"source_url"?: string | null,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pdf_assets": {
                  Row: {
                    "created_at": string,"id": string,"mime_type": string,"original_filename": string,"size_bytes": number,"storage_path": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mime_type": string,"original_filename": string,"size_bytes": number,"storage_path": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mime_type"?: string,"original_filename"?: string,"size_bytes"?: number,"storage_path"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"piece_passages": {
                  Row: {
                    "created_at": string,"id": string,"label": string,"position": number,"target_bpm": number | null,"user_id": string,"user_repertoire_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"label": string,"position": number,"target_bpm"?: number | null,"user_id": string,"user_repertoire_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"label"?: string,"position"?: number,"target_bpm"?: number | null,"user_id"?: string,"user_repertoire_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "piece_passages_user_repertoire_id_user_id_fkey"
      columns: ["user_repertoire_id","user_id"]
isOneToOne: false
      referencedRelation: "user_repertoire"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"planned_tasks": {
                  Row: {
                    "created_at": string,"domain": string,"exercise_id": string | null,"id": string,"is_user_modified": boolean,"key_signature": string | null,"passage_id": string | null,"plan_id": string,"planned_minutes": number,"position": number,"reason": string,"status": string,"target_bpm": number | null,"task_date": string,"user_id": string,"user_repertoire_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain": string,"exercise_id"?: string | null,"id"?: string,"is_user_modified"?: boolean,"key_signature"?: string | null,"passage_id"?: string | null,"plan_id": string,"planned_minutes": number,"position": number,"reason": string,"status"?: string,"target_bpm"?: number | null,"task_date": string,"user_id": string,"user_repertoire_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"domain"?: string,"exercise_id"?: string | null,"id"?: string,"is_user_modified"?: boolean,"key_signature"?: string | null,"passage_id"?: string | null,"plan_id"?: string,"planned_minutes"?: number,"position"?: number,"reason"?: string,"status"?: string,"target_bpm"?: number | null,"task_date"?: string,"user_id"?: string,"user_repertoire_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "planned_tasks_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planned_tasks_passage_id_user_id_fkey"
      columns: ["passage_id","user_id"]
isOneToOne: false
      referencedRelation: "piece_passages"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "planned_tasks_plan_id_user_id_fkey"
      columns: ["plan_id","user_id"]
isOneToOne: false
      referencedRelation: "practice_plans"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "planned_tasks_user_repertoire_id_user_id_fkey"
      columns: ["user_repertoire_id","user_id"]
isOneToOne: false
      referencedRelation: "user_repertoire"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"practice_logs": {
                  Row: {
                    "actual_minutes": number,"bpm": number | null,"domain": string,"exercise_id": string | null,"id": string,"key_signature": string | null,"passage_id": string | null,"planned_task_id": string | null,"practice_date": string,"practiced_at": string,"result": string,"session_id": string,"user_id": string,"user_repertoire_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minutes": number,"bpm"?: number | null,"domain": string,"exercise_id"?: string | null,"id"?: string,"key_signature"?: string | null,"passage_id"?: string | null,"planned_task_id"?: string | null,"practice_date": string,"practiced_at"?: string,"result": string,"session_id": string,"user_id": string,"user_repertoire_id"?: string | null
                  }
                  Update: {
                    "actual_minutes"?: number,"bpm"?: number | null,"domain"?: string,"exercise_id"?: string | null,"id"?: string,"key_signature"?: string | null,"passage_id"?: string | null,"planned_task_id"?: string | null,"practice_date"?: string,"practiced_at"?: string,"result"?: string,"session_id"?: string,"user_id"?: string,"user_repertoire_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "practice_logs_exercise_id_fkey"
      columns: ["exercise_id"]
isOneToOne: false
      referencedRelation: "exercises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "practice_logs_passage_id_user_id_fkey"
      columns: ["passage_id","user_id"]
isOneToOne: false
      referencedRelation: "piece_passages"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "practice_logs_planned_task_id_fkey"
      columns: ["planned_task_id"]
isOneToOne: false
      referencedRelation: "planned_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "practice_logs_session_id_user_id_fkey"
      columns: ["session_id","user_id"]
isOneToOne: false
      referencedRelation: "practice_sessions"
      referencedColumns: ["id","user_id"]
    },{
      foreignKeyName: "practice_logs_user_repertoire_id_user_id_fkey"
      columns: ["user_repertoire_id","user_id"]
isOneToOne: false
      referencedRelation: "user_repertoire"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"practice_plans": {
                  Row: {
                    "generated_at": string,"id": string,"planner_version": string,"settings_snapshot": NonNullable<Json>,"user_id": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "generated_at"?: string,"id"?: string,"planner_version": string,"settings_snapshot"?: NonNullable<Json>,"user_id": string,"week_start": string
                  }
                  Update: {
                    "generated_at"?: string,"id"?: string,"planner_version"?: string,"settings_snapshot"?: NonNullable<Json>,"user_id"?: string,"week_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"practice_sessions": {
                  Row: {
                    "actual_minutes": number,"ended_at": string | null,"id": string,"session_date": string,"started_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minutes"?: number,"ended_at"?: string | null,"id"?: string,"session_date": string,"started_at"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "actual_minutes"?: number,"ended_at"?: string | null,"id"?: string,"session_date"?: string,"started_at"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "challenge_level": string,"created_at": string,"display_name": string,"domain_preferences": NonNullable<Json>,"id": string,"onboarded_at": string | null,"practice_days": (number)[],"self_assessment": NonNullable<Json>,"show_streak": boolean,"timezone": string,"updated_at": string,"weekday_minutes": number,"weekend_minutes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_level"?: string,"created_at"?: string,"display_name"?: string,"domain_preferences"?: NonNullable<Json>,"id": string,"onboarded_at"?: string | null,"practice_days"?: (number)[],"self_assessment"?: NonNullable<Json>,"show_streak"?: boolean,"timezone"?: string,"updated_at"?: string,"weekday_minutes"?: number,"weekend_minutes"?: number
                  }
                  Update: {
                    "challenge_level"?: string,"created_at"?: string,"display_name"?: string,"domain_preferences"?: NonNullable<Json>,"id"?: string,"onboarded_at"?: string | null,"practice_days"?: (number)[],"self_assessment"?: NonNullable<Json>,"show_streak"?: boolean,"timezone"?: string,"updated_at"?: string,"weekday_minutes"?: number,"weekend_minutes"?: number
                  }
                  Relationships: [
                    
                  ]
                },"repertoire_catalog": {
                  Row: {
                    "composer": string,"id": string,"level": number,"rights_note": string,"slug": string,"source_type": string,"source_url": string | null,"style": string,"tier": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "composer": string,"id"?: string,"level": number,"rights_note"?: string,"slug": string,"source_type": string,"source_url"?: string | null,"style": string,"tier": string,"title": string
                  }
                  Update: {
                    "composer"?: string,"id"?: string,"level"?: number,"rights_note"?: string,"slug"?: string,"source_type"?: string,"source_url"?: string | null,"style"?: string,"tier"?: string,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_competencies": {
                  Row: {
                    "competency_id": string,"last_practiced_at": string | null,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "competency_id": string,"last_practiced_at"?: string | null,"status": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "competency_id"?: string,"last_practiced_at"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_competencies_competency_id_fkey"
      columns: ["competency_id"]
isOneToOne: false
      referencedRelation: "competencies"
      referencedColumns: ["id"]
    }
                  ]
                },"user_repertoire": {
                  Row: {
                    "catalog_id": string | null,"composer": string,"created_at": string,"current_step": string,"felt_difficulty": number | null,"id": string,"level": number | null,"notes": string,"pdf_asset_id": string | null,"source_url": string | null,"status": string,"style": string,"tier": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "catalog_id"?: string | null,"composer"?: string,"created_at"?: string,"current_step"?: string,"felt_difficulty"?: number | null,"id"?: string,"level"?: number | null,"notes"?: string,"pdf_asset_id"?: string | null,"source_url"?: string | null,"status"?: string,"style"?: string,"tier"?: string,"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "catalog_id"?: string | null,"composer"?: string,"created_at"?: string,"current_step"?: string,"felt_difficulty"?: number | null,"id"?: string,"level"?: number | null,"notes"?: string,"pdf_asset_id"?: string | null,"source_url"?: string | null,"status"?: string,"style"?: string,"tier"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_repertoire_catalog_id_fkey"
      columns: ["catalog_id"]
isOneToOne: false
      referencedRelation: "repertoire_catalog"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_repertoire_pdf_asset_id_user_id_fkey"
      columns: ["pdf_asset_id","user_id"]
isOneToOne: false
      referencedRelation: "pdf_assets"
      referencedColumns: ["id","user_id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
