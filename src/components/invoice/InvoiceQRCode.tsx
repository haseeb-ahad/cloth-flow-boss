import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

interface InvoiceQRCodeProps {
  saleId: string;
  invoiceNumber: string;
  size?: number;
  className?: string;
}

const InvoiceQRCode = ({ saleId, invoiceNumber, size = 80, className = "" }: InvoiceQRCodeProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      if (!saleId) return;
      
      // Generate QR code with the invoice URL
      const invoiceUrl = `${window.location.origin}/invoice?edit=${saleId}`;
      
      try {
        const dataUrl = await QRCode.toDataURL(invoiceUrl, {
          width: size,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error("Error generating invoice QR code:", error);
      }
    };

    generateQR();
  }, [saleId, size]);

  if (!qrDataUrl) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img src={qrDataUrl} alt={`QR Code for ${invoiceNumber}`} style={{ width: size, height: size }} />
      <p className="text-[8px] text-center mt-0.5">Scan to view invoice</p>
    </div>
  );
};

export default InvoiceQRCode;
