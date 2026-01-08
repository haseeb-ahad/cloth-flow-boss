import { formatDatePKT } from "./utils";

interface CSVColumn {
  header: string;
  key: string;
  format?: (value: any) => string;
}

interface ExportOptions {
  columns: CSVColumn[];
  data: any[];
  filename: string;
}

// Export to CSV
export const exportToCSV = ({ columns, data, filename }: ExportOptions) => {
  const headers = columns.map(col => col.header).join(",");
  
  const rows = data.map(row => {
    return columns.map(col => {
      let value = row[col.key];
      if (col.format) {
        value = col.format(value);
      } else if (value === null || value === undefined) {
        value = "";
      }
      // Escape quotes and wrap in quotes if contains comma or quote
      const stringValue = String(value).replace(/"/g, '""');
      return stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")
        ? `"${stringValue}"`
        : stringValue;
    }).join(",");
  });

  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Parse CSV file
export const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
};

// Inventory Export
export const exportInventoryToCSV = (products: any[]) => {
  exportToCSV({
    filename: `inventory_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Name", key: "name" },
      { header: "Category", key: "category", format: (v) => v || "" },
      { header: "Description", key: "description", format: (v) => v || "" },
      { header: "Purchase Price", key: "purchase_price" },
      { header: "Selling Price", key: "selling_price" },
      { header: "Stock Quantity", key: "stock_quantity" },
      { header: "Quantity Type", key: "quantity_type" },
    ],
    data: products,
  });
};

// Parse Inventory CSV
export const parseInventoryCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    name: row[headerMap["name"]] || "",
    category: row[headerMap["category"]] || null,
    description: row[headerMap["description"]] || null,
    purchase_price: parseFloat(row[headerMap["purchase price"]] || row[headerMap["purchase_price"]] || "0") || 0,
    selling_price: parseFloat(row[headerMap["selling price"]] || row[headerMap["selling_price"]] || "0") || 0,
    stock_quantity: parseFloat(row[headerMap["stock quantity"]] || row[headerMap["stock_quantity"]] || "0") || 0,
    quantity_type: row[headerMap["quantity type"]] || row[headerMap["quantity_type"]] || "Unit",
  })).filter(p => p.name);
};

// Sales Export with items - preserves exact raw datetime from database
export const exportSalesToCSV = async (sales: any[], fetchSaleItems: (saleId: string) => Promise<any[]>) => {
  // Flatten sales with their items - each row is one item
  const rows: any[] = [];
  
  for (const sale of sales) {
    const items = await fetchSaleItems(sale.id);
    
    if (items.length === 0) {
      // Sale with no items - export header only
      rows.push({
        invoice_number: sale.invoice_number,
        created_at: sale.created_at || "", // Keep raw ISO datetime
        customer_name: sale.customer_name || "",
        customer_phone: sale.customer_phone || "",
        total_amount: sale.total_amount,
        discount: sale.discount || 0,
        final_amount: sale.final_amount,
        paid_amount: sale.paid_amount || 0,
        payment_method: sale.payment_method || "cash",
        payment_status: sale.payment_status || "pending",
        description: sale.description || "",
        // Item fields empty
        product_name: "",
        product_id: "",
        quantity: "",
        unit_price: "",
        purchase_price: "",
        total_price: "",
        profit: "",
      });
    } else {
      // Export each item as a separate row
      for (const item of items) {
        rows.push({
          invoice_number: sale.invoice_number,
          created_at: sale.created_at || "", // Keep raw ISO datetime
          customer_name: sale.customer_name || "",
          customer_phone: sale.customer_phone || "",
          total_amount: sale.total_amount,
          discount: sale.discount || 0,
          final_amount: sale.final_amount,
          paid_amount: sale.paid_amount || 0,
          payment_method: sale.payment_method || "cash",
          payment_status: sale.payment_status || "pending",
          description: sale.description || "",
          // Item fields
          product_name: item.product_name,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_price: item.purchase_price,
          total_price: item.total_price,
          profit: item.profit,
        });
      }
    }
  }
  
  exportToCSV({
    filename: `sales_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Invoice Number", key: "invoice_number" },
      { header: "Date", key: "created_at" }, // Raw ISO datetime - no formatting
      { header: "Customer Name", key: "customer_name" },
      { header: "Customer Phone", key: "customer_phone" },
      { header: "Total Amount", key: "total_amount" },
      { header: "Discount", key: "discount" },
      { header: "Final Amount", key: "final_amount" },
      { header: "Paid Amount", key: "paid_amount" },
      { header: "Payment Method", key: "payment_method" },
      { header: "Payment Status", key: "payment_status" },
      { header: "Description", key: "description" },
      { header: "Product Name", key: "product_name" },
      { header: "Product ID", key: "product_id" },
      { header: "Quantity", key: "quantity" },
      { header: "Unit Price", key: "unit_price" },
      { header: "Purchase Price", key: "purchase_price" },
      { header: "Total Price", key: "total_price" },
      { header: "Profit", key: "profit" },
    ],
    data: rows,
  });
};

