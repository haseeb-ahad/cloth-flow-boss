import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();

    switch (action) {
      case "get_all_admins": {
        // Get all admins with their subscriptions and store info
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role, created_at")
          .eq("role", "admin");

        if (rolesError) throw rolesError;

        const adminIds = roles?.map((r) => r.user_id) || [];
        
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", adminIds);

        const { data: subscriptions } = await supabase
          .from("subscriptions")
          .select("*, plans(*)")
          .in("admin_id", adminIds);

        const { data: storeInfos } = await supabase
          .from("store_info")
          .select("*")
          .in("admin_id", adminIds);

        const admins = roles?.map((role) => {
          const profile = profiles?.find((p) => p.user_id === role.user_id);
          const subscription = subscriptions?.find((s) => s.admin_id === role.user_id);
          const storeInfo = storeInfos?.find((s) => s.admin_id === role.user_id);

          return {
            id: role.user_id,
            email: profile?.email || "",
            full_name: profile?.full_name || "",
            phone_number: profile?.phone_number || "",
            created_at: role.created_at,
            store_name: storeInfo?.store_name || "",
            subscription: subscription || null,
            plan: subscription?.plans || null,
          };
        });

        return new Response(JSON.stringify({ admins }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_all_plans": {
        const { data: plans, error } = await supabase
          .from("plans")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;

        return new Response(JSON.stringify({ plans }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "create_plan": {
        const { data: plan, error } = await supabase
          .from("plans")
          .insert(data)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ plan }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_plan": {
        const { id, ...updateData } = data;
        const { data: plan, error } = await supabase
          .from("plans")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ plan }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_plan": {
        const { error } = await supabase
          .from("plans")
          .delete()
          .eq("id", data.id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "assign_subscription": {
        const { admin_id, plan_id, billing_cycle, amount_paid, is_trial, trial_days } = data;
        
        // Get the plan features
        const { data: plan } = await supabase
          .from("plans")
          .select("features, trial_days, is_lifetime")
          .eq("id", plan_id)
          .single();

        // Check if admin already has a subscription
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("admin_id", admin_id)
          .single();

        let end_date = null;
        let status = "active";
        let isTrial = is_trial || false;
        
        if (billing_cycle === "lifetime" || plan?.is_lifetime) {
          status = "free";
          end_date = null; // No expiration for lifetime
        } else if (billing_cycle === "trial" || isTrial) {
          const trialDays = trial_days || plan?.trial_days || 7;
          end_date = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
          status = "active";
          isTrial = true;
        } else if (billing_cycle === "monthly") {
          end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (billing_cycle === "yearly") {
          end_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        }

        let subscription;
        if (existing) {
          const { data: subData, error } = await supabase
            .from("subscriptions")
            .update({
              plan_id,
              billing_cycle,
              amount_paid,
              status,
              is_trial: isTrial,
              start_date: new Date().toISOString(),
              end_date,
            })
            .eq("id", existing.id)
            .select()
            .single();

          if (error) throw error;
          subscription = subData;
        } else {
          const { data: subData, error } = await supabase
            .from("subscriptions")
            .insert({
              admin_id,
              plan_id,
              billing_cycle,
              amount_paid,
              status,
              is_trial: isTrial,
              end_date,
            })
            .select()
            .single();

          if (error) throw error;
          subscription = subData;
        }

        // Sync plan features to admin_feature_overrides
        if (plan?.features) {
          // Delete existing overrides
          await supabase
            .from("admin_feature_overrides")
            .delete()
            .eq("admin_id", admin_id);

          // Insert new overrides based on plan features
          const features = plan.features as Record<string, any>;
          const overrideRecords = Object.entries(features).map(([feature, perms]: [string, any]) => ({
            admin_id,
            feature,
            can_view: perms.view || false,
            can_create: perms.create || false,
            can_edit: perms.edit || false,
            can_delete: perms.delete || false,
          }));

          if (overrideRecords.length > 0) {
            await supabase
              .from("admin_feature_overrides")
              .insert(overrideRecords);
          }
        }

        return new Response(JSON.stringify({ subscription }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_feature_overrides": {
        const { data: overrides, error } = await supabase
          .from("admin_feature_overrides")
          .select("*")
          .eq("admin_id", data.admin_id);

        if (error) throw error;

        return new Response(JSON.stringify({ overrides }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_feature_overrides": {
        const { admin_id, features } = data;
        
        // Delete existing overrides
        await supabase
          .from("admin_feature_overrides")
          .delete()
          .eq("admin_id", admin_id);

        // Insert new overrides
        const overrideRecords = Object.entries(features).map(([feature, perms]: [string, any]) => ({
          admin_id,
          feature,
          can_view: perms.view,
          can_create: perms.create,
          can_edit: perms.edit,
          can_delete: perms.delete,
        }));

        const { error } = await supabase
          .from("admin_feature_overrides")
          .insert(overrideRecords);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_all_payments": {
        const { data: payments, error } = await supabase
          .from("payments")
          .select("*, profiles!payments_admin_id_fkey(email, full_name)")
          .order("created_at", { ascending: false });

        // If the join doesn't work, fetch profiles separately
        if (error) {
          const { data: paymentsOnly } = await supabase
            .from("payments")
            .select("*")
            .order("created_at", { ascending: false });

          const adminIds = [...new Set(paymentsOnly?.map((p) => p.admin_id) || [])];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, email, full_name")
            .in("user_id", adminIds);

          const paymentsWithProfiles = paymentsOnly?.map((payment) => ({
            ...payment,
            profile: profiles?.find((p) => p.user_id === payment.admin_id),
          }));

          return new Response(JSON.stringify({ payments: paymentsWithProfiles }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ payments }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_store_info": {
        const { admin_id, ...storeData } = data;
        
        const { data: existing } = await supabase
          .from("store_info")
          .select("id")
          .eq("admin_id", admin_id)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("store_info")
            .update(storeData)
            .eq("admin_id", admin_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("store_info")
            .insert({ admin_id, ...storeData });
          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        throw new Error("Unknown action");
    }
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
