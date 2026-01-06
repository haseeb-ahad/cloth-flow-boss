import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      // Handle sendBeacon which sends as text
      const text = await req.text();
      body = JSON.parse(text);
    }

    const { admin_id, status, last_seen, action } = body;

    // Handle check_offline action - mark stale admins as offline
    if (action === 'check_offline') {
      console.log('Checking for stale admin sessions...');
      
      const { error } = await supabase.rpc('check_admin_offline');
      
      if (error) {
        console.error('Error checking offline admins:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Offline check completed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle presence update
    if (!admin_id || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing admin_id or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Updating presence for admin ${admin_id}: ${status}`);

    // Get current status to check if it changed
    const { data: currentPresence } = await supabase
      .from('admin_presence')
      .select('status')
      .eq('admin_id', admin_id)
      .single();

    const previousStatus = currentPresence?.status;

    // Upsert presence
    const { error: upsertError } = await supabase
      .from('admin_presence')
      .upsert({
        admin_id,
        status,
        last_seen: last_seen || new Date().toISOString(),
      }, {
        onConflict: 'admin_id'
      });

    if (upsertError) {
      console.error('Error updating presence:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Notify super admin if status changed
    if (previousStatus && previousStatus !== status) {
      // Get admin info for notification
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', admin_id)
        .single();

      const adminName = profile?.full_name || profile?.email || 'An admin';
      
      // Get super admin user IDs (from user_roles where role might indicate super admin)
      // For now, we'll create a notification that can be viewed in super admin dashboard
      const notificationTitle = status === 'online' 
        ? '🟢 Admin Online' 
        : '⚪ Admin Offline';
      
      const notificationMessage = status === 'online'
        ? `${adminName} is now online.`
        : `${adminName} went offline.`;

      // We can use the existing super-admin notification system
      // But for now, the real-time subscription will handle UI updates
      console.log(`Status change notification: ${notificationMessage}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Admin presence error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
