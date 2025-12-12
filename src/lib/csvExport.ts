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

// Sales Export
export const exportSalesToCSV = (sales: any[]) => {
  exportToCSV({
    filename: `sales_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Invoice Number", key: "invoice_number" },
      { header: "Date", key: "created_at", format: (v) => formatDatePKT(v, "datetime") },
      { header: "Customer Name", key: "customer_name", format: (v) => v || "Walk-in" },
      { header: "Customer Phone", key: "customer_phone", format: (v) => v || "" },
      { header: "Total Amount", key: "total_amount" },
      { header: "Discount", key: "discount", format: (v) => v || "0" },
      { header: "Final Amount", key: "final_amount" },
      { header: "Paid Amount", key: "paid_amount", format: (v) => v || "0" },
      { header: "Payment Method", key: "payment_method", format: (v) => v || "cash" },
      { header: "Payment Status", key: "payment_status", format: (v) => v || "pending" },
    ],
    data: sales,
  });
};

// Credits Export
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
      { header: "Due Date", key: "due_date", format: (v) => v ? formatDatePKT(v) : "" },
      { header: "Notes", key: "notes", format: (v) => v || "" },
      { header: "Created At", key: "created_at", format: (v) => formatDatePKT(v) },
    ],
    data: credits,
  });
};

// Parse Credits CSV
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
    due_date: row[headerMap["due date"]] || row[headerMap["due_date"]] || null,
    notes: row[headerMap["notes"]] || null,
  })).filter(c => c.customer_name && c.amount > 0);
};

// Expenses Export
export const exportExpensesToCSV = (expenses: any[]) => {
  exportToCSV({
    filename: `expenses_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Date", key: "expense_date", format: (v) => formatDatePKT(v) },
      { header: "Type", key: "expense_type" },
      { header: "Description", key: "description", format: (v) => v || "" },
      { header: "Amount", key: "amount" },
    ],
    data: expenses,
  });
};

// Parse Expenses CSV
export const parseExpensesCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    expense_date: row[headerMap["date"]] || row[headerMap["expense_date"]] || new Date().toISOString().split("T")[0],
    expense_type: row[headerMap["type"]] || row[headerMap["expense_type"]] || "Other",
    description: row[headerMap["description"]] || null,
    amount: parseFloat(row[headerMap["amount"]] || "0") || 0,
  })).filter(e => e.amount > 0);
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

// Payments Export
export const exportPaymentsToCSV = (payments: any[]) => {
  exportToCSV({
    filename: `payments_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    columns: [
      { header: "Date", key: "payment_date", format: (v) => formatDatePKT(v) },
      { header: "Customer Name", key: "customer_name" },
      { header: "Customer Phone", key: "customer_phone", format: (v) => v || "" },
      { header: "Amount", key: "payment_amount" },
      { header: "Notes", key: "notes", format: (v) => v || "" },
    ],
    data: payments,
  });
};

// Parse Payments CSV
export const parsePaymentsCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    payment_date: row[headerMap["date"]] || row[headerMap["payment_date"]] || new Date().toISOString().split("T")[0],
    customer_name: row[headerMap["customer name"]] || row[headerMap["customer_name"]] || "",
    customer_phone: row[headerMap["customer phone"]] || row[headerMap["customer_phone"]] || null,
    payment_amount: parseFloat(row[headerMap["amount"]] || row[headerMap["payment_amount"]] || "0") || 0,
    notes: row[headerMap["notes"]] || null,
  })).filter(p => p.customer_name && p.payment_amount > 0);
};

// Parse Customers CSV
export const parseCustomersCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    customer_name: row[headerMap["customer name"]] || row[headerMap["customer_name"]] || "",
    customer_phone: row[headerMap["phone"]] || row[headerMap["customer_phone"]] || null,
  })).filter(c => c.customer_name);
};

// Parse Sales CSV
export const parseSalesCSV = (text: string) => {
  const { headers, rows } = parseCSV(text);
  const headerMap: Record<string, number> = {};
  headers.forEach((h, i) => headerMap[h.toLowerCase().trim()] = i);

  return rows.map(row => ({
    invoice_number: row[headerMap["invoice number"]] || row[headerMap["invoice_number"]] || "",
    customer_name: row[headerMap["customer name"]] || row[headerMap["customer_name"]] || null,
    customer_phone: row[headerMap["customer phone"]] || row[headerMap["customer_phone"]] || null,
    total_amount: parseFloat(row[headerMap["total amount"]] || row[headerMap["total_amount"]] || "0") || 0,
    discount: parseFloat(row[headerMap["discount"]] || "0") || 0,
    final_amount: parseFloat(row[headerMap["final amount"]] || row[headerMap["final_amount"]] || "0") || 0,
    paid_amount: parseFloat(row[headerMap["paid amount"]] || row[headerMap["paid_amount"]] || "0") || 0,
    payment_method: row[headerMap["payment method"]] || row[headerMap["payment_method"]] || "cash",
    payment_status: row[headerMap["payment status"]] || row[headerMap["payment_status"]] || "pending",
  })).filter(s => s.invoice_number && s.final_amount > 0);
};