// Parse Sales CSV with items - preserves exact datetime from CSV
export const parseSalesCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  // Group by invoice_number
  const salesMap = new Map<string, { sale: any; items: any[] }>();

  for (const row of rows) {
    const invoiceNumber = row[headerMap["invoice number"]] || row[headerMap["invoice_number"]] || "";
    if (!invoiceNumber) continue;

    // Get the raw date value - keep as-is (ISO format from export)
    const dateValue = row[headerMap["date"]] || row[headerMap["created_at"]] || "";

    if (!salesMap.has(invoiceNumber)) {
      salesMap.set(invoiceNumber, {
        sale: {
          invoice_number: invoiceNumber,
          created_at: dateValue || null, // Keep raw datetime as-is
          customer_name: row[headerMap["customer name"]] || row[headerMap["customer_name"]] || null,
          customer_phone: row[headerMap["customer phone"]] || row[headerMap["customer_phone"]] || null,
          total_amount: parseFloat(row[headerMap["total amount"]] || row[headerMap["total_amount"]] || "0") || 0,
          discount: parseFloat(row[headerMap["discount"]] || "0") || 0,
          final_amount: parseFloat(row[headerMap["final amount"]] || row[headerMap["final_amount"]] || "0") || 0,
          paid_amount: parseFloat(row[headerMap["paid amount"]] || row[headerMap["paid_amount"]] || "0") || 0,
          payment_method: row[headerMap["payment method"]] || row[headerMap["payment_method"]] || "cash",
          payment_status: row[headerMap["payment status"]] || row[headerMap["payment_status"]] || "pending",
          description: row[headerMap["description"]] || null,
        },
        items: [],
      });
    }

    // Add item if product_name exists
    const productName = row[headerMap["product name"]] || row[headerMap["product_name"]] || "";
    if (productName) {
      salesMap.get(invoiceNumber)!.items.push({
        product_name: productName,
        product_id: row[headerMap["product id"]] || row[headerMap["product_id"]] || "",
        quantity: parseFloat(row[headerMap["quantity"]] || "1") || 1,
        unit_price: parseFloat(row[headerMap["unit price"]] || row[headerMap["unit_price"]] || "0") || 0,
        purchase_price: parseFloat(row[headerMap["purchase price"]] || row[headerMap["purchase_price"]] || "0") || 0,
        total_price: parseFloat(row[headerMap["total price"]] || row[headerMap["total_price"]] || "0") || 0,
        profit: parseFloat(row[headerMap["profit"]] || "0") || 0,
      });
    }
  }

  return Array.from(salesMap.values()).filter(s => s.sale.final_amount > 0);
};

// Credits Export - preserves exact raw dates from database
export const exportCreditsToCSV = (credits: any[]) => {
  exportToCSV({
    filename: `credits_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Customer Name", key: "customer_name" },
      { header: "Customer Phone", key: "customer_phone", format: (v) => v || "" },
      { header: "Amount", key: "amount" },
      { header: "Paid Amount", key: "paid_amount" },
      { header: "Remaining Amount", key: "remaining_amount" },
      { header: "Status", key: "status" },
      { header: "Due Date", key: "due_date", format: (v) => v || "" }, // Raw date, no formatting
      { header: "Notes", key: "notes", format: (v) => v || "" },
      { header: "Created At", key: "created_at", format: (v) => v || "" }, // Raw datetime, no formatting
    ],
    data: credits,
  });
};

// Parse Credits CSV - preserves exact dates from CSV
export const parseCreditsCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    customer_name: row[headerMap["customer name"]] || row[headerMap["customer_name"]] || "",
    customer_phone: row[headerMap["customer phone"]] || row[headerMap["customer_phone"]] || null,
    amount: parseFloat(row[headerMap["amount"]] || "0") || 0,
    paid_amount: parseFloat(row[headerMap["paid amount"]] || row[headerMap["paid_amount"]] || "0") || 0,
    remaining_amount: parseFloat(row[headerMap["remaining amount"]] || row[headerMap["remaining_amount"]] || "0") || 0,
    status: row[headerMap["status"]] || "pending",
    due_date: row[headerMap["due date"]] || row[headerMap["due_date"]] || null, // Keep raw date as-is
    notes: row[headerMap["notes"]] || null,
    created_at: row[headerMap["created at"]] || row[headerMap["created_at"]] || null, // Keep raw datetime
  })).filter(c => c.customer_name && c.amount > 0);
};

// Expenses Export - includes ID for duplicate prevention, preserves raw dates
export const exportExpensesToCSV = (expenses: any[]) => {
  exportToCSV({
    filename: `expenses_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "ID", key: "id" },
      { header: "Date", key: "expense_date" }, // Raw date YYYY-MM-DD
      { header: "Type", key: "expense_type" },
      { header: "Description", key: "description", format: (v) => v || "" },
      { header: "Amount", key: "amount" },
      { header: "Created At", key: "created_at", format: (v) => v || "" }, // Raw datetime, no formatting
    ],
    data: expenses,
  });
};

