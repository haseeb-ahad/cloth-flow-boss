import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to get super admin user IDs (you can configure this)
const SUPER_ADMIN_SETTING_KEY = "super_admin_user_ids";

const getSuperAdminIds = async (supabase: any): Promise<string[]> => {
  const { data } = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", SUPER_ADMIN_SETTING_KEY)
    .maybeSingle();
  
  if (data?.setting_value) {
    try {
      return JSON.parse(data.setting_value);
    } catch {
      return [];
    }
  }
  return [];
};

// Helper function to create notification
const createNotification = async (
  supabase: any,
  userId: string,
  title: string,
  message: string,
  type: string,
  category: string,
  metadata: Record<string, any> = {}
) => {
  console.log(`Creating notification for user ${userId}: ${title}`);
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    message,
    type,
    category,
    metadata,
  });
};

// Notify all super admins
const notifySuperAdmins = async (
  supabase: any,
  title: string,
  message: string,
  type: string,
  category: string,
  metadata: Record<string, any> = {}
) => {
  const superAdminIds = await getSuperAdminIds(supabase);
  for (const adminId of superAdminIds) {
    await createNotification(supabase, adminId, title, message, type, category, metadata);
  }
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
      case "get_super_admin_ids": {
        const superAdminIds = await getSuperAdminIds(supabase);
        return new Response(
          JSON.stringify({ super_admin_ids: superAdminIds }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_duplicate_image": {
        const { image_hash, admin_id, amount } = data;
        
        // Check if this hash exists
        const { data: existing } = await supabase
          .from("payment_image_hashes")
          .select("*, profiles:admin_id(email, full_name)")
          .eq("image_hash", image_hash)
          .maybeSingle();
        
        if (existing) {
          // Get admin profile for notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("user_id", admin_id)
            .single();
          
          // Notify super admins about duplicate attempt
          await notifySuperAdmins(
            supabase,
            "⚠️ Duplicate Payment Screenshot Detected",
            `${profile?.full_name || profile?.email || "Unknown admin"} attempted to upload a duplicate payment screenshot. Amount: Rs ${amount}`,
            "high_priority",
            "duplicate_attempt",
            {
              admin_id,
              admin_email: profile?.email,
              admin_name: profile?.full_name,
              amount,
              original_proof_url: existing.proof_url,
              original_upload_time: existing.created_at,
            }
          );
          
          return new Response(
            JSON.stringify({ 
              is_duplicate: true, 
              message: "This payment screenshot has already been used. Please upload a valid proof." 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ is_duplicate: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "save_image_hash": {
        const { image_hash, admin_id, proof_url, payment_request_id, amount } = data;
        
        await supabase.from("payment_image_hashes").insert({
          image_hash,
          admin_id,
          proof_url,
          payment_request_id,
          amount,
        });
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "notify_payment_uploaded": {
        const { admin_id, amount, plan_name } = data;
        
        // Get admin profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", admin_id)
          .single();
        
        // Notify super admins
        await notifySuperAdmins(
          supabase,
          "💳 New Payment Proof Uploaded",
          `${profile?.full_name || profile?.email || "An admin"} has uploaded payment proof for ${plan_name}. Amount: Rs ${amount}`,
          "info",
          "payment_upload",
          { admin_id, amount, plan_name }
        );
        
        // Notify admin
        await createNotification(
          supabase,
          admin_id,
          "Payment Proof Submitted",
          `Your payment proof for ${plan_name} (Rs ${amount}) has been submitted and is pending verification.`,
          "info",
          "payment_upload",
          { amount, plan_name }
        );
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "notify_admin_registered": {
        const { admin_id, email, full_name } = data;
        
        // Notify super admins
        await notifySuperAdmins(
          supabase,
          "👤 New Admin Registered",
          `${full_name || email} has registered as a new admin.`,
          "info",
          "registration",
          { admin_id, email, full_name }
        );
        
        // Notify admin
        await createNotification(
          supabase,
          admin_id,
          "Welcome! Registration Successful",
          "Your account has been created successfully. You have a 7-day free trial to explore all features.",
          "success",
          "registration",
          {}
        );
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
        // First, set plan_id to NULL in related payment_requests to avoid foreign key constraint
        await supabase
          .from("payment_requests")
          .update({ plan_id: null })
          .eq("plan_id", data.id);

        // Also set plan_id to NULL in subscriptions
        await supabase
          .from("subscriptions")
          .update({ plan_id: null })
          .eq("plan_id", data.id);

        // Now delete the plan
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
        const { admin_id, plan_id } = data;
        
        // Get the plan details
        const { data: plan } = await supabase
          .from("plans")
          .select("*")
          .eq("id", plan_id)
          .single();

        if (!plan) throw new Error("Plan not found");

        // Check if admin already has a subscription
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("admin_id", admin_id)
          .maybeSingle();

        let end_date = null;
        let status = "active";
        
        if (plan.is_lifetime) {
          status = "free";
          end_date = null; // No expiration for lifetime
        } else {
          // Calculate end_date based on duration_months
          const durationMs = plan.duration_months * 30 * 24 * 60 * 60 * 1000;
          end_date = new Date(Date.now() + durationMs).toISOString();
        }

        let subscription;
        if (existing) {
          const { data: subData, error } = await supabase
            .from("subscriptions")
            .update({
              plan_id,
              billing_cycle: plan.is_lifetime ? "lifetime" : "monthly",
              amount_paid: plan.monthly_price || 0,
              status,
              is_trial: false,
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
              billing_cycle: plan.is_lifetime ? "lifetime" : "monthly",
              amount_paid: plan.monthly_price || 0,
              status,
              is_trial: false,
              end_date,
            })
            .select()
            .single();

          if (error) throw error;
          subscription = subData;
        }

        // Sync plan features to admin_feature_overrides
        if (plan.features) {
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

        // Notify admin about subscription activation
        await createNotification(
          supabase,
          admin_id,
          "🎉 Subscription Activated!",
          `Your ${plan.name} plan has been activated successfully!`,
          "success",
          "subscription_activated",
          { plan_name: plan.name, end_date, billing_cycle: plan.is_lifetime ? "lifetime" : "monthly" }
        );

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

      case "get_bank_settings": {
        const { data: settings, error } = await supabase
          .from("bank_transfer_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify({ settings }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "save_bank_settings": {
        // Check if settings exist
        const { data: existing } = await supabase
          .from("bank_transfer_settings")
          .select("id")
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("bank_transfer_settings")
            .update(data)
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("bank_transfer_settings")
            .insert(data);
          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_payment_requests": {
        const { data: requests, error } = await supabase
          .from("payment_requests")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Get admin profiles and plans
        const adminIds = [...new Set(requests?.map((r) => r.admin_id) || [])];
        const planIds = [...new Set(requests?.map((r) => r.plan_id).filter(Boolean) || [])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", adminIds);

        const { data: plans } = await supabase
          .from("plans")
          .select("id, name, duration_months")
          .in("id", planIds);

        const requestsWithDetails = requests?.map((request) => ({
          ...request,
          profile: profiles?.find((p) => p.user_id === request.admin_id),
          plan: plans?.find((p) => p.id === request.plan_id),
        }));

        return new Response(JSON.stringify({ requests: requestsWithDetails }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "approve_payment_request": {
        const { request_id } = data;

        // Get the payment request
        const { data: request, error: reqError } = await supabase
          .from("payment_requests")
          .select("*, plans(*)")
          .eq("id", request_id)
          .single();

        if (reqError || !request) throw new Error("Payment request not found");

        const plan = request.plans;
        if (!plan) throw new Error("Plan not found");

        // Calculate end date based on plan duration
        let endDate = null;
        let status = "active";

        if (plan.is_lifetime) {
          status = "free";
          endDate = null;
        } else {
          const durationMs = plan.duration_months * 30 * 24 * 60 * 60 * 1000;
          endDate = new Date(Date.now() + durationMs).toISOString();
        }

        // Check if subscription exists
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("admin_id", request.admin_id)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from("subscriptions")
            .update({
              plan_id: request.plan_id,
              status,
              start_date: new Date().toISOString(),
              end_date: endDate,
              amount_paid: request.amount,
              billing_cycle: plan.is_lifetime ? "lifetime" : "monthly",
            })
            .eq("id", existingSub.id);
        } else {
          await supabase.from("subscriptions").insert({
            admin_id: request.admin_id,
            plan_id: request.plan_id,
            status,
            end_date: endDate,
            amount_paid: request.amount,
            billing_cycle: plan.is_lifetime ? "lifetime" : "monthly",
          });
        }

        // Sync plan features to admin_feature_overrides
        if (plan.features) {
          await supabase
            .from("admin_feature_overrides")
            .delete()
            .eq("admin_id", request.admin_id);

          const features = plan.features as Record<string, any>;
          const overrideRecords = Object.entries(features).map(([feature, perms]: [string, any]) => ({
            admin_id: request.admin_id,
            feature,
            can_view: perms.view || false,
            can_create: perms.create || false,
            can_edit: perms.edit || false,
            can_delete: perms.delete || false,
          }));

          if (overrideRecords.length > 0) {
            await supabase.from("admin_feature_overrides").insert(overrideRecords);
          }
        }

        // Update payment request status
        await supabase
          .from("payment_requests")
          .update({
            status: "approved",
            verified_at: new Date().toISOString(),
            verified_by: "super_admin",
          })
          .eq("id", request_id);

        // Create payment record
        await supabase.from("payments").insert({
          admin_id: request.admin_id,
          amount: request.amount,
          payment_method: "bank_transfer",
          status: "success",
          transaction_id: `BT-${Date.now()}`,
        });

        // Notify admin about approval with subscription_activated category
        await createNotification(
          supabase,
          request.admin_id,
          "🎉 Payment Approved - Subscription Activated!",
          `Your payment for ${plan.name} has been approved! Your subscription is now active.`,
          "success",
          "subscription_activated",
          { plan_name: plan.name, end_date: endDate, billing_cycle: plan.is_lifetime ? "lifetime" : "monthly" }
        );

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reject_payment_request": {
        const { request_id, rejection_reason } = data;

        // Get request details for notification
        const { data: request } = await supabase
          .from("payment_requests")
          .select("admin_id, amount, plan_id, plans(name)")
          .eq("id", request_id)
          .single();

        const { error } = await supabase
          .from("payment_requests")
          .update({
            status: "rejected",
            rejection_reason: rejection_reason || "Payment not verified",
            verified_at: new Date().toISOString(),
            verified_by: "super_admin",
          })
          .eq("id", request_id);

        if (error) throw error;

        // Notify admin about rejection
        if (request) {
          await createNotification(
            supabase,
            request.admin_id,
            "❌ Payment Rejected",
            `Your payment proof has been rejected. Reason: ${rejection_reason || "Payment not verified"}. Please upload a valid payment proof.`,
            "error",
            "payment_rejected",
            { reason: rejection_reason, amount: request.amount }
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_loader_settings": {
        const { data: settings, error } = await supabase
          .from("system_settings")
          .select("*")
          .eq("setting_key", "loader_text")
          .maybeSingle();

        if (error) throw error;

        return new Response(JSON.stringify({ 
          loader_text: settings?.setting_value || "INVOICE" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_loader_settings": {
        const { loader_text } = data;

        // Upsert the loader text setting
        const { data: existing } = await supabase
          .from("system_settings")
          .select("id")
          .eq("setting_key", "loader_text")
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from("system_settings")
            .update({ setting_value: loader_text })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("system_settings")
            .insert({ setting_key: "loader_text", setting_value: loader_text });
          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_admin": {
        const { admin_id } = data;
        

        // Delete all related data in order (respecting foreign keys)
        
        // 1. Delete worker permissions for workers under this admin
        const { data: workers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("admin_id", admin_id)
          .eq("role", "worker");
        
        const workerIds = workers?.map(w => w.user_id) || [];
        
        if (workerIds.length > 0) {
          await supabase.from("worker_permissions").delete().in("worker_id", workerIds);
          
          // Delete workers from auth
          for (const workerId of workerIds) {
            await supabase.auth.admin.deleteUser(workerId);
          }
        }

        // 2. Delete admin's sale_items (via sales)
        const { data: sales } = await supabase
          .from("sales")
          .select("id")
          .eq("owner_id", admin_id);
        const saleIds = sales?.map(s => s.id) || [];
        if (saleIds.length > 0) {
          await supabase.from("sale_items").delete().in("sale_id", saleIds);
        }

        // 3. Delete credit_transactions (via credits)
        const { data: credits } = await supabase
          .from("credits")
          .select("id")
          .eq("owner_id", admin_id);
        const creditIds = credits?.map(c => c.id) || [];
        if (creditIds.length > 0) {
          await supabase.from("credit_transactions").delete().in("credit_id", creditIds);
        }

        // 4. Delete installment_payments (via installments)
        const { data: installments } = await supabase
          .from("installments")
          .select("id")
          .eq("owner_id", admin_id);
        const installmentIds = installments?.map(i => i.id) || [];
        if (installmentIds.length > 0) {
          await supabase.from("installment_payments").delete().in("installment_id", installmentIds);
        }

        // 5. Delete admin's main data tables
        await supabase.from("sales").delete().eq("owner_id", admin_id);
        await supabase.from("credits").delete().eq("owner_id", admin_id);
        await supabase.from("installments").delete().eq("owner_id", admin_id);
        await supabase.from("products").delete().eq("owner_id", admin_id);
        await supabase.from("expenses").delete().eq("owner_id", admin_id);
        await supabase.from("payment_ledger").delete().eq("owner_id", admin_id);
        await supabase.from("app_settings").delete().eq("owner_id", admin_id);

        // 6. Delete admin-specific tables
        await supabase.from("admin_feature_overrides").delete().eq("admin_id", admin_id);
        await supabase.from("store_info").delete().eq("admin_id", admin_id);
        await supabase.from("payments").delete().eq("admin_id", admin_id);
        await supabase.from("payment_requests").delete().eq("admin_id", admin_id);
        await supabase.from("subscriptions").delete().eq("admin_id", admin_id);
        await supabase.from("notifications").delete().eq("user_id", admin_id);
        await supabase.from("payment_image_hashes").delete().eq("admin_id", admin_id);

        // 7. Delete user_roles (admin and their workers)
        await supabase.from("user_roles").delete().eq("admin_id", admin_id);
        await supabase.from("user_roles").delete().eq("user_id", admin_id);

        // 8. Delete profile
        await supabase.from("profiles").delete().eq("user_id", admin_id);

        // 9. Finally delete the admin user from auth
        const { error: authError } = await supabase.auth.admin.deleteUser(admin_id);
        if (authError) {
          console.error("Auth delete error:", authError);
          // Continue even if auth delete fails (user might already be deleted)
        }

        console.log("Admin deleted successfully:", admin_id);

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