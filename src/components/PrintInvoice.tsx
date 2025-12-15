import { forwardRef } from "react";
import { formatDateInTimezone } from "@/contexts/TimezoneContext";

interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  quantity_type: string;
}

interface ReceiptSettings {
  logo_url?: string | null;
  shop_name?: string;
  shop_address?: string;
  phone_numbers?: string[];
  owner_names?: string[];
  thank_you_message?: string;
  footer_message?: string;
  worker_name?: string;
  worker_phone?: string;
}

interface PrintInvoiceProps {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  items: InvoiceItem[];
  discount: number;
  finalAmount: number;
  paidAmount: number;
  settings?: ReceiptSettings;
  timezone?: string;
}

const PrintInvoice = forwardRef<HTMLDivElement, PrintInvoiceProps>(
  ({ invoiceNumber, customerName, customerPhone, invoiceDate, items, discount, finalAmount, paidAmount, settings, timezone = "Asia/Karachi" }, ref) => {
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const dueAmount = finalAmount - (paidAmount || 0);

    // Format date and time for display using timezone
    const formatDateTime = (dateStr: string) => {
      return formatDateInTimezone(dateStr, timezone, "datetime");
    };

    const shopName = settings?.shop_name || "Your Shop Name";
    const shopAddress = settings?.shop_address || "Your Shop Address Here";
    const phoneNumbers = settings?.phone_numbers || ["+92-XXX-XXXXXXX"];
    const ownerNames = settings?.owner_names || ["Owner Name"];
    const thankYouMessage = settings?.thank_you_message || "Thank You!";
    const footerMessage = settings?.footer_message || "Get Well Soon";
    const logoUrl = settings?.logo_url;
    const workerName = settings?.worker_name;
    const workerPhone = settings?.worker_phone;

    return (
      <div ref={ref} className="print-invoice-container">
        <style>
          {`
            @media print {
              @page {
                size: 80mm auto;
                margin: 2mm;
              }
              
              body * {
                visibility: hidden;
              }
              
              .print-invoice-container,
              .print-invoice-container * {
                visibility: visible;
              }
              
              .print-invoice-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .no-print {
                display: none !important;
              }
            }
            
            .print-invoice-container {
              font-family: 'Courier New', Courier, monospace;
              background: white;
              padding: 10px;
              max-width: 80mm;
              margin: 0 auto;
              font-size: 12px;
              color: #333;
            }
            
            .receipt-header {
              text-align: center;
              margin-bottom: 10px;
            }
            
            .receipt-logo {
              width: 60px;
              height: 60px;
              object-fit: contain;
              margin: 0 auto 8px;
              display: block;
            }
            
            .shop-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 2px;
            }
            
            .shop-address {
              font-size: 11px;
              color: #666;
              margin-bottom: 2px;
            }
            
            .shop-phone {
              font-size: 11px;
              margin-bottom: 2px;
            }
            
            .divider {
              border-top: 1px dashed #ccc;
              margin: 8px 0;
            }
            
            .bill-info {
              font-size: 11px;
              text-align: left;
              margin-bottom: 8px;
            }
            
            .bill-info-row {
              display: flex;
              justify-content: space-between;
            }
            
            .items-header {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            
            .items-header span:first-child {
              flex: 2;
            }
            
            .items-header span:last-child {
              flex: 1;
              text-align: right;
            }
            
            .item-row {
              margin-bottom: 6px;
            }
            
            .item-name {
              font-size: 11px;
              font-weight: 500;
            }
            
            .item-details {
              font-size: 10px;
              color: #666;
              text-align: right;
            }
            
            .totals-section {
              margin-top: 10px;
              border-top: 1px dashed #ccc;
              padding-top: 8px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              margin-bottom: 4px;
            }
            
            .grand-total {
              font-size: 18px;
              font-weight: bold;
              text-align: center;
              margin: 10px 0;
              color: #1a5f7a;
            }
            
            .payment-info {
              text-align: right;
              font-size: 11px;
            }
            
            .footer-section {
              text-align: center;
              margin-top: 15px;
              border-top: 1px dashed #ccc;
              padding-top: 10px;
            }
            
            .thank-you {
              font-size: 12px;
              margin-bottom: 2px;
            }
            
            .footer-message {
              font-size: 11px;
              color: #666;
            }
          `}
        </style>

        {/* Header with Logo */}
        <div className="receipt-header">
          {logoUrl && (
            <img src={logoUrl} alt="Business Logo" className="receipt-logo" />
          )}
          <div className="shop-name">{shopName}</div>
          <div className="shop-address">{shopAddress}</div>
          {ownerNames.map((name, index) => (
            <div key={`name-${index}`} className="shop-phone" style={{ fontWeight: 500 }}>{name}</div>
          ))}
        </div>

        <div className="divider" />

        {/* Bill Info */}
        <div className="bill-info">
          <div>Bill No: {invoiceNumber}</div>
          <div>Date: {formatDateTime(invoiceDate)}</div>
          {customerName && <div>Customer: {customerName}</div>}
          {workerName && (
            <div>Served By: {workerName}{workerPhone ? ` (${workerPhone})` : ""}</div>
          )}
        </div>

        <div className="divider" />

        {/* Items Header */}
        <div className="items-header">
          <span>Item</span>
          <span>Qty x Price = Total</span>
        </div>

        {/* Items */}
        {items.filter(item => item.product_name && item.quantity > 0).map((item, index) => (
          <div key={index} className="item-row">
            <div className="item-name">{item.product_name}</div>
            <div className="item-details">
              {item.quantity} x PKR {item.unit_price.toLocaleString()} = PKR {item.total_price.toLocaleString()}
            </div>
          </div>
        ))}

        {/* Totals Section */}
        <div className="totals-section">
          <div className="total-row">
            <span>Subtotal:</span>
            <span>PKR {subtotal.toLocaleString()}</span>
          </div>
          {discount > 0 && (
            <div className="total-row">
              <span>Discount:</span>
              <span>- PKR {discount.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="grand-total">
          Total: PKR {finalAmount.toLocaleString()}
        </div>

        {/* Payment Info */}
        <div className="payment-info">
          <div>Paid: PKR {(paidAmount || 0).toLocaleString()}</div>
          <div>Due: PKR {dueAmount.toLocaleString()}</div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <div className="thank-you">{thankYouMessage}</div>
          <div className="footer-message">{footerMessage}</div>
        </div>
      </div>
    );
  }
);

PrintInvoice.displayName = "PrintInvoice";

export default PrintInvoice;