// Parse Expenses CSV with validation and duplicate detection
export const parseExpensesCSV = (text: string): { 
  expenses: any[]; 
  errors: string[]; 
  duplicateIds: string[];
} => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  const expenses: any[] = [];
  const errors: string[] = [];
  const duplicateIds: string[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, and index is 0-based
    const rowErrors: string[] = [];

    // Get values with flexible column name matching
    const id = row[headerMap["id"]] || "";
    let dateValue = row[headerMap["date"]] || row[headerMap["expense_date"]] || "";
    const expenseType = row[headerMap["type"]] || row[headerMap["expense_type"]] || "";
    const description = row[headerMap["description"]] || "";
    const amountStr = row[headerMap["amount"]] || "0";

    // Parse and validate date - handle multiple formats
    let parsedDate = "";
    if (dateValue) {
      // Try YYYY-MM-DD format first (our export format)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        parsedDate = dateValue;
      } 
      // Try DD/MM/YYYY format (PKT display format)
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
        const parts = dateValue.split("/");
        parsedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      // Try MM/DD/YYYY format
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
        const parts = dateValue.split("/");
        parsedDate = `${parts[2]}-${parts[0]}-${parts[1]}`;
      }
      // Try parsing as Date object
      else {
        const dateObj = new Date(dateValue);
        if (!isNaN(dateObj.getTime())) {
          parsedDate = dateObj.toISOString().split("T")[0];
        }
      }
    }

    // Validate mandatory fields
    if (!parsedDate) {
      rowErrors.push(`Row ${rowNum}: Invalid or missing date "${dateValue}"`);
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      rowErrors.push(`Row ${rowNum}: Invalid or missing amount "${amountStr}"`);
    }

    if (!expenseType.trim()) {
      rowErrors.push(`Row ${rowNum}: Missing expense type`);
    }

    // Track duplicate IDs for prevention
    if (id) {
      duplicateIds.push(id);
    }

    // Only add valid rows
    if (rowErrors.length === 0) {
      expenses.push({
        original_id: id || null, // Store original ID for duplicate checking
        expense_date: parsedDate || new Date().toISOString().split("T")[0],
        expense_type: expenseType || "Other",
        description: description || null,
        amount: amount,
      });
    } else {
      errors.push(...rowErrors);
    }
  });

  return { expenses, errors, duplicateIds: duplicateIds.filter(Boolean) };
};

// Customers Export
export const exportCustomersToCSV = (customers: any[]) => {
  exportToCSV({
    filename: `customers_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Customer Name", key: "name" },
      { header: "Phone", key: "phone", format: (v) => v || "" },
      { header: "Total Credit", key: "total_credit" },
      { header: "Total Paid", key: "total_paid" },
      { header: "Remaining Balance", key: "remaining_balance" },
    ],
    data: customers,
  });
};

// Parse Payments CSV - preserves raw dates
export const parsePaymentsCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    customer_name: row[headerMap["customer name"]] || row[headerMap["customer_name"]] || "",
    customer_phone: row[headerMap["customer phone"]] || row[headerMap["customer_phone"]] || null,
    payment_amount: parseFloat(row[headerMap["amount"]] || row[headerMap["payment_amount"]] || "0") || 0,
    payment_date: row[headerMap["date"]] || row[headerMap["payment_date"]] || null, // Keep raw date as-is
    notes: row[headerMap["notes"]] || null,
    created_at: row[headerMap["created at"]] || row[headerMap["created_at"]] || null, // Keep raw datetime
  })).filter(p => p.customer_name && p.payment_amount > 0);
};

// Parse Customers CSV
export const parseCustomersCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    name: row[headerMap["customer name"]] || row[headerMap["name"]] || "",
    phone: row[headerMap["phone"]] || row[headerMap["customer_phone"]] || null,
  })).filter(c => c.name);
};

// Payments Export - preserves raw dates
export const exportPaymentsToCSV = (payments: any[]) => {
  exportToCSV({
    filename: `payments_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Date", key: "payment_date" }, // Raw date, no formatting
      { header: "Customer Name", key: "customer_name" },
      { header: "Customer Phone", key: "customer_phone", format: (v) => v || "" },
      { header: "Amount", key: "payment_amount" },
      { header: "Notes", key: "notes", format: (v) => v || "" },
      { header: "Created At", key: "created_at", format: (v) => v || "" }, // Raw datetime
    ],
    data: payments,
  });
};
