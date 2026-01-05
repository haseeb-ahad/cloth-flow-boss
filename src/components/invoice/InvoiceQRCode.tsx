import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceQRCodeProps {
  saleId: string;
  invoiceNumber: string;
  ownerId?: string;
  size?: number;
  className?: string;
}

const InvoiceQRCode = ({ saleId, invoiceNumber, ownerId, size = 80, className = "" }: InvoiceQRCodeProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Fetch shop logo
  useEffect(() => {
    const fetchLogo = async () => {
      if (!ownerId) return;
      
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("logo_url")
          .eq("owner_id", ownerId)
          .maybeSingle();
        
        if (data?.logo_url) {
          setLogoUrl(data.logo_url);
        }
      } catch (error) {
        console.error("Error fetching shop logo:", error);
      }
    };

    fetchLogo();
  }, [ownerId]);

  useEffect(() => {
    const generateQRWithLogo = async () => {
      if (!saleId) return;
      
      const invoiceUrl = `${window.location.origin}/invoice?edit=${saleId}`;
      
      try {
        // Generate QR code with high error correction for logo overlay
        const qrDataUrl = await QRCode.toDataURL(invoiceUrl, {
          width: size * 3, // Higher resolution for better quality
          margin: 1,
          errorCorrectionLevel: "H", // High error correction to allow logo overlay
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });

        if (!logoUrl) {
          setQrDataUrl(qrDataUrl);
          return;
        }

        // Create canvas to overlay logo
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setQrDataUrl(qrDataUrl);
          return;
        }

        const qrImage = new Image();
        qrImage.crossOrigin = "anonymous";
        
        qrImage.onload = () => {
          canvas.width = qrImage.width;
          canvas.height = qrImage.height;
          
          // Draw QR code
          ctx.drawImage(qrImage, 0, 0);
          
          // Load and draw logo
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          
          logo.onload = () => {
            // Logo size is 25% of QR code
            const logoSize = qrImage.width * 0.25;
            const logoX = (qrImage.width - logoSize) / 2;
            const logoY = (qrImage.height - logoSize) / 2;
            
            // Draw white background for logo
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8);
            
            // Draw logo
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
            
            setQrDataUrl(canvas.toDataURL("image/png"));
          };
          
          logo.onerror = () => {
            // If logo fails to load, use QR without logo
            setQrDataUrl(qrDataUrl);
          };
          
          logo.src = logoUrl;
        };
        
        qrImage.src = qrDataUrl;
      } catch (error) {
        console.error("Error generating invoice QR code:", error);
      }
    };

    generateQRWithLogo();
  }, [saleId, size, logoUrl]);

  if (!qrDataUrl) return null;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img src={qrDataUrl} alt={`QR Code for ${invoiceNumber}`} style={{ width: size, height: size }} />
      <p className="text-[8px] text-center mt-0.5">Scan to view invoice</p>
    </div>
  );
};

export default InvoiceQRCode;
