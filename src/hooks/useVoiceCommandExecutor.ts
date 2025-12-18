import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceCommandResult {
  understood: boolean;
  module: string | null;
  action: string | null;
  data: Record<string, any>;
  missing_info: string[];
  confirmation_message: string;
  ready_to_execute: boolean;
}

interface ExecutionResult {
  success: boolean;
  message: string;
  data?: any;
}

export const useVoiceCommandExecutor = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const executeCommand = useCallback(async (
    command: VoiceCommandResult,
    ownerId: string
  ): Promise<ExecutionResult> => {
    if (!command.understood || !command.ready_to_execute) {
      return {
        success: false,
        message: command.confirmation_message || "I couldn't understand that command. Please try again.",
      };
    }

    const { module, action, data } = command;

    try {
      switch (module) {
        case 'invoice':
          return await handleInvoiceCommand(action, data, ownerId, navigate);
        
        case 'inventory':
          return await handleInventoryCommand(action, data, ownerId);
        
        case 'expenses':
          return await handleExpenseCommand(action, data, ownerId);
        
        case 'receive_payment':
          return await handleReceivePaymentCommand(action, data, ownerId);
        
        case 'cash_credit':
          return await handleCashCreditCommand(action, data, ownerId);
        
        case 'sales':
          navigate('/sales');
          return { success: true, message: "Opening Sales History for you." };
        
        case 'credits':
          navigate('/credits');
          return { success: true, message: "Opening Credits page for you." };
        
        case 'customers':
          navigate('/customers');
          return { success: true, message: "Opening Customers page for you." };
        
        case 'settings':
          navigate('/settings');
          return { success: true, message: "Opening Settings page for you." };
        
        default:
          return {
            success: false,
            message: `I'm not sure how to handle ${module} commands yet.`,
          };
      }
    } catch (error) {
      console.error('Command execution error:', error);
      return {
        success: false,
        message: "Sorry, something went wrong while executing your command. Please try again.",
      };
    }
  }, [navigate]);

  return { executeCommand };
};

// Handle Invoice Commands
async function handleInvoiceCommand(
  action: string | null, 
  data: Record<string, any>,
  ownerId: string,
  navigate: (path: string, state?: any) => void
): Promise<ExecutionResult> {
  if (action === 'create' || action === 'add') {
    // Navigate to invoice page with pre-filled data
    navigate('/invoice', { 
      state: { 
        voiceData: {
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          items: data.items || [],
          discount: data.discount,
        }
      }
    });
    
    return {
      success: true,
      message: `Opening invoice form${data.customer_name ? ` for ${data.customer_name}` : ''}. I've pre-filled the details you mentioned.`,
    };
  }

  if (action === 'view' || action === 'search') {
    navigate('/sales');
    return { success: true, message: "Opening Sales History for you." };
  }

  return { success: false, message: "I can only create or view invoices via voice commands." };
}

// Handle Inventory Commands
async function handleInventoryCommand(
  action: string | null,
  data: Record<string, any>,
  ownerId: string
): Promise<ExecutionResult> {
  if (action === 'create' || action === 'add') {
    const { error } = await supabase.from('products').insert({
      name: data.product_name || data.name,
      purchase_price: data.purchase_price || 0,
      selling_price: data.selling_price || 0,
      stock_quantity: data.stock_quantity || data.quantity || 0,
      category: data.category || 'General',
      quantity_type: data.quantity_type || 'Unit',
      owner_id: ownerId,
    });

    if (error) throw error;

    return {
      success: true,
      message: `Product "${data.product_name || data.name}" has been added to inventory successfully.`,
    };
  }

  if (action === 'edit' || action === 'update') {
    if (!data.product_name && !data.product_id) {
      return { success: false, message: "Please specify which product you want to update." };
    }

    const updateData: Record<string, any> = {};
    if (data.selling_price !== undefined) updateData.selling_price = data.selling_price;
    if (data.purchase_price !== undefined) updateData.purchase_price = data.purchase_price;
    if (data.stock_quantity !== undefined) updateData.stock_quantity = data.stock_quantity;
    if (data.category) updateData.category = data.category;

    const query = supabase.from('products').update(updateData);
    
    if (data.product_id) {
      query.eq('id', data.product_id);
    } else {
      query.ilike('name', `%${data.product_name}%`);
    }

    const { error } = await query.eq('owner_id', ownerId);

    if (error) throw error;

    return {
      success: true,
      message: `Product "${data.product_name}" has been updated successfully.`,
    };
  }

  if (action === 'delete' || action === 'remove') {
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString(), is_deleted: true })
      .ilike('name', `%${data.product_name}%`)
      .eq('owner_id', ownerId);

    if (error) throw error;

    return {
      success: true,
      message: `Product "${data.product_name}" has been deleted from inventory.`,
    };
  }

  return { success: false, message: "I can create, update, or delete inventory items via voice commands." };
}

