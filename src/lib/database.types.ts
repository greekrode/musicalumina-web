export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EventType = "festival" | "competition" | "masterclass";
export type EventStatus = "upcoming" | "ongoing" | "completed";
export type RegistrationStatus = "personal" | "parents" | "teacher";
export type RegistrationState = "pending" | "approved" | "rejected";

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          title: string;
          type: EventType;
          description: { en: string; id: string } | null;
          start_date: string;
          end_date: string | null;
          registration_deadline: string | null;
          location: string;
          venue_details: string | null;
          status: EventStatus;
          poster_image: string | null;
          terms_and_conditions: { en: string; id: string } | null;
          created_at: string;
          updated_at: string;
          registration_fee: number | null;
          lark_base: string | null;
          lark_table: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          type: EventType;
          description?: { en: string; id: string } | null;
          start_date: string;
          end_date?: string | null;
          registration_deadline?: string | null;
          location: string;
          venue_details?: string | null;
          status?: EventStatus;
          terms_and_conditions?: { en: string; id: string } | null;
          created_at?: string;
          updated_at?: string;
          registration_fee?: number | null;
          lark_base?: string | null;
          lark_table?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          type?: EventType;
          description?: { en: string; id: string } | null;
          start_date?: string;
          end_date?: string | null;
          registration_deadline?: string | null;
          location?: string;
          venue_details?: string | null;
          status?: EventStatus;
          terms_and_conditions?: { en: string; id: string } | null;
          created_at?: string;
          updated_at?: string;
          registration_fee?: number | null;
          lark_base?: string | null;
          lark_table?: string | null;
        };
      };
      songs: {
        Row: {
          id: string;
          title: string;
          composer: string | null;
          duration: string | null;
          difficulty_level: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          composer?: string | null;
          duration?: string | null;
          difficulty_level?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          composer?: string | null;
          duration?: string | null;
          difficulty_level?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      registrations: {
        Row: {
          id: string;
          event_id: string;
          category_id: string;
          subcategory_id: string;
          registrant_status: RegistrationStatus;
          registrant_name: string | null;
          registrant_whatsapp: string;
          registrant_email: string;
          participant_name: string;
          song_id: string | null;
          song_title: string | null;
          song_duration: string | null;
          birth_certificate_url: string;
          song_pdf_url: string | null;
          bank_name: string;
          bank_account_number: string;
          bank_account_name: string;
          payment_receipt_url: string;
          status: RegistrationState;
          email_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          subcategory_id: string;
          registration_status: RegistrationStatus;
          registrant_name?: string | null;
          registrant_whatsapp: string;
          registrant_email: string;
          participant_name: string;
          song_id?: string | null;
          song_title?: string | null;
          song_duration?: string | null;
          birth_certificate_url: string;
          song_pdf_url?: string | null;
          bank_name: string;
          bank_account_number: string;
          bank_account_name: string;
          payment_receipt_url: string;
          status?: RegistrationState;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          subcategory_id?: string;
          registration_status?: RegistrationStatus;
          registrant_name?: string | null;
          registrant_whatsapp?: string;
          registrant_email?: string;
          participant_name?: string;
          song_id?: string | null;
          song_title?: string | null;
          song_duration?: string | null;
          birth_certificate_url?: string;
          song_pdf_url?: string | null;
          bank_name?: string;
          bank_account_number?: string;
          bank_account_name?: string;
          payment_receipt_url?: string;
          status?: RegistrationState;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          subject: string;
          message: string;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          subject?: string;
          message?: string;
          created_at?: string;
          sent_at?: string | null;
        };
      };
      event_categories: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string | null;
          created_at: string;
          repertoire: Json | null;
          order_index: number;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          repertoire?: Json | null;
          order_index: number;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          repertoire?: Json | null;
          order_index?: number;
        };
      };
      event_subcategories: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          age_requirement: string;
          registration_fee: number;
          repertoire: Json;
          performance_duration: string | null;
          requirements: string | null;
          created_at: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          category_id: string;
          name: string;
          age_requirement: string;
          registration_fee: number;
          repertoire?: Json;
          performance_duration?: string | null;
          requirements?: string | null;
          created_at?: string;
          order_index: number;
        };
        Update: {
          id?: string;
          category_id?: string;
          name?: string;
          age_requirement?: string;
          registration_fee?: number;
          repertoire?: Json;
          performance_duration?: string | null;
          requirements?: string | null;
          created_at?: string;
          order_index?: number;
        };
      };
      event_jury: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          title: string;
          description: string | null;
          avatar_url: string | null;
          credentials: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          title: string;
          description?: string | null;
          avatar_url?: string | null;
          credentials?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          title?: string;
          description?: string | null;
          avatar_url?: string | null;
          credentials?: Json | null;
          created_at?: string;
        };
      };
      masterclass_participants: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          repertoire: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          repertoire: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          repertoire?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
