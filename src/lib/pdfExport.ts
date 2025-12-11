import jsPDF from "jspdf";
import { formatDatePKT } from "./utils";

interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "center" | "right";
  format?: (value: any) => string;
}

interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: TableColumn[];
  data: any[];
  filename: string;
  orientation?: "portrait" | "landscape";
}

export const exportToPDF = ({
  title,
  subtitle,
  columns,
  data,
  filename,
  orientation = "portrait",
}: ExportOptions) => {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(subtitle, pageWidth / 2, yPos, { align: "center" });
    yPos += 5;
  }

  // Date
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${formatDatePKT(new Date(), "datetime")}`, pageWidth / 2, yPos, { align: "center" });
  yPos += 10;

  // Calculate column widths
  const contentWidth = pageWidth - margin * 2;
  const totalDefinedWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
  const colsWithoutWidth = columns.filter((col) => !col.width).length;
  const remainingWidth = contentWidth - totalDefinedWidth;
  const defaultColWidth = colsWithoutWidth > 0 ? remainingWidth / colsWithoutWidth : 0;

  const colWidths = columns.map((col) => col.width || defaultColWidth);

  // Table Header
  doc.setFillColor(41, 37, 36); // Dark background
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  const headerHeight = 8;
  doc.rect(margin, yPos, contentWidth, headerHeight, "F");

  let xPos = margin;
  columns.forEach((col, index) => {
    const textX = col.align === "right" 
      ? xPos + colWidths[index] - 2 
      : col.align === "center" 
        ? xPos + colWidths[index] / 2 
        : xPos + 2;
    
    doc.text(col.header, textX, yPos + 5.5, { 
      align: col.align || "left",
      maxWidth: colWidths[index] - 4
    });
    xPos += colWidths[index];
  });
  yPos += headerHeight;

  // Table Data
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const rowHeight = 7;

  data.forEach((row, rowIndex) => {
    // Check for page break
    if (yPos + rowHeight > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      
      // Repeat header on new page
      doc.setFillColor(41, 37, 36);
      doc.setTextColor(255);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.rect(margin, yPos, contentWidth, headerHeight, "F");
      
      xPos = margin;
      columns.forEach((col, index) => {
        const textX = col.align === "right" 
          ? xPos + colWidths[index] - 2 
          : col.align === "center" 
            ? xPos + colWidths[index] / 2 
            : xPos + 2;
        doc.text(col.header, textX, yPos + 5.5, { 
          align: col.align || "left",
          maxWidth: colWidths[index] - 4
        });
        xPos += colWidths[index];
      });
      yPos += headerHeight;
      
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    // Alternate row colors
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, yPos, contentWidth, rowHeight, "F");
    }

    xPos = margin;
    columns.forEach((col, index) => {
      let value = row[col.key];
      if (col.format) {
        value = col.format(value);
      } else if (value === null || value === undefined) {
        value = "-";
      } else {
        value = String(value);
      }

      const textX = col.align === "right" 
        ? xPos + colWidths[index] - 2 
        : col.align === "center" 
          ? xPos + colWidths[index] / 2 
          : xPos + 2;

      doc.text(value, textX, yPos + 5, {
        align: col.align || "left",
        maxWidth: colWidths[index] - 4
      });
      xPos += colWidths[index];
    });
    yPos += rowHeight;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`${filename}.pdf`);
};

// Inventory Export
export const exportInventoryToPDF = (products: any[]) => {
  exportToPDF({
    title: "Inventory Report",
    subtitle: `Total Products: ${products.length}`,
    filename: `inventory_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    orientation: "landscape",
    columns: [
      { header: "#", key: "index", width: 10, align: "center" },
      { header: "Product Name", key: "name", width: 50 },
      { header: "Category", key: "category", width: 30 },
      { header: "Purchase Price", key: "purchase_price", width: 30, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Selling Price", key: "selling_price", width: 30, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Stock", key: "stock_quantity", width: 20, align: "right" },
      { header: "Type", key: "quantity_type", width: 20, align: "center" },
    ],
    data: products.map((p, i) => ({ ...p, index: i + 1 })),
  });
};