// Handle Expense Commands
async function handleExpenseCommand(
  action: string | null,
  data: Record<string, any>,
  ownerId: string
): Promise<ExecutionResult> {
  if (action === 'create' || action === 'add') {
    const { error } = await supabase.from('expenses').insert({
      amount: data.amount,
      expense_type: data.expense_type || data.type || 'Other',
      description: data.description || data.note,
      expense_date: data.date || new Date().toISOString().split('T')[0],
      owner_id: ownerId,
    });

    if (error) throw error;

    return {
      success: true,
      message: `Expense of ${data.amount} for "${data.expense_type || 'Other'}" has been recorded successfully.`,
    };
  }

  return { success: false, message: "I can only add expenses via voice commands." };
}

// Handle Receive Payment Commands  
async function handleReceivePaymentCommand(
  action: string | null,
  data: Record<string, any>,
  ownerId: string
): Promise<ExecutionResult> {
  if (action === 'create' || action === 'add' || action === 'record') {
    // First find the customer's unpaid invoices
    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('*')
      .eq('owner_id', ownerId)
      .ilike('customer_name', `%${data.customer_name}%`)
      .neq('status', 'paid')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (creditsError) throw creditsError;

    if (!credits || credits.length === 0) {
      return {
        success: false,
        message: `No outstanding credits found for customer "${data.customer_name}".`,
      };
    }

    let remainingPayment = data.amount;
    const paymentDetails: any[] = [];

    for (const credit of credits) {
      if (remainingPayment <= 0) break;

      const paymentToApply = Math.min(remainingPayment, credit.remaining_amount);
      const newPaidAmount = (credit.paid_amount || 0) + paymentToApply;
      const newRemaining = credit.remaining_amount - paymentToApply;
      const newStatus = newRemaining <= 0 ? 'paid' : 'partial';

      // Update credit
      await supabase
        .from('credits')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemaining,
          status: newStatus,
        })
        .eq('id', credit.id);

      // Update related sale if exists
      if (credit.sale_id) {
        await supabase
          .from('sales')
          .update({
            paid_amount: newPaidAmount,
            payment_status: newStatus,
          })
          .eq('id', credit.sale_id);
      }

      paymentDetails.push({
        credit_id: credit.id,
        amount_applied: paymentToApply,
      });

      remainingPayment -= paymentToApply;
    }

    // Record in payment ledger
    await supabase.from('payment_ledger').insert({
      customer_name: data.customer_name,
      customer_phone: credits[0].customer_phone,
      payment_amount: data.amount,
      payment_date: new Date().toISOString().split('T')[0],
      details: paymentDetails,
      owner_id: ownerId,
    });

    return {
      success: true,
      message: `Payment of ${data.amount} from "${data.customer_name}" has been recorded and applied to their outstanding balance.`,
    };
  }

  return { success: false, message: "I can only record payments via voice commands." };
}

// Handle Cash Credit Commands
async function handleCashCreditCommand(
  action: string | null,
  data: Record<string, any>,
  ownerId: string
): Promise<ExecutionResult> {
  if (action === 'create' || action === 'add' || action === 'give') {
    const personType = data.person_type || 'Customer';
    
    const { error } = await supabase.from('credits').insert({
      customer_name: data.person_name || data.customer_name,
      amount: data.amount,
      remaining_amount: data.amount,
      paid_amount: 0,
      status: 'unpaid',
      credit_type: 'cash',
      person_type: personType,
      notes: data.note || data.reference,
      owner_id: ownerId,
    });

    if (error) throw error;

    return {
      success: true,
      message: `Cash credit of ${data.amount} to ${personType.toLowerCase()} "${data.person_name || data.customer_name}" has been recorded successfully.`,
    };
  }

  return { success: false, message: "I can only record cash credits via voice commands." };
}
