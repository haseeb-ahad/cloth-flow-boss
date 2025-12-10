import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, phoneNumber, fullName } = await req.json();
    console.log(`[CREATE-WORKER] Request received for email: ${email}`);

    if (!email || !password) {
      console.log("[CREATE-WORKER] Missing email or password");
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[CREATE-WORKER] No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.log("[CREATE-WORKER] Invalid token or user not found", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.log("[CREATE-WORKER] User is not admin", roleError);
      return new Response(
        JSON.stringify({ error: "Only admins can create workers" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      console.log(`[CREATE-WORKER] User with email ${email} already exists`);
      return new Response(
        JSON.stringify({ error: "A user with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user using admin API (does not affect current session)
    console.log(`[CREATE-WORKER] Creating user with email: ${email}`);
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        phone_number: phoneNumber,
        full_name: fullName,
        role: "worker",
      },
    });

    if (createError) {
      console.error("[CREATE-WORKER] Error creating worker:", createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user_roles to set admin_id (link worker to admin who created them)
    if (newUser.user) {
      const { error: updateRoleError } = await supabaseAdmin
        .from("user_roles")
        .update({ admin_id: userData.user.id })
        .eq("user_id", newUser.user.id);

      if (updateRoleError) {
        console.error("[CREATE-WORKER] Error updating admin_id:", updateRoleError);
        // Don't fail the request, just log the error
      } else {
        console.log(`[CREATE-WORKER] Set admin_id ${userData.user.id} for worker ${newUser.user.id}`);
      }
    }

    console.log(`[CREATE-WORKER] Worker ${newUser.user?.id} created successfully by admin ${userData.user.id}`);

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[CREATE-WORKER] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
