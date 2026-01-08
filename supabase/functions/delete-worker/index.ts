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
    const body = await req.json();
    const { workerId } = body;
    
    console.log(`[DELETE-WORKER] Request received for workerId: ${workerId}`);

    if (!workerId) {
      console.log("[DELETE-WORKER] No workerId provided");
      return new Response(
        JSON.stringify({ error: "Worker ID is required" }),
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
      console.log("[DELETE-WORKER] No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.log("[DELETE-WORKER] Invalid token or user not found", userError);
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
      console.log("[DELETE-WORKER] User is not admin", roleError);
      return new Response(
        JSON.stringify({ error: "Only admins can delete workers" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify target user is a worker (not admin) belonging to this admin
    const { data: targetRoleData, error: targetRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("role, admin_id")
      .eq("user_id", workerId)
      .single();

    console.log(`[DELETE-WORKER] Target role data:`, targetRoleData, targetRoleError);

    if (targetRoleError) {
      console.log("[DELETE-WORKER] Worker role not found, may not exist");
      return new Response(
        JSON.stringify({ error: "Worker not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetRoleData?.role !== "worker") {
      console.log("[DELETE-WORKER] Target is not a worker");
      return new Response(
        JSON.stringify({ error: "Can only delete worker accounts" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify this worker belongs to the requesting admin
    if (targetRoleData?.admin_id !== userData.user.id) {
      console.log("[DELETE-WORKER] Worker does not belong to this admin");
      return new Response(
        JSON.stringify({ error: "You can only delete your own workers" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Delete worker permissions
    console.log(`[DELETE-WORKER] Step 1: Deleting permissions for worker ${workerId}`);
    const { error: permError } = await supabaseAdmin
      .from("worker_permissions")
      .delete()
      .eq("worker_id", workerId);
    
    if (permError) {
      console.log("[DELETE-WORKER] Error deleting permissions (continuing):", permError);
    }

    // Step 2: Delete from user_roles first (before auth deletion)
    console.log(`[DELETE-WORKER] Step 2: Deleting from user_roles for worker ${workerId}`);
    const { error: roleDeleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", workerId);
    
    if (roleDeleteError) {
      console.error("[DELETE-WORKER] Error deleting from user_roles:", roleDeleteError);
    }

    // Step 3: Delete from profiles
    console.log(`[DELETE-WORKER] Step 3: Deleting from profiles for worker ${workerId}`);
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", workerId);
    
    if (profileError) {
      console.error("[DELETE-WORKER] Error deleting from profiles:", profileError);
    }

    // Step 4: Delete user from auth.users
    console.log(`[DELETE-WORKER] Step 4: Deleting auth user ${workerId}`);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(workerId);

    if (deleteError) {
      console.error("[DELETE-WORKER] Error deleting worker from auth:", deleteError);
      // If user already not in auth, that's fine - we cleaned up DB records
      if (!deleteError.message?.includes("User not found")) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`[DELETE-WORKER] Worker ${workerId} deleted successfully by admin ${userData.user.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Worker deleted successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[DELETE-WORKER] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
