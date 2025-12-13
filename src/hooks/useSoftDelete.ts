import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type SoftDeleteTable = 
  | "products" 
  | "sales" 
  | "sale_items" 
  | "credits" 
  | "credit_transactions" 
  | "expenses" 
  | "installments" 
  | "installment_payments" 
  | "payment_ledger";

interface SoftDeleteOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export const useSoftDelete = () => {
  const softDelete = async (
    table: SoftDeleteTable,
    id: string,
    options: SoftDeleteOptions = {}
  ): Promise<boolean> => {
    const {
      onSuccess,
      onError,
      successMessage = "Record deleted successfully",
      errorMessage = "Failed to delete record",
    } = options;

    try {
      const { error } = await (supabase
        .from(table) as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      toast.success(successMessage);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error(`Soft delete error for ${table}:`, error);
      toast.error(errorMessage);
      onError?.(error as Error);
      return false;
    }
  };

  const softDeleteMany = async (
    table: SoftDeleteTable,
    ids: string[],
    options: SoftDeleteOptions = {}
  ): Promise<boolean> => {
    const {
      onSuccess,
      onError,
      successMessage = "Records deleted successfully",
      errorMessage = "Failed to delete records",
    } = options;

    try {
      const { error } = await (supabase
        .from(table) as any)
        .update({ deleted_at: new Date().toISOString() })
        .in("id", ids);

      if (error) throw error;

      toast.success(successMessage);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error(`Soft delete many error for ${table}:`, error);
      toast.error(errorMessage);
      onError?.(error as Error);
      return false;
    }
  };

  const softDeleteByField = async (
    table: SoftDeleteTable,
    field: string,
    value: string,
    options: SoftDeleteOptions = {}
  ): Promise<boolean> => {
    const {
      onSuccess,
      onError,
      successMessage = "Records deleted successfully",
      errorMessage = "Failed to delete records",
    } = options;

    try {
      const { error } = await (supabase
        .from(table) as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq(field, value);

      if (error) throw error;

      toast.success(successMessage);
      onSuccess?.();
      return true;
    } catch (error) {
      console.error(`Soft delete by field error for ${table}:`, error);
      toast.error(errorMessage);
      onError?.(error as Error);
      return false;
    }
  };

  return { softDelete, softDeleteMany, softDeleteByField };
};
