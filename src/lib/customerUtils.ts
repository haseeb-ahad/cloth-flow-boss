import { supabase } from "@/integrations/supabase/client";

/**
 * Normalize a customer name for comparison and storage
 * - Trims leading/trailing spaces
 * - Replaces multiple spaces with single space
 * - Converts to lowercase for comparison
 */
export const normalizeCustomerName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
};

/**
 * Clean customer name for display (trim and single spaces, but keep original case)
 */
export const cleanCustomerName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

interface CustomerCheckResult {
  exists: boolean;
  customer?: {
    id: string;
    customer_name: string;
    customer_phone: string | null;
  };
  error?: string;
}

/**
 * Check if a customer already exists (case-insensitive, space-normalized)
 */
export const checkCustomerExists = async (
  customerName: string,
  ownerId: string
): Promise<CustomerCheckResult> => {
  const normalizedName = normalizeCustomerName(customerName);
  
  if (!normalizedName) {
    return { exists: false };
  }

  try {
    const { data, error } = await (supabase
      .from("customers" as any)
      .select("id, customer_name, customer_phone")
      .eq("owner_id", ownerId)
      .eq("customer_name_normalized", normalizedName)
      .maybeSingle() as any);

    if (error) {
      console.error("Error checking customer:", error);
      return { exists: false, error: error.message };
    }

    if (data) {
      return {
        exists: true,
        customer: {
          id: data.id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
        },
      };
    }

    return { exists: false };
  } catch (error) {
    console.error("Error checking customer:", error);
    return { exists: false, error: "Failed to check customer" };
  }
};

interface GetOrCreateCustomerResult {
  success: boolean;
  customer?: {
    id: string;
    customer_name: string;
    customer_phone: string | null;
  };
  isNew?: boolean;
  error?: string;
}

/**
 * Get existing customer or create a new one
 * Returns the customer record (existing or newly created)
 */
export const getOrCreateCustomer = async (
  customerName: string,
  customerPhone: string | null,
  ownerId: string
): Promise<GetOrCreateCustomerResult> => {
  const cleanedName = cleanCustomerName(customerName);
  const normalizedName = normalizeCustomerName(customerName);
  
  if (!normalizedName) {
    return { success: false, error: "Customer name is required" };
  }

  try {
    // First check if customer exists
    const { data: existing } = await (supabase
      .from("customers" as any)
      .select("id, customer_name, customer_phone")
      .eq("owner_id", ownerId)
      .eq("customer_name_normalized", normalizedName)
      .maybeSingle() as any);

    if (existing) {
      // Update phone if provided and different
      if (customerPhone && customerPhone !== existing.customer_phone) {
        await (supabase
          .from("customers" as any)
          .update({ customer_phone: customerPhone })
          .eq("id", existing.id) as any);
      }
      
      return {
        success: true,
        customer: {
          id: existing.id,
          customer_name: existing.customer_name,
          customer_phone: customerPhone || existing.customer_phone,
        },
        isNew: false,
      };
    }

    // Create new customer
    const { data: newCustomer, error } = await (supabase
      .from("customers" as any)
      .insert({
        owner_id: ownerId,
        customer_name: cleanedName,
        customer_name_normalized: normalizedName,
        customer_phone: customerPhone || null,
      })
      .select("id, customer_name, customer_phone")
      .single() as any);

    if (error) {
      // Check if it's a unique constraint violation (duplicate)
      if (error.code === '23505') {
        return {
          success: false,
          error: "Customer already exists. Please use the existing customer.",
        };
      }
      throw error;
    }

    return {
      success: true,
      customer: {
        id: newCustomer.id,
        customer_name: newCustomer.customer_name,
        customer_phone: newCustomer.customer_phone,
      },
      isNew: true,
    };
  } catch (error: any) {
    console.error("Error in getOrCreateCustomer:", error);
    return {
      success: false,
      error: error.message || "Failed to process customer",
    };
  }
};

/**
 * Fetch all customers for autocomplete suggestions
 */
export const fetchCustomerSuggestions = async (): Promise<
  { name: string; phone: string | null }[]
> => {
  try {
    const { data, error } = await (supabase
      .from("customers" as any)
      .select("customer_name, customer_phone")
      .order("customer_name", { ascending: true }) as any);

    if (error) {
      console.error("Error fetching customers:", error);
      return [];
    }

    return (data || []).map((c: any) => ({
      name: c.customer_name,
      phone: c.customer_phone,
    }));
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
};

/**
 * Validate customer name input and check for duplicates
 * Returns error message if duplicate found, null if valid
 */
export const validateCustomerName = async (
  customerName: string,
  ownerId: string
): Promise<string | null> => {
  const cleanedName = cleanCustomerName(customerName);
  
  if (!cleanedName) {
    return "Customer name is required";
  }

  const result = await checkCustomerExists(cleanedName, ownerId);
  
  if (result.error) {
    return result.error;
  }

  // We don't block if customer exists - we just use the existing one
  // This allows selecting existing customers
  return null;
};
