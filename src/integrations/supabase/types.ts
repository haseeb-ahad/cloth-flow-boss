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
      app_settings: {
        Row: {
          app_name: string | null
          id: string
          language: string | null
          logo_url: string | null
          updated_at: string | null
        }
        Insert: {
          app_name?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: string | null
          id?: string
          language?: string | null
          logo_url?: string | null
          updated_at?: string | null
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
          id: string
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
          id?: string
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
          id?: string
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
          customer_name: string
          customer_phone: string | null
          due_date: string | null
          id: string
          notes: string | null
          owner_id: string | null
          paid_amount: number | null
          remaining_amount: number
          sale_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_name: string
          customer_phone?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          paid_amount?: number | null
          remaining_amount: number
          sale_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_name?: string
          customer_phone?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          paid_amount?: number | null
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
      installment_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          installment_id: string
          notes: string | null
          owner_id: string | null
          payment_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          installment_id: string
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          installment_id?: string
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
          frequency: string
          id: string
          installment_amount: number
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
          frequency?: string
          id?: string
          installment_amount: number
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
          frequency?: string
          id?: string
          installment_amount?: number
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
      payment_ledger: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          details: Json
          id: string
          notes: string | null
          owner_id: string | null
          payment_amount: number
          payment_date: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          details?: Json
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_amount: number
          payment_date?: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          details?: Json
          id?: string
          notes?: string | null
          owner_id?: string | null
          payment_amount?: number
          payment_date?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          purchase_price: number
          quantity_type: string | null
          selling_price: number
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          purchase_price: number
          quantity_type?: string | null
          selling_price: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          purchase_price?: number
          quantity_type?: string | null
          selling_price?: number
          stock_quantity?: number
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
          id: string
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
          id?: string
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
          id?: string
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
          discount: number | null
          final_amount: number
          id: string
          invoice_number: string
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
          discount?: number | null
          final_amount: number
          id?: string
          invoice_number: string
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
          discount?: number | null
          final_amount?: number
          id?: string
          invoice_number?: string
          owner_id?: string | null
          paid_amount?: number | null
          payment_method?: string | null
          payment_status?: string | null
          status?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
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
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
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
