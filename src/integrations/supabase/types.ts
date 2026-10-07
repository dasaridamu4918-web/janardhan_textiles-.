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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cart_items: {
        Row: {
          product_id: number
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          product_id: number
          quantity: number
          updated_at?: string
          user_id: string
        }
        Update: {
          product_id?: number
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_changes: {
        Row: {
          changed_by: string | null
          created_at: string
          delta: number
          id: number
          new_stock: number
          order_id: string | null
          product_id: number
          reason: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          delta: number
          id?: number
          new_stock: number
          order_id?: string | null
          product_id: number
          reason: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          delta?: number
          id?: number
          new_stock?: number
          order_id?: string | null
          product_id?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_changes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_changes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: number
          line_total_paise: number
          order_id: string
          product_id: number | null
          product_title: string
          quantity: number
          unit_price_paise: number
        }
        Insert: {
          id?: number
          line_total_paise: number
          order_id: string
          product_id?: number | null
          product_title: string
          quantity: number
          unit_price_paise: number
        }
        Update: {
          id?: number
          line_total_paise?: number
          order_id?: string
          product_id?: number | null
          product_title?: string
          quantity?: number
          unit_price_paise?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: number
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: number
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: number
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          courier: string | null
          created_at: string
          customer_name: string
          email: string
          id: string
          idempotency_key: string
          order_number: string
          payment_status: string
          phone: string
          status: Database["public"]["Enums"]["order_status"]
          total_paise: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          courier?: string | null
          created_at?: string
          customer_name: string
          email: string
          id?: string
          idempotency_key: string
          order_number: string
          payment_status?: string
          phone: string
          status?: Database["public"]["Enums"]["order_status"]
          total_paise: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          courier?: string | null
          created_at?: string
          customer_name?: string
          email?: string
          id?: string
          idempotency_key?: string
          order_number?: string
          payment_status?: string
          phone?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_paise?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          color: string
          created_at: string
          description: string
          fabric: string
          id: number
          image_key: number | null
          image_url: string | null
          occasion: string
          pattern: string
          price_paise: number
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          style: string
          title: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          description?: string
          fabric: string
          id?: number
          image_key?: number | null
          image_url?: string | null
          occasion?: string
          pattern?: string
          price_paise: number
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          style?: string
          title: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          fabric?: string
          id?: number
          image_key?: number | null
          image_url?: string | null
          occasion?: string
          pattern?: string
          price_paise?: number
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          style?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          created_at: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
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
      admin_adjust_stock: {
        Args: { p_delta: number; p_product_id: number; p_reason: string }
        Returns: number
      }
      admin_update_order: {
        Args: {
          p_courier: string
          p_note: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
          p_tracking: string
        }
        Returns: undefined
      }
      am_i_admin: { Args: never; Returns: boolean }
      place_order: {
        Args: {
          p_address: string
          p_email: string
          p_idempotency_key: string
          p_name: string
          p_phone: string
        }
        Returns: {
          order_id: string
          order_number: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
      product_status: "published" | "hidden" | "archived"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "packed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      product_status: ["published", "hidden", "archived"],
    },
  },
} as const
