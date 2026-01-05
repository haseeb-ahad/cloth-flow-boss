import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Printer, QrCode } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string | null;
}

interface BatchQRPrintProps {
  selectedProducts: Product[];
  isOpen: boolean;
  onClose: () => void;
}

const BatchQRPrint = ({ selectedProducts, isOpen, onClose }: BatchQRPrintProps) => {
  const [qrCodes, setQrCodes] = useState<{ product: Product; dataUrl: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && selectedProducts.length > 0) {
      generateAllQRCodes();
    }
  }, [isOpen, selectedProducts]);

  const generateAllQRCodes = async () => {
    setIsGenerating(true);
    try {
      const codes = await Promise.all(
        selectedProducts.map(async (product) => {
          const productUrl = `${window.location.origin}/product/${product.sku || product.id}`;
          const dataUrl = await QRCode.toDataURL(productUrl, {
            width: 150,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
            errorCorrectionLevel: "H",
          });
          return { product, dataUrl };
        })
      );
      setQrCodes(codes);
    } catch (error) {
      console.error("Error generating QR codes:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrGridHtml = qrCodes
      .map(
        ({ product, dataUrl }) => `
        <div class="qr-item">
          <img src="${dataUrl}" alt="QR Code" width="120" height="120" />
          <div class="product-name">${product.name}</div>
          ${product.sku ? `<div class="sku">SKU: ${product.sku}</div>` : ""}
        </div>
      `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch QR Codes - ${selectedProducts.length} Products</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 10mm;
            }
            .header {
              text-align: center;
              margin-bottom: 10mm;
              padding-bottom: 5mm;
              border-bottom: 1px solid #ccc;
            }
            .header h1 {
              font-size: 16px;
              margin-bottom: 4px;
            }
            .header p {
              font-size: 11px;
              color: #666;
            }
            .qr-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8mm;
              justify-items: center;
            }
            .qr-item {
              text-align: center;
              padding: 4mm;
              border: 1px dashed #ccc;
              border-radius: 4px;
              width: 45mm;
              page-break-inside: avoid;
            }
            .qr-item img {
              display: block;
              margin: 0 auto 3mm;
            }
            .product-name {
              font-size: 9px;
              font-weight: bold;
              margin-bottom: 2px;
              max-width: 40mm;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .sku {
              font-size: 8px;
              color: #666;
              font-family: monospace;
            }
            @media print {
              body { padding: 5mm; }
              .qr-grid { gap: 5mm; }
              .qr-item { border-color: #999; }
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Product QR Codes</h1>
            <p>${selectedProducts.length} products - Print on sticker sheet</p>
          </div>
          <div class="qr-grid">
            ${qrGridHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Batch QR Codes - {selectedProducts.length} Products
          </DialogTitle>
          <DialogDescription>
            Preview and print QR codes for selected products on a sticker sheet
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isGenerating ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              <span className="ml-3 text-muted-foreground">Generating QR codes...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 mb-6">
                {qrCodes.map(({ product, dataUrl }) => (
                  <div
                    key={product.id}
                    className="flex flex-col items-center p-2 border border-dashed border-border rounded-lg bg-background"
                  >
                    <img src={dataUrl} alt="QR Code" className="w-16 h-16 mb-1" />
                    <p className="text-[10px] font-medium text-center truncate w-full">
                      {product.name}
                    </p>
                    {product.sku && (
                      <p className="text-[8px] text-muted-foreground font-mono">
                        {product.sku}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print All QR Codes
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatchQRPrint;
