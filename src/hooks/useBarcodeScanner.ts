 import { useEffect, useRef, useCallback } from "react";
 
 interface UseBarcodeSccannerOptions {
  onProductScanRef: React.MutableRefObject<((code: string) => void) | null>;
  onInvoiceScanRef: React.MutableRefObject<((saleId: string) => void) | null>;
   enabled?: boolean;
 }
 
 /**
  * Custom hook to capture input from physical USB/Bluetooth barcode scanners.
  * Barcode scanners act as HID keyboards - they "type" the scanned data very fast
  * followed by an Enter key press.
  */
 export const useBarcodeScanner = ({
  onProductScanRef,
  onInvoiceScanRef,
   enabled = true,
 }: UseBarcodeSccannerOptions) => {
   const bufferRef = useRef<string>("");
   const lastKeyTimeRef = useRef<number>(0);
   const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
   // Scanner detection threshold - scanners type very fast (< 50ms between keys)
   const SCANNER_SPEED_THRESHOLD = 100; // ms between keystrokes
   const BUFFER_TIMEOUT = 150; // ms to wait before processing buffer
   const MIN_SCAN_LENGTH = 3; // minimum characters for a valid scan
 
   const processBuffer = useCallback(() => {
     const scannedData = bufferRef.current.trim();
     bufferRef.current = "";
 
     if (scannedData.length < MIN_SCAN_LENGTH) {
       return;
     }
 
     console.log("[BARCODE SCANNER] Scanned data:", scannedData);
 
     // Check if it's an invoice scan (contains invoice URL pattern or sale ID format)
     if (scannedData.includes("/invoice?edit=") || scannedData.includes("edit=")) {
       // Extract sale ID from URL
       let saleId = scannedData;
       
       if (scannedData.includes("/invoice?edit=")) {
         try {
           const url = new URL(scannedData);
           saleId = url.searchParams.get("edit") || "";
         } catch {
           const match = scannedData.match(/edit=([a-zA-Z0-9-]+)/);
           if (match) saleId = match[1];
         }
       } else if (scannedData.includes("edit=")) {
         const match = scannedData.match(/edit=([a-zA-Z0-9-]+)/);
         if (match) saleId = match[1];
       }
 
      if (saleId && onInvoiceScanRef.current) {
         console.log("[BARCODE SCANNER] Invoice scan detected, sale ID:", saleId);
        onInvoiceScanRef.current(saleId);
       }
     } else {
       // It's a product scan (SKU or product ID)
      if (onProductScanRef.current) {
         console.log("[BARCODE SCANNER] Product scan detected:", scannedData);
        onProductScanRef.current(scannedData);
       }
     }
  }, [onProductScanRef, onInvoiceScanRef]);
 
   useEffect(() => {
     if (!enabled) return;
 
     const handleKeyDown = (event: KeyboardEvent) => {
       const now = Date.now();
       const timeSinceLastKey = now - lastKeyTimeRef.current;
       lastKeyTimeRef.current = now;
 
       // Ignore if typing in an input field (user is manually typing)
       const target = event.target as HTMLElement;
       const isInputField = 
         target.tagName === "INPUT" || 
         target.tagName === "TEXTAREA" || 
         target.isContentEditable;
 
       // If slow typing in an input field, ignore (user is manually typing)
       if (isInputField && timeSinceLastKey > SCANNER_SPEED_THRESHOLD && bufferRef.current.length === 0) {
         return;
       }
 
       // Clear existing timeout
       if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
       }
 
       // Handle Enter key - process buffer immediately
       if (event.key === "Enter") {
         if (bufferRef.current.length >= MIN_SCAN_LENGTH) {
           event.preventDefault();
           processBuffer();
         }
         return;
       }
 
       // Only accept printable characters
       if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
         // If it's been too long since last keystroke, reset buffer
         if (timeSinceLastKey > SCANNER_SPEED_THRESHOLD * 3) {
           bufferRef.current = "";
         }
 
         bufferRef.current += event.key;
 
         // Set timeout to process buffer (in case Enter key is not sent)
         timeoutRef.current = setTimeout(processBuffer, BUFFER_TIMEOUT);
       }
     };
 
     window.addEventListener("keydown", handleKeyDown, true);
 
     return () => {
       window.removeEventListener("keydown", handleKeyDown, true);
       if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
       }
     };
   }, [enabled, processBuffer]);
 
   // Manually trigger a scan (for testing)
   const simulateScan = useCallback((data: string) => {
     bufferRef.current = data;
     processBuffer();
   }, [processBuffer]);
 
   return { simulateScan };
 };