// Sales Export
export const exportSalesToPDF = (sales: any[]) => {
  exportToPDF({
    title: "Sales History Report",
    subtitle: `Total Sales: ${sales.length}`,
    filename: `sales_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    orientation: "landscape",
    columns: [
      { header: "Invoice #", key: "invoice_number", width: 25 },
      { header: "Date", key: "created_at", width: 30, format: (v) => formatDatePKT(v, "datetime") },
      { header: "Customer", key: "customer_name", width: 35, format: (v) => v || "Walk-in" },
      { header: "Total", key: "total_amount", width: 25, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Cost", key: "total_cost", width: 25, align: "right", format: (v) => `Rs. ${Number(v || 0).toFixed(2)}` },
      { header: "Profit", key: "total_profit", width: 25, align: "right", format: (v) => `Rs. ${Number(v || 0).toFixed(2)}` },
      { header: "Final", key: "final_amount", width: 25, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Paid", key: "paid_amount", width: 25, align: "right", format: (v) => `Rs. ${Number(v || 0).toFixed(2)}` },
    ],
    data: sales,
  });
};

// Credits Export
export const exportCreditsToPDF = (credits: any[]) => {
  exportToPDF({
    title: "Credits Report",
    subtitle: `Total Records: ${credits.length}`,
    filename: `credits_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    orientation: "landscape",
    columns: [
      { header: "Invoice #", key: "invoice_number", width: 25 },
      { header: "Date", key: "created_at", width: 30, format: (v) => formatDatePKT(v) },
      { header: "Customer", key: "customer_name", width: 40 },
      { header: "Phone", key: "customer_phone", width: 30, format: (v) => v || "-" },
      { header: "Amount", key: "amount", width: 25, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Paid", key: "paid_amount", width: 25, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Remaining", key: "remaining_amount", width: 25, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Status", key: "status", width: 20, align: "center" },
    ],
    data: credits,
  });
};

// Expenses Export
export const exportExpensesToPDF = (expenses: any[]) => {
  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  exportToPDF({
    title: "Expenses Report",
    subtitle: `Total Expenses: Rs. ${total.toLocaleString()}`,
    filename: `expenses_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    orientation: "portrait",
    columns: [
      { header: "#", key: "index", width: 15, align: "center" },
      { header: "Date", key: "expense_date", width: 35, format: (v) => formatDatePKT(v) },
      { header: "Type", key: "expense_type", width: 40 },
      { header: "Description", key: "description", width: 50, format: (v) => v || "-" },
      { header: "Amount", key: "amount", width: 35, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
    ],
    data: expenses.map((e, i) => ({ ...e, index: i + 1 })),
  });
};

// Customers Export
export const exportCustomersToPDF = (customers: any[]) => {
  exportToPDF({
    title: "Customer List Report",
    subtitle: `Total Customers: ${customers.length}`,
    filename: `customers_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    orientation: "landscape",
    columns: [
      { header: "#", key: "index", width: 10, align: "center" },
      { header: "Customer Name", key: "name", width: 50 },
      { header: "Phone", key: "phone", width: 35, format: (v) => v || "-" },
      { header: "Total Credit", key: "total_credit", width: 35, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Total Paid", key: "total_paid", width: 35, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Remaining", key: "remaining_balance", width: 35, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
    ],
    data: customers.map((c, i) => ({ ...c, index: i + 1 })),
  });
};

// Payments Export
export const exportPaymentsToPDF = (payments: any[]) => {
  const total = payments.reduce((sum, p) => sum + Number(p.payment_amount || 0), 0);
  exportToPDF({
    title: "Payment Ledger Report",
    subtitle: `Total Payments: Rs. ${total.toLocaleString()}`,
    filename: `payments_${formatDatePKT(new Date()).replace(/\//g, "-")}`,
    orientation: "portrait",
    columns: [
      { header: "#", key: "index", width: 15, align: "center" },
      { header: "Date", key: "payment_date", width: 35, format: (v) => formatDatePKT(v) },
      { header: "Customer", key: "customer_name", width: 55 },
      { header: "Amount", key: "payment_amount", width: 35, align: "right", format: (v) => `Rs. ${Number(v).toFixed(2)}` },
      { header: "Invoices Applied", key: "details", width: 40, format: (v) => Array.isArray(v) ? v.map(d => d.invoice_number).join(", ") : "-" },
    ],
    data: payments.map((p, i) => ({ ...p, index: i + 1 })),
  });
};
