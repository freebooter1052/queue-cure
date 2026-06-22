// ============================================================
// Queue-Cure: Shared TypeScript types matching the DB schema
// ============================================================

export type PatientStatus = 'waiting' | 'serving' | 'completed';

export interface Patient {
  id: string;
  patient_name: string;
  token_number: number;
  status: PatientStatus;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export interface Settings {
  key: string;
  value: string;
}

// Database type map for typed Supabase client
export interface Database {
  public: {
    Tables: {
      patients: {
        Row: Patient;
        Insert: {
          patient_name: string;
          status?: PatientStatus;
        };
        Update: {
          status?: PatientStatus;
          called_at?: string | null;
          completed_at?: string | null;
        };
      };
      settings: {
        Row: Settings;
        Insert: Settings;
        Update: Pick<Settings, 'value'>;
      };
    };
  };
}
