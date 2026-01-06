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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_feature_overrides: {
        Row: {
          admin_id: string
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          feature: string
          id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          feature: string
          id?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          feature?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_presence: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          last_seen: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          app_name: string | null
          description: string | null
          footer_message: string | null
          id: string
          language: string | null
          logo_url: string | null
          owner_id: string | null
          owner_names: string[] | null
          phone_numbers: string[] | null
          shop_address: string | null
          shop_name: string | null
          thank_you_message: string | null
          timezone: string | null
          updated_at: string | null
          worker_name: string | null
          worker_phone: string | null
        }
        Insert: {
          app_name?: string | null
          description?: string | null
          footer_message?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          owner_id?: string | null
          owner_names?: string[] | null
          phone_numbers?: string[] | null
          shop_address?: string | null
          shop_name?: string | null
          thank_you_message?: string | null
          timezone?: string | null
          updated_at?: string | null
          worker_name?: string | null
          worker_phone?: string | null
        }
        Update: {
          app_name?: string | null
          description?: string | null
          footer_message?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          owner_id?: string | null
          owner_names?: string[] | null
          phone_numbers?: string[] | null
          shop_address?: string | null
          shop_name?: string | null
          thank_you_message?: string | null
          timezone?: string | null
          updated_at?: string | null
          worker_name?: string | null
          worker_phone?: string | null
        }
        Relationships: []
      }
      bank_transfer_settings: {
        Row: {
          account_number: string
          account_title: string
          bank_name: string
          branch_name: string | null
          created_at: string
          iban: string | null
          id: string
          instructions: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          account_number: string
          account_title: string
          bank_name: string
          branch_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          instructions?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_name?: string
          branch_name?: string | null
          created_at?: string
          iban?: string | null
          id?: string
          instructions?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          credit_id: string
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          notes: string | null
          owner_id: string | null
          transaction_date: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_id: string
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          transaction_date?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_id?: string
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          amount: number
          created_at: string | null
          credit_type: string
          customer_name: string
          customer_phone: string | null
          date_complete: string | null
          deleted_at: string | null
          due_date: string | null
          id: string
          is_deleted: boolean | null
          notes: string | null
          owner_id: string | null
          paid_amount: number | null
          person_type: string | null
          remaining_amount: number
          sale_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          credit_type?: string
          customer_name: string
          customer_phone?: string | null
          date_complete?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          paid_amount?: number | null
          person_type?: string | null
          remaining_amount: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          credit_type?: string
          customer_name?: string
          customer_phone?: string | null
          date_complete?: string | null
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          paid_amount?: number | null
          person_type?: string | null
          remaining_amount?: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credits_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          customer_name: string
          customer_name_normalized: string
          customer_phone: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_name_normalized: string
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_name_normalized?: string
          customer_phone?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          is_deleted: boolean | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          is_deleted?: boolean | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          is_deleted?: boolean | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      installment_payments: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          installment_id: string
          is_deleted: boolean | null
          notes: string | null
          owner_id: string | null
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          installment_id: string
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          installment_id?: string
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "installments"
            referencedColumns: ["id"]
          },
        ]
      }
      installments: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          frequency: string
          id: string
          installment_amount: number
          is_deleted: boolean | null
          next_due_date: string | null
          notes: string | null
          owner_id: string | null
          paid_amount: number
          remaining_amount: number
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          frequency?: string
          id?: string
          installment_amount: number
          is_deleted?: boolean | null
          next_due_date?: string | null
          notes?: string | null
          owner_id?: string | null
          paid_amount?: number
          remaining_amount: number
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          frequency?: string
          id?: string
          installment_amount?: number
          is_deleted?: boolean | null
          next_due_date?: string | null
          notes?: string | null
          owner_id?: string | null
          paid_amount?: number
          remaining_amount?: number
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_image_hashes: {
        Row: {
          admin_id: string
          amount: number | null
          created_at: string
          id: string
          image_hash: string
          payment_request_id: string | null
          proof_url: string
        }
        Insert: {
          admin_id: string
          amount?: number | null
          created_at?: string
          id?: string
          image_hash: string
          payment_request_id?: string | null
          proof_url: string
        }
        Update: {
          admin_id?: string
          amount?: number | null
          created_at?: string
          id?: string
          image_hash?: string
          payment_request_id?: string | null
          proof_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_image_hashes_payment_request_id_fkey"
            columns: ["payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_ledger: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          description: string | null
          details: Json
          id: string
          image_url: string | null
          is_deleted: boolean | null
          notes: string | null
          owner_id: string | null
          payment_amount: number
          payment_date: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          description?: string | null
          details?: Json
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_amount: number
          payment_date?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          description?: string | null
          details?: Json
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_amount?: number
          payment_date?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          admin_id: string
          amount: number
          created_at: string
          id: string
          payment_method: string
          plan_id: string | null
          proof_url: string
          rejection_reason: string | null
          status: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_id: string
          amount: number
          created_at?: string
          id?: string
          payment_method?: string
          plan_id?: string | null
          proof_url: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number
          created_at?: string
          id?: string
          payment_method?: string
          plan_id?: string | null
          proof_url?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          admin_id: string
          amount: number
          card_last_four: string | null
          created_at: string
          id: string
          invoice_url: string | null
          notes: string | null
          payment_method: string
          status: string
          subscription_id: string | null
          transaction_id: string | null
        }
        Insert: {
          admin_id: string
          amount: number
          card_last_four?: string | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          payment_method: string
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          admin_id?: string
          amount?: number
          card_last_four?: string | null
          created_at?: string
          id?: string
          invoice_url?: string | null
          notes?: string | null
          payment_method?: string
          status?: string
          subscription_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          daily_price: number
          description: string | null
          duration_months: number
          features: Json
          id: string
          is_active: boolean | null
          is_lifetime: boolean | null
          lifetime_price: number
          monthly_price: number
          name: string
          trial_days: number | null
          updated_at: string
          yearly_price: number
        }
        Insert: {
          created_at?: string
          daily_price?: number
          description?: string | null
          duration_months?: number
          features?: Json
          id?: string
          is_active?: boolean | null
          is_lifetime?: boolean | null
          lifetime_price?: number
          monthly_price?: number
          name: string
          trial_days?: number | null
          updated_at?: string
          yearly_price?: number
        }
        Update: {
          created_at?: string
          daily_price?: number
          description?: string | null
          duration_months?: number
          features?: Json
          id?: string
          is_active?: boolean | null
          is_lifetime?: boolean | null
          lifetime_price?: number
          monthly_price?: number
          name?: string
          trial_days?: number | null
          updated_at?: string
          yearly_price?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_deleted: boolean | null
          name: string
          owner_id: string | null
          purchase_price: number
          quantity_type: string | null
          selling_price: number
          sku: string | null
          stock_quantity: number
          supplier_name: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          name: string
          owner_id?: string | null
          purchase_price: number
          quantity_type?: string | null
          selling_price: number
          sku?: string | null
          stock_quantity?: number
          supplier_name?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean | null
          name?: string
          owner_id?: string | null
          purchase_price?: number
          quantity_type?: string | null
          selling_price?: number
          sku?: string | null
          stock_quantity?: number
          supplier_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone_number: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          id: string
          is_deleted: boolean | null
          is_return: boolean | null
          product_id: string
          product_name: string
          profit: number
          purchase_price: number
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_return?: boolean | null
          product_id: string
          product_name: string
          profit: number
          purchase_price: number
          quantity: number
          sale_id: string
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_return?: boolean | null
          product_id?: string
          product_name?: string
          profit?: number
          purchase_price?: number
          quantity?: number
          sale_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          description: string | null
          discount: number | null
          final_amount: number
          id: string
          image_url: string | null
          invoice_number: string
          is_deleted: boolean | null
          owner_id: string | null
          paid_amount: number | null
          payment_method: string | null
          payment_status: string | null
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          description?: string | null
          discount?: number | null
          final_amount: number
          id?: string
          image_url?: string | null
          invoice_number: string
          is_deleted?: boolean | null
          owner_id?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          deleted_at?: string | null
          description?: string | null
          discount?: number | null
          final_amount?: number
          id?: string
          image_url?: string | null
          invoice_number?: string
          is_deleted?: boolean | null
          owner_id?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      store_info: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          store_address: string | null
          store_name: string | null
          store_phone: string | null
          updated_at: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          store_address?: string | null
          store_name?: string | null
          store_phone?: string | null
          updated_at?: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          store_address?: string | null
          store_name?: string | null
          store_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          admin_id: string
          amount_paid: number | null
          auto_renew: boolean | null
          billing_cycle: string | null
          created_at: string
          end_date: string | null
          id: string
          is_trial: boolean | null
          plan_id: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          amount_paid?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          amount_paid?: number | null
          auto_renew?: boolean | null
          billing_cycle?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      worker_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          feature: string
          id: string
          worker_id: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          feature: string
          id?: string
          worker_id: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          feature?: string
          id?: string
          worker_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_admin_offline: { Args: never; Returns: undefined }
      get_owner_id: { Args: { user_id: string }; Returns: string }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      normalize_customer_name: { Args: { name: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "worker"
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
      app_role: ["admin", "worker"],
    },
  },
} as const
