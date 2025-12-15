import { forwardRef } from "react";

interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  quantity_type: string;
}

interface PrintInvoiceProps {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  items: InvoiceItem[];
  discount: number;
  finalAmount: number;
  logoUrl?: string | null;
}

const PrintInvoice = forwardRef<HTMLDivElement, PrintInvoiceProps>(
  ({ invoiceNumber, customerName, customerPhone, invoiceDate, items, discount, finalAmount, logoUrl }, ref) => {
    // Calculate totals
    const total = items.reduce((sum, item) => sum + item.total_price, 0);

    // Format date for display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ur-PK', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    };

    // Generate empty rows to fill the table
    const emptyRowsCount = Math.max(0, 15 - items.length);
    const emptyRows = Array(emptyRowsCount).fill(null);

    return (
      <div ref={ref} className="print-invoice-container">
        <style>
          {`
            @media print {
              @page {
                size: A4;
                margin: 10mm;
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
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Urdu Typesetting', Arial, sans-serif;
              direction: rtl;
              background: white;
              padding: 15px;
              max-width: 210mm;
              margin: 0 auto;
            }
            
            .invoice-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 10px;
              padding-bottom: 5px;
            }
            
            .header-left {
              text-align: left;
              direction: ltr;
            }
            
            .header-left .owner-name {
              font-size: 16px;
              font-weight: bold;
              color: #c00;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .header-left .phone {
              font-size: 14px;
              color: #000;
              font-weight: bold;
            }
            
            .header-center {
              text-align: center;
              flex: 1;
            }
            
            .header-center .business-name {
              font-size: 36px;
              font-weight: bold;
              color: #c00;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .header-center .tagline {
              font-size: 12px;
              color: #00008B;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .header-center .sub-name {
              font-size: 18px;
              color: #c00;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .header-right {
              text-align: right;
            }
            
            .header-right .logo {
              width: 60px;
              height: 60px;
              object-fit: contain;
            }
            
            .red-banner {
              background: #c00;
              color: white;
              text-align: center;
              padding: 8px;
              font-size: 14px;
              margin-bottom: 10px;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .customer-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              border-bottom: 1px solid #000;
              padding-bottom: 8px;
            }
            
            .customer-info-item {
              display: flex;
              align-items: center;
              gap: 10px;
              font-size: 14px;
            }
            
            .customer-info-label {
              font-weight: bold;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .customer-info-value {
              min-width: 150px;
              border-bottom: 1px dotted #000;
            }
            
            .invoice-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            
            .invoice-table th {
              background: #00008B;
              color: white;
              padding: 8px 10px;
              text-align: center;
              font-size: 14px;
              font-weight: bold;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .invoice-table td {
              border: 1px solid #c00;
              padding: 6px 10px;
              text-align: center;
              font-size: 13px;
              min-height: 28px;
              height: 28px;
            }
            
            .invoice-table .item-row td {
              background: white;
            }
            
            .invoice-table .empty-row td {
              background: white;
            }
            
            .total-row {
              background: #f0f0f0;
            }
            
            .total-row td {
              font-weight: bold;
              font-size: 14px;
            }
            
            .total-label {
              background: #00008B !important;
              color: white !important;
            }
            
            .footer-terms {
              background: #00008B;
              color: white;
              padding: 8px;
              font-size: 11px;
              text-align: center;
              margin-top: 10px;
              font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', Arial, sans-serif;
            }
            
            .footer-address {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              font-size: 12px;
              border-top: 1px solid #000;
              margin-top: 10px;
            }
            
            .signature-line {
              border-top: 1px solid #000;
              width: 150px;
              text-align: center;
              padding-top: 5px;
            }
          `}
        </style>

        {/* Header */}
        <div className="invoice-header">
          {/* Left side - Contact info */}
          <div className="header-left">
            <div className="owner-name">امیر حمزہ صادق</div>
            <div className="phone">0303-7370346</div>
            <div className="phone">0310-6570056</div>
            <div className="owner-name" style={{ marginTop: '8px' }}>امیر عباس صادق</div>
            <div className="phone">0306-7751905</div>
          </div>
          
          {/* Center - Business name and tagline */}
          <div className="header-center">
            <div className="tagline">جنس وارنٹی کا اعلیٰ مرکز</div>
            <div className="business-name">اُم زہ</div>
            <div className="sub-name">کلاتھ اینڈ کٹ پیس پوائنٹ</div>
          </div>
          
          {/* Right side - Logo */}
          <div className="header-right">
            {logoUrl ? (
              <img src={logoUrl} alt="Business Logo" className="logo" />
            ) : (
              <div style={{ width: '60px', height: '60px', border: '1px solid #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '10px', color: '#666' }}>Logo</span>
              </div>
            )}
          </div>
        </div>

        {/* Red Banner */}
        <div className="red-banner">
          ہماری ہاں ہر قسم کے کپڑے کی وارنٹی دستیاب ہے۔
          موسم کے مطابق ہر وارنٹی بازار سے بارعایت خرید یں۔
        </div>

        {/* Customer Info */}
        <div className="customer-info">
          <div className="customer-info-item">
            <span className="customer-info-label">نام خریدار</span>
            <span className="customer-info-value">{customerName || '____________________'}</span>
          </div>
          <div className="customer-info-item">
            <span className="customer-info-label">تاریخ</span>
            <span className="customer-info-value">{formatDate(invoiceDate)}</span>
          </div>
        </div>

        {/* Invoice Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '10%' }}>تعداد</th>
              <th style={{ width: '50%' }}>تفصیل</th>
              <th style={{ width: '20%' }}>ریٹ</th>
              <th style={{ width: '20%' }}>رقم</th>
            </tr>
          </thead>
          <tbody>
            {items.filter(item => item.product_name && item.quantity > 0).map((item, index) => (
              <tr key={index} className="item-row">
                <td>{item.quantity} {item.quantity_type}</td>
                <td style={{ textAlign: 'right' }}>{item.product_name}</td>
                <td>{item.unit_price.toLocaleString()}</td>
                <td>{item.total_price.toLocaleString()}</td>
              </tr>
            ))}
            
            {/* Empty rows to fill the table */}
            {emptyRows.map((_, index) => (
              <tr key={`empty-${index}`} className="empty-row">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
            
            {/* Total row */}
            <tr className="total-row">
              <td colSpan={3} className="total-label">ٹوٹل</td>
              <td>{finalAmount.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        {/* Footer Terms */}
        <div className="footer-terms">
          ★ اوریجنل کی گارنٹی نو کلیم ★ شرنگ کیا ہوا سٹ واپس یا تبدیل نہیں ہوگا
          ★ بل کے بغیر سٹ واپس یا تبدیل نہیں ہوگا ★ سلا ہوا سٹ واپس یا کلیم نہ ہوگا
        </div>

        {/* Footer Address */}
        <div className="footer-address">
          <div className="signature-line">
            <span>دستخط</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span>📍 اندرون شاہی بازار جناح روڈ (المشہور گندی گلی) بہاولپور۔</span>
          </div>
        </div>
      </div>
    );
  }
);

PrintInvoice.displayName = "PrintInvoice";

export default PrintInvoice;
