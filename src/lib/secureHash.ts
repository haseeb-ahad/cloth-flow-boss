/**
 * Generate SHA-256 hash for files
 * This creates a cryptographically secure hash for duplicate detection
 */

export const generateSHA256Hash = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        
        // Use Web Crypto API for SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        
        // Convert to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        resolve(hashHex);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Validate transaction ID format
 * Ensures the transaction ID follows expected patterns
 */
export const validateTransactionId = (transactionId: string): { valid: boolean; message?: string } => {
  const trimmed = transactionId.trim();
  
  if (!trimmed) {
    return { valid: false, message: "Transaction ID is required" };
  }
  
  if (trimmed.length < 5) {
    return { valid: false, message: "Transaction ID must be at least 5 characters" };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, message: "Transaction ID must be less than 50 characters" };
  }
  
  // Allow alphanumeric, dashes, and underscores
  const validPattern = /^[A-Za-z0-9\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, message: "Transaction ID can only contain letters, numbers, dashes, and underscores" };
  }
  
  return { valid: true };
};
