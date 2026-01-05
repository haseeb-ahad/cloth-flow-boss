import { useState, useCallback, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScanLine, Camera, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface InvoiceQRScannerProps {
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

const InvoiceQRScanner = ({ 
  buttonText = "Scan Invoice", 
  buttonVariant = "outline" 
}: InvoiceQRScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Scanner cleanup error:", err);
      } finally {
        scannerRef.current = null;
        if (isMountedRef.current) {
          setIsScanning(false);
        }
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setError(null);
    
    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const container = document.getElementById("invoice-qr-reader");
    if (!container) {
      setError("Scanner container not found");
      return;
    }

    // Clear any existing content
    container.innerHTML = "";

    try {
      scannerRef.current = new Html5Qrcode("invoice-qr-reader");
      
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Successfully scanned - extract sale ID from URL
          let saleId = decodedText;
          
          // Check if it's a URL with edit parameter
          if (decodedText.includes("/invoice?edit=")) {
            const url = new URL(decodedText);
            saleId = url.searchParams.get("edit") || "";
          } else if (decodedText.includes("edit=")) {
            // Handle partial URL
            const match = decodedText.match(/edit=([a-zA-Z0-9-]+)/);
            if (match) {
              saleId = match[1];
            }
          }
          
          if (saleId && isMountedRef.current) {
            stopScanner();
            setIsOpen(false);
            toast.success("Invoice found! Opening...");
            navigate(`/invoice?edit=${saleId}`);
          }
        },
        () => {} // Ignore scan failures
      );
      
      if (isMountedRef.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      if (isMountedRef.current) {
        if (err.message?.includes("Permission")) {
          setError("Camera permission denied. Please allow camera access.");
        } else if (err.message?.includes("NotFound")) {
          setError("No camera found on this device.");
        } else {
          setError("Failed to start camera. Please try again.");
        }
        setIsScanning(false);
      }
    }
  }, [stopScanner, navigate]);

  const handleOpenChange = useCallback(async (open: boolean) => {
    if (!open) {
      await stopScanner();
    }
    setIsOpen(open);
    setError(null);
  }, [stopScanner]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size="sm" className="gap-2">
          <ScanLine className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan Invoice QR Code
          </DialogTitle>
          <DialogDescription>
            Scan a printed invoice's QR code to open it for viewing or editing.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div 
            id="invoice-qr-reader" 
            className="w-full min-h-[300px] bg-muted rounded-lg overflow-hidden flex items-center justify-center"
          >
            {!isScanning && !error && (
              <div className="text-center text-muted-foreground p-4">
                <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Click "Start Camera" to begin scanning</p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="text-sm text-muted-foreground text-center">
            Point your camera at the QR code on a printed invoice
          </div>
          
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="flex-1 gap-2">
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="destructive" className="flex-1 gap-2">
                <StopCircle className="h-4 w-4" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceQRScanner;
