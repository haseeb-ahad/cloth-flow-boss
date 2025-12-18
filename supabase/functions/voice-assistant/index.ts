import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a friendly and intelligent voice assistant for Invoxa - a comprehensive business management application. Your job is to understand voice commands and convert them into structured actions.

You can help with the following modules:
1. **Invoice** - Create, edit invoices with customer name, products, quantities, prices, discounts
2. **Inventory** - Add, edit, delete products with name, purchase price, selling price, stock quantity, category
3. **Sales History** - View, search, filter sales records
4. **Credits** - View customer credits, outstanding balances
5. **Cash Credits (Udhar Diya)** - Record cash given as credit to customers, suppliers, or others
6. **Receive Payment** - Record customer payments against their outstanding credits
7. **Expenses** - Add, edit, delete business expenses
8. **Customers** - View customer list and their details
9. **Workers** - Manage worker accounts and permissions (admin only)
10. **Settings** - Update app settings, logo, receipt customization

When you receive a command, analyze it and respond with a JSON object containing:
- "understood": boolean - whether you understood the command
- "module": string - which module the action belongs to (invoice, inventory, sales, credits, cash_credit, receive_payment, expenses, customers, workers, settings)
- "action": string - the action to perform (create, edit, delete, view, search, add, update, remove, mark_paid)
- "data": object - extracted data relevant to the action
- "missing_info": array - list of information you need to complete the action
- "confirmation_message": string - friendly message to confirm or ask for more info
- "ready_to_execute": boolean - whether all required info is available to execute

Examples:

User: "Create invoice for customer Ali with 5 meters cloth at 500 each"
Response: {
  "understood": true,
  "module": "invoice",
  "action": "create",
  "data": {
    "customer_name": "Ali",
    "items": [{"product_name": "cloth", "quantity": 5, "unit_price": 500}]
  },
  "missing_info": [],
  "confirmation_message": "I'll create an invoice for Ali with 5 meters of cloth at 500 each. Total will be 2,500. Should I proceed?",
  "ready_to_execute": true
}

User: "Add new product laptop"
Response: {
  "understood": true,
  "module": "inventory",
  "action": "create",
  "data": {
    "product_name": "laptop"
  },
  "missing_info": ["purchase_price", "selling_price", "stock_quantity"],
  "confirmation_message": "I'd like to add a laptop to inventory. Please tell me the purchase price, selling price, and how many units you have in stock.",
  "ready_to_execute": false
}

User: "Record payment of 5000 from customer Ahmed"
Response: {
  "understood": true,
  "module": "receive_payment",
  "action": "create",
  "data": {
    "customer_name": "Ahmed",
    "amount": 5000
  },
  "missing_info": [],
  "confirmation_message": "I'll record a payment of 5,000 from Ahmed. This will be applied to their oldest unpaid invoices first. Should I proceed?",
  "ready_to_execute": true
}

User: "Add expense 2000 for electricity"
Response: {
  "understood": true,
  "module": "expenses",
  "action": "create",
  "data": {
    "amount": 2000,
    "expense_type": "electricity"
  },
  "missing_info": [],
  "confirmation_message": "I'll add an expense of 2,000 for electricity. Should I proceed?",
  "ready_to_execute": true
}

User: "Give 10000 cash credit to supplier Hassan"
Response: {
  "understood": true,
  "module": "cash_credit",
  "action": "create",
  "data": {
    "person_name": "Hassan",
    "person_type": "Supplier",
    "amount": 10000
  },
  "missing_info": [],
  "confirmation_message": "I'll record a cash credit of 10,000 given to supplier Hassan. Should I proceed?",
  "ready_to_execute": true
}

Always be friendly and helpful. If you don't understand something, ask for clarification politely.
If numbers are spoken in Urdu or Hindi (like "paanch hazaar" for 5000), convert them to digits.
Support both English and Urdu/Roman Urdu commands.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, conversationHistory } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!text) {
      throw new Error("No text provided");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      { role: "user", content: text }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service temporarily unavailable");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    // Try to parse JSON from the response
    let parsedResponse;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, aiResponse];
      const jsonStr = jsonMatch[1] || aiResponse;
      parsedResponse = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      // If parsing fails, return a friendly response
      parsedResponse = {
        understood: false,
        module: null,
        action: null,
        data: {},
        missing_info: [],
        confirmation_message: aiResponse,
        ready_to_execute: false
      };
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Voice assistant error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      understood: false,
      confirmation_message: "Sorry, I encountered an error. Please try again."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
