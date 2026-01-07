import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Password validation rules
function validatePasswordRules(password: string, email?: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmedPassword = password.trim();

  if (trimmedPassword.length < 8) errors.push("Password must be at least 8 characters");
  if (!/[A-Z]/.test(trimmedPassword)) errors.push("Password must include at least 1 uppercase letter");
  if (!/[a-z]/.test(trimmedPassword)) errors.push("Password must include at least 1 lowercase letter");
  if (!/[0-9]/.test(trimmedPassword)) errors.push("Password must include at least 1 number");
  if (!/[!@#$%^&*]/.test(trimmedPassword)) errors.push("Password must include at least 1 special character");

  if (email) {
    const emailPart = email.split("@")[0].toLowerCase();
    if (emailPart.length >= 3 && trimmedPassword.toLowerCase().includes(emailPart)) {
      errors.push("Password must not contain your email");
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Simple hash for password history comparison
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", success: false }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create client with user's token for auth operations
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Create service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid session", success: false }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: ChangePasswordRequest = await req.json();
    const { currentPassword, newPassword } = body;

    console.log("Password change requested for user:", user.id);

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      console.log("Current password verification failed");
      
      // Log failed attempt
      await supabaseAdmin.from("password_audit_log").insert({
        user_id: user.id,
        event_type: "failed_password_change",
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
        metadata: { reason: "incorrect_current_password" }
      });

      return new Response(
        JSON.stringify({ error: "Current password is incorrect", success: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate new password rules
    const validation = validatePasswordRules(newPassword, user.email);
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.errors[0], errors: validation.errors, success: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return new Response(
        JSON.stringify({ error: "New password must be different from current password", success: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check password history
    const newPasswordHash = await hashPassword(newPassword);
    const { data: historyData } = await supabaseAdmin
      .from("password_history")
      .select("password_hash")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3);

    if (historyData) {
      const isReused = historyData.some(record => record.password_hash === newPasswordHash);
      if (isReused) {
        return new Response(
          JSON.stringify({ error: "You cannot reuse a recent password", success: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword.trim(),
    });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update password", success: false }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Store password in history
    await supabaseAdmin.from("password_history").insert({
      user_id: user.id,
      password_hash: newPasswordHash,
    });

    // Log successful password change
    await supabaseAdmin.from("password_audit_log").insert({
      user_id: user.id,
      event_type: "password_changed",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
    });

    // Sign out all sessions for this user (security measure)
    await supabaseAdmin.auth.admin.signOut(user.id, "global");

    console.log("Password changed successfully for user:", user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password updated successfully. You will be logged out from all devices." 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in change-password:", error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});