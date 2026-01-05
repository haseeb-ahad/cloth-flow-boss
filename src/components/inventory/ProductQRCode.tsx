import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Printer } from "lucide-react";

interface ProductQRCodeProps {
  productId: string;
  productName: string;
  sku?: string;
  size?: number;
}

const ProductQRCode = ({ productId, productName, sku, size = 200 }: ProductQRCodeProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code URL - uses the product SKU or ID for scanning
  const productUrl = `${window.location.origin}/product/${sku || productId}`;

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen, productId, sku]);

  const generateQRCode = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(productUrl, {
        width: size,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement("a");
    link.download = `QR-${sku || productId}-${productName.replace(/\s+/g, "-")}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${productName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px solid #000;
              border-radius: 8px;
            }
            .product-name {
              font-size: 16px;
              font-weight: bold;
              margin-top: 10px;
              max-width: 250px;
              word-wrap: break-word;
            }
            .sku {
              font-size: 12px;
              color: #666;
              margin-top: 4px;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrDataUrl}" alt="QR Code" width="200" height="200" />
            <div class="product-name">${productName}</div>
            ${sku ? `<div class="sku">SKU: ${sku}</div>` : ""}
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="View QR Code">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4 py-4">
          {qrDataUrl ? (
            <>
              <div className="border-4 border-primary/20 rounded-lg p-4 bg-white">
                <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{productName}</p>
                {sku && <p className="text-sm text-muted-foreground">SKU: {sku}</p>}
              </div>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Scan this QR code to view product details or add to invoice
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PNG
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductQRCode;