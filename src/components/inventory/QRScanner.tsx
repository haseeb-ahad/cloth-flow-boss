import { useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScanLine, Camera, X } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onScan: (data: string) => void;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
}

const QRScanner = ({ onScan, buttonText = "Scan QR", buttonVariant = "outline" }: QRScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.log("Error stopping scanner:", err);
      }
      
      // Only clear if still mounted
      if (isMountedRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.log("Error clearing scanner:", err);
        }
      }
      scannerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  const startScanner = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Wait for DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      const element = document.getElementById("qr-reader");
      if (!element) {
        throw new Error("Scanner container not found");
      }

      // Create scanner instance
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      const qrCodeSuccessCallback = async (decodedText: string) => {
        console.log("QR Code scanned:", decodedText);
        
        // Extract product ID or SKU from URL
        let productIdentifier = decodedText;
        
        // If it's a URL, extract the last part
        if (decodedText.includes("/product/")) {
          const parts = decodedText.split("/product/");
          productIdentifier = parts[parts.length - 1];
        }
        
        // Stop scanner first, then close dialog
        await stopScanner();
        onScan(productIdentifier);
        toast.success("Product scanned successfully!");
        setIsOpen(false);
      };

      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        () => {} // Ignore scan failures (normal during scanning)
      );
    } catch (err: any) {
      console.error("Scanner error:", err);
      setIsScanning(false);
      
      if (err.toString().includes("NotAllowedError")) {
        setError("Camera access denied. Please allow camera access to scan QR codes.");
      } else if (err.toString().includes("NotFoundError")) {
        setError("No camera found. Please ensure your device has a camera.");
      } else {
        setError("Failed to start camera. Please try again.");
      }
    }
  };

  const handleOpenChange = async (open: boolean) => {
    if (!open) {
      // Stop scanner before closing dialog
      await stopScanner();
      setError(null);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className="gap-2">
          <ScanLine className="h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan Product QR Code
          </DialogTitle>
          <DialogDescription className="sr-only">
            Use your camera to scan a product QR code
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          {/* Scanner container */}
          <div 
            id="qr-reader" 
            className="w-full max-w-[300px] aspect-square bg-muted rounded-lg overflow-hidden relative"
          >
            {!isScanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Camera className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Camera preview</p>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="text-destructive text-sm text-center p-3 bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Instructions */}
          <p className="text-sm text-muted-foreground text-center">
            Point your camera at a product QR code to scan
          </p>

          {/* Control buttons */}
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanner} className="gap-2">
                <Camera className="h-4 w-4" />
                Start Camera
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="destructive" className="gap-2">
                <X className="h-4 w-4" />
                Stop Camera
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;