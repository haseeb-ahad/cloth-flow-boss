import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordValidationRequest {
  password: string;
  email?: string;
  username?: string;
  userId?: string;
  checkHistory?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "Weak" | "Medium" | "Strong";
}

// Password validation rules
function validatePasswordRules(
  password: string,
  email?: string,
  username?: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmedPassword = password.trim();

  // Minimum 8 characters
  if (trimmedPassword.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  // At least 1 uppercase letter
  if (!/[A-Z]/.test(trimmedPassword)) {
    errors.push("Password must include at least 1 uppercase letter");
  }

  // At least 1 lowercase letter
  if (!/[a-z]/.test(trimmedPassword)) {
    errors.push("Password must include at least 1 lowercase letter");
  }

  // At least 1 number
  if (!/[0-9]/.test(trimmedPassword)) {
    errors.push("Password must include at least 1 number");
  }

  // At least 1 special character
  if (!/[!@#$%^&*]/.test(trimmedPassword)) {
    errors.push("Password must include at least 1 special character (!@#$%^&*)");
  }

  // Password must not contain email
  if (email) {
    const emailPart = email.split("@")[0].toLowerCase();
    if (emailPart.length >= 3 && trimmedPassword.toLowerCase().includes(emailPart)) {
      errors.push("Password must not contain your email");
    }
  }

  // Password must not contain username
  if (username && username.length >= 3) {
    if (trimmedPassword.toLowerCase().includes(username.toLowerCase())) {
      errors.push("Password must not contain your username");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Calculate password strength
function getPasswordStrength(password: string): "Weak" | "Medium" | "Strong" {
  if (!password) return "Weak";

  let score = 0;

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9!@#$%^&*]/.test(password)) score += 1;

  if (score <= 3) return "Weak";
  if (score <= 5) return "Medium";
  return "Strong";
}

// Simple hash comparison (for demo - in production use proper bcrypt)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PasswordValidationRequest = await req.json();
    const { password, email, username, userId, checkHistory = false } = body;

    console.log("Validating password for:", { email, userId, checkHistory });

    // Validate password rules
    const validation = validatePasswordRules(password, email, username);
    const strength = getPasswordStrength(password);

    const result: ValidationResult = {
      isValid: validation.isValid,
      errors: [...validation.errors],
      strength,
    };

    // Check password history if requested and user ID provided
    if (checkHistory && userId && validation.isValid) {
      const passwordHash = await hashPassword(password.trim());

      // Get last 3 passwords from history
      const { data: historyData, error: historyError } = await supabase
        .from("password_history")
        .select("password_hash")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(3);

      if (historyError) {
        console.error("Error fetching password history:", historyError);
      } else if (historyData) {
        const isReused = historyData.some(
          (record) => record.password_hash === passwordHash
        );

        if (isReused) {
          result.isValid = false;
          result.errors.push("You cannot reuse a recent password");
        }
      }
    }

    // Reject weak passwords
    if (strength === "Weak" && result.isValid) {
      result.isValid = false;
      result.errors.push("Password is too weak");
    }

    console.log("Validation result:", { isValid: result.isValid, errorCount: result.errors.length });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in validate-password:", error);
    return new Response(
      JSON.stringify({ error: error.message, isValid: false, errors: ["Validation failed"] }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});