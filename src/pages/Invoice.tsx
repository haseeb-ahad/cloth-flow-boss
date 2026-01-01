import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, Printer, Check, ChevronsUpDown, ArrowLeft, CheckCircle, Store, Upload, X, RotateCcw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import AnimatedTick from "@/components/AnimatedTick";
import ItemStatusIcon from "@/components/ItemStatusIcon";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import PrintInvoice from "@/components/PrintInvoice";
import AnimatedLogoLoader from "@/components/AnimatedLogoLoader";

// DEBUG FLAG - Set to false after confirming fix
const DEBUG_MODE = true;
const debugLog = (...args: any[]) => {
  if (DEBUG_MODE) {
    console.log(`[INVOICE-DEBUG ${new Date().toISOString()}]`, ...args);
  }
};

interface Product {
  id: string;
  name: string;
  selling_price: number;
  purchase_price: number;
  stock_quantity: number;
  quantity_type: string;
  category: string | null;
}

interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_price: number;
  total_price: number;
  quantity_type: string;
  is_return: boolean;
}

const Invoice = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ownerId, hasPermission, userRole } = useAuth();
  const { timezone, formatDateInput } = useTimezone();
  const editSaleId = searchParams.get("edit");
  
  // Permission checks
  const canCreate = userRole === "admin" || hasPermission("invoice", "create");
  const canEdit = userRole === "admin" || hasPermission("invoice", "edit");
  const canDelete = userRole === "admin" || hasPermission("invoice", "delete");
  
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [openProductIndex, setOpenProductIndex] = useState<number | null>(null);
  const [customerSuggestions, setCustomerSuggestions] = useState<{name: string, phone: string | null}[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [originalItems, setOriginalItems] = useState<InvoiceItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [additionalPayment, setAdditionalPayment] = useState("");
  const [isFullPayment, setIsFullPayment] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: number]: {product: boolean, quantity: boolean, price: boolean}}>({});
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [receiptSettings, setReceiptSettings] = useState<{
    logo_url?: string | null;
    shop_name?: string;
    shop_address?: string;
    phone_numbers?: string[];
    owner_names?: string[];
    thank_you_message?: string;
    footer_message?: string;
    worker_name?: string;
    worker_phone?: string;
  }>({});
  
  // Return dialog state
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnItemIndex, setReturnItemIndex] = useState<number | null>(null);
  const [returnQuantity, setReturnQuantity] = useState("");
  
  // Refs for auto-focus
  const quantityInputRefs = useRef<{[key: number]: HTMLInputElement | null}>({});
  const printRef = useRef<HTMLDivElement>(null);

  // CRITICAL PROTECTION: Prevent double saves and race conditions
  const saveInProgressRef = useRef(false);
  const itemsBeforeSaveRef = useRef<InvoiceItem[]>([]);
  const hasLoadedRef = useRef(false);

  // Fetch receipt settings from app_settings
  const fetchReceiptSettings = async () => {
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("logo_url, shop_name, shop_address, phone_numbers, owner_names, thank_you_message, footer_message, worker_name, worker_phone")
        .single();
      
      if (data) {
        setReceiptSettings({
          logo_url: data.logo_url,
          shop_name: data.shop_name,
          shop_address: data.shop_address,
          phone_numbers: data.phone_numbers,
          owner_names: (data as any).owner_names,
          thank_you_message: data.thank_you_message,
          footer_message: data.footer_message,
          worker_name: (data as any).worker_name || "",
          worker_phone: (data as any).worker_phone || "",
        });
      }
    } catch (error) {
      console.error("Error fetching receipt settings:", error);
    }
  };

  // Set initial invoice date based on timezone (for new invoices)
  useEffect(() => {
    if (!editSaleId && invoiceDate === "") {
      setInvoiceDate(formatDateInput(new Date()));
    }
  }, [editSaleId, formatDateInput, invoiceDate]);

  // STABLE LOADING: Only load once, prevent re-renders from resetting items
  useEffect(() => {
    if (hasLoadedRef.current) {
      debugLog("⚠️ Blocked duplicate load attempt");
      return;
    }
    
    const loadData = async () => {
      debugLog("🔵 Starting initial data load");
      setIsLoading(true);
      hasLoadedRef.current = true;
      
      await Promise.all([fetchProducts(), fetchCustomerNames(), fetchReceiptSettings()]);
      if (editSaleId) {
        await loadSaleData(editSaleId);
      }
      setIsLoading(false);
      debugLog("✅ Initial data load complete");
    };
    loadData();
  }, [editSaleId]);

  const fetchCustomerNames = async () => {
    const { data: salesData } = await supabase.from("sales").select("customer_name, customer_phone").not("customer_name", "is", null);
    const { data: creditsData } = await supabase.from("credits").select("customer_name, customer_phone");
    
    const customerMap = new Map<string, string | null>();
    salesData?.forEach(s => {
      if (s.customer_name && !customerMap.has(s.customer_name)) {
        customerMap.set(s.customer_name, s.customer_phone);
      }
    });
    creditsData?.forEach(c => {
      if (c.customer_name && !customerMap.has(c.customer_name)) {
        customerMap.set(c.customer_name, c.customer_phone);
      }
    });
    
    const customers = Array.from(customerMap.entries()).map(([name, phone]) => ({ name, phone }));
    setCustomerSuggestions(customers);
  };

  const handleCustomerNameChange = (value: string) => {
    setCustomerName(value);
    setShowCustomerSuggestions(value.length > 0);
  };

  const getFilteredCustomers = () => {
    if (!customerName) return [];
    return customerSuggestions.filter(customer => 
      customer.name.toLowerCase().includes(customerName.toLowerCase())
    ).slice(0, 5);
  };

  const loadSaleData = async (saleId: string) => {
    try {
      setIsLoadingItems(true);
      const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", saleId).single();
      const { data: saleItems, error: itemsError } = await supabase.from("sale_items").select("*").eq("sale_id", saleId);

      if (saleError) {
        console.error("Error loading sale:", saleError);
        toast.error("Failed to load sale data");
        return;
      }

      if (itemsError) {
        console.error("Error loading sale items:", itemsError);
        toast.error("Failed to load sale items");
        return;
      }

      if (sale) {
        // CRITICAL: Check if sale has items
        if (!saleItems || saleItems.length === 0) {
          toast.error("WARNING: This sale has no items! Cannot edit safely.");
          console.error("Sale has no items:", sale.invoice_number);
          return;
        }
        setInvoiceNumber(sale.invoice_number);
        setCustomerName(sale.customer_name || "");
        setCustomerPhone(sale.customer_phone || "");
        setDiscount(sale.discount || 0);
        setPaymentMethod(sale.payment_method || "cash");
        setPaidAmount(sale.paid_amount?.toString() || "");
        setIsFullPayment(sale.payment_status === "paid");
        setDescription(sale.description || "");
        if (sale.image_url) {
          setImagePreview(sale.image_url);
        }
        
        // Extract date from created_at timestamp and format as YYYY-MM-DD
        if (sale.created_at) {
          setInvoiceDate(formatDateInput(new Date(sale.created_at)));
        } else {
          setInvoiceDate(formatDateInput(new Date()));
        }

        // Fetch product details to get correct quantity_type
        const productIds = saleItems.map(item => item.product_id);
        const { data: productsData } = await supabase
          .from("products")
          .select("id, quantity_type")
          .in("id", productIds);

        const loadedItems = saleItems.map(item => {
          const product = productsData?.find(p => p.id === item.product_id);
          return {
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            purchase_price: item.purchase_price,
            total_price: item.total_price,
            quantity_type: product?.quantity_type || "Unit",
            is_return: (item as any).is_return || false,
          };
        });
        
        debugLog(`📦 Loaded ${loadedItems.length} items for editing:`, JSON.stringify(loadedItems.map(i => i.product_name)));
        
        // CRITICAL: Lock items to prevent any auto-modification
        setItems(loadedItems);
        setOriginalItems(loadedItems.map(item => ({...item})));
        
        debugLog(`✅ Items locked in state: ${loadedItems.length} items`);
      }
    } catch (error) {
      toast.error("Failed to load sale data");
    } finally {
      setIsLoadingItems(false);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*");
    if (data) setProducts(data);
  };

  // Check if an item is complete (all required fields filled)
  const isItemComplete = (item: InvoiceItem): boolean => {
    return item.product_id !== "" && 
           item.product_name !== "" && 
           item.quantity > 0 && 
           item.unit_price > 0;
  };

  // Validate last item and show errors
  const validateLastItem = (): boolean => {
    if (items.length === 0) return true;
    
    const lastIndex = items.length - 1;
    const lastItem = items[lastIndex];
    
    const errors = {
      product: !lastItem.product_id || !lastItem.product_name,
      quantity: lastItem.quantity <= 0,
      price: lastItem.unit_price <= 0
    };
    
    const hasErrors = errors.product || errors.quantity || errors.price;
    
    if (hasErrors) {
      setValidationErrors(prev => ({...prev, [lastIndex]: errors}));
      toast.error("Please complete the current item before adding a new one");
      return false;
    }
    
    // Clear errors for this item if all valid
    setValidationErrors(prev => {
      const newErrors = {...prev};
      delete newErrors[lastIndex];
      return newErrors;
    });
    
    return true;
  };

  const addItem = () => {
    debugLog("➕ USER ACTION: Adding new item");
    
    // Validate last item before adding new one
    if (!validateLastItem()) {
      debugLog("⚠️ Cannot add item - last item incomplete");
      return;
    }
    
    const newItem: InvoiceItem = {
      product_id: "",
      product_name: "",
      quantity: 0,
      unit_price: 0,
      purchase_price: 0,
      total_price: 0,
      quantity_type: "Unit",
      is_return: false,
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    debugLog(`📦 Items count after add: ${newItems.length}`);
  };

  const removeItem = (index: number) => {
    debugLog(`🗑️ USER ACTION: Removing item at index ${index}`);
    
    const itemToRemove = items[index];
    
    // CRITICAL PROTECTION: Prevent removing last item in edit mode
    if (editSaleId && items.length === 1) {
      toast.error("Cannot remove the last item! An invoice must have at least one product.");
      debugLog("⚠️ Blocked removal of last item in edit mode");
      return;
    }
    
    // Warn user before removing last item in create mode
    if (!editSaleId && items.length === 1) {
      if (!confirm("This will remove the last item. Continue?")) {
        debugLog("⚠️ User cancelled removal of last item");
        return;
      }
    }
    
    // If removing a return item, restore qty to original item
    if (itemToRemove.is_return) {
      const newItems = [...items];
      
      // Find the original item for this return
      const originalIndex = newItems.findIndex(i => 
        !i.is_return && 
        i.product_id === itemToRemove.product_id
      );
      
      if (originalIndex !== -1) {
        // Restore the return qty back to original item
        const originalItem = newItems[originalIndex];
        const restoredQty = originalItem.quantity + itemToRemove.quantity;
        newItems[originalIndex] = {
          ...originalItem,
          quantity: restoredQty,
          total_price: originalItem.unit_price * restoredQty,
        };
        debugLog(`♻️ Restored ${itemToRemove.quantity} to original item. New qty: ${restoredQty}`);
      }
      
      // Remove the return item
      const filteredItems = newItems.filter((_, i) => i !== index);
      setItems(filteredItems);
      toast.success("Return removed and quantity restored to original item.");
      return;
    }
    
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    debugLog(`📦 Items count after remove: ${newItems.length}`, newItems.map(i => i.product_name));
  };

  // Check if item is complete and auto-add new item
  const checkAndAutoAddItem = (currentItems: InvoiceItem[], index: number) => {
    const item = currentItems[index];
    if (item && isItemComplete(item) && index === currentItems.length - 1) {
      // Auto-add new item when last item is complete
      debugLog("✨ Auto-adding new item - current item complete");
      const newItem: InvoiceItem = {
        product_id: "",
        product_name: "",
        quantity: 0,
        unit_price: 0,
        purchase_price: 0,
        total_price: 0,
        quantity_type: "Unit",
        is_return: false,
      };
      setItems([...currentItems, newItem]);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    debugLog(`✏️ USER ACTION: Updating item ${index}, field: ${field}, value: ${value}`);
    
    const newItems = [...items];
    if (field === "product_id") {
      const product = products.find(p => p.id === value);
      if (product) {
        // Check if same product already exists (by product_id)
        const duplicateProduct = items.find((item, idx) => 
          idx !== index && 
          item.product_id === product.id
        );

        if (duplicateProduct) {
          toast.error(`${product.name} is already added to this invoice`, {
            duration: 3000,
            className: "animate-shake",
          });
          return;
        }

        newItems[index] = {
          ...newItems[index],
          product_id: value,
          product_name: product.name,
          unit_price: product.selling_price,
          purchase_price: product.purchase_price,
          quantity_type: product.quantity_type || "Unit",
          total_price: product.selling_price * newItems[index].quantity,
        };
        
        setItems(newItems);
        
        // Auto-focus to quantity input after product selection
        setTimeout(() => {
          const quantityInput = quantityInputRefs.current[index];
          if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();
          }
        }, 100);
        return;
      }
    } else if (field === "quantity") {
      const enteredQuantity = parseFloat(value) || 0;
      const currentItem = newItems[index];
      
      if (currentItem.is_return) {
        // Find the corresponding main product item
        const mainItemIndex = newItems.findIndex(i => 
          !i.is_return && i.product_id === currentItem.product_id
        );
        
        if (mainItemIndex === -1) {
          toast.error("Original product not found for this return");
          return;
        }
        
        const mainItem = newItems[mainItemIndex];
        // Calculate original invoice qty = current main qty + current return qty
        const originalInvoiceQty = mainItem.quantity + currentItem.quantity;
        
        // Validate: return qty cannot exceed original invoice qty
        if (enteredQuantity > originalInvoiceQty) {
          toast.error(`Return quantity cannot exceed original invoice quantity (${originalInvoiceQty})`);
          return;
        }
        
        if (enteredQuantity < 0) {
          toast.error("Return quantity cannot be negative");
          return;
        }
        
        // Update return item qty
        newItems[index].quantity = enteredQuantity;
        newItems[index].total_price = newItems[index].unit_price * enteredQuantity;
        
        // Update main product qty = original invoice qty - return qty
        const newMainQty = originalInvoiceQty - enteredQuantity;
        newItems[mainItemIndex] = {
          ...mainItem,
          quantity: newMainQty,
          total_price: mainItem.unit_price * newMainQty,
        };
        
        debugLog(`♻️ Return qty changed to ${enteredQuantity}. Main item qty updated to ${newMainQty}`);
      } else {
        // For regular items, check stock availability
        const product = products.find(p => p.id === currentItem.product_id);
        
        if (product && enteredQuantity > product.stock_quantity) {
          toast.error(`Available stock is only ${product.stock_quantity} ${product.quantity_type || "Unit"}`);
          return;
        }
        
        newItems[index].quantity = enteredQuantity;
        newItems[index].total_price = newItems[index].unit_price * enteredQuantity;
      }
    } else if (field === "unit_price") {
      const enteredUnitPrice = parseFloat(value) || 0;
      
      // Check for exact duplicate when unit price is manually changed
      const exactDuplicate = items.find((item, idx) => 
        idx !== index && 
        item.product_name === newItems[index].product_name && 
        item.purchase_price === newItems[index].purchase_price && 
        item.unit_price === enteredUnitPrice
      );

      if (exactDuplicate) {
        toast.error(`${newItems[index].product_name} with same prices is already added`, {
          duration: 3000,
          className: "animate-shake",
        });
        return;
      }

      newItems[index].unit_price = enteredUnitPrice;
      newItems[index].total_price = newItems[index].unit_price * newItems[index].quantity;
    } else if (field === "total_price") {
      const enteredTotal = parseFloat(value) || 0;
      newItems[index].total_price = enteredTotal;
      
      // Auto-calculate unit price: Price = Total / Quantity
      // If total is empty/zero, restore original product price
      if (enteredTotal > 0 && newItems[index].quantity > 0) {
        const calculatedUnitPrice = enteredTotal / newItems[index].quantity;
        newItems[index].unit_price = Math.round(calculatedUnitPrice * 100) / 100;
      } else if (enteredTotal === 0) {
        // Restore original selling price from product
        const product = products.find(p => p.id === newItems[index].product_id);
        if (product) {
          newItems[index].unit_price = product.selling_price;
        }
      }
    }
    setItems(newItems);
    
    // Check if item is complete and auto-add new item
    checkAndAutoAddItem(newItems, index);
  };

  // Calculate subtotal (only non-return items)
  const calculateSubtotal = () => {
    return items.filter(item => !item.is_return).reduce((sum, item) => sum + item.total_price, 0);
  };

  // Calculate total return amount (negative)
  const calculateReturnAmount = () => {
    return items.filter(item => item.is_return).reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateTotal = () => {
    // Since we reduce original qty when return is added, just use subtotal
    // Return items are for display/tracking only, not for calculation
    return calculateSubtotal();
  };

  const calculateFinalAmount = () => {
    return calculateTotal() - discount;
  };

  const calculateTotalCost = () => {
    return items.filter(item => !item.is_return).reduce((sum, item) => sum + (item.purchase_price * item.quantity), 0);
  };

  const calculateTotalProfit = () => {
    // Profit is calculated from non-return items only (since original qty is already reduced)
    return items.filter(item => !item.is_return).reduce((sum, item) => sum + ((item.unit_price - item.purchase_price) * item.quantity), 0);
  };

  const calculateChange = () => {
    if (!paidAmount) return 0;
    const paid = parseFloat(paidAmount);
    const final = calculateFinalAmount();
    return paid > final ? paid - final : 0;
  };

  // Open return dialog
  const openReturnDialog = (index: number) => {
    setReturnItemIndex(index);
    setReturnQuantity("");
    setReturnDialogOpen(true);
  };

  // Handle return confirmation
  const handleReturnConfirm = () => {
    if (returnItemIndex === null) return;
    
    const originalItem = items[returnItemIndex];
    const qty = parseFloat(returnQuantity);
    
    // Validation
    if (!returnQuantity || qty <= 0) {
      toast.error("Please enter a valid return quantity");
      return;
    }
    
    if (qty > originalItem.quantity) {
      toast.error(`Return quantity cannot exceed sold quantity (${originalItem.quantity})`);
      return;
    }

    // Create a return item with same product details (for tracking/display)
    const returnItem: InvoiceItem = {
      product_id: originalItem.product_id,
      product_name: originalItem.product_name,
      quantity: qty,
      unit_price: originalItem.unit_price,
      purchase_price: originalItem.purchase_price,
      total_price: originalItem.unit_price * qty,
      quantity_type: originalItem.quantity_type,
      is_return: true,
    };
    
    // Update items: reduce original quantity AND add return item
    const newItems = [...items];
    
    // Reduce original item's quantity
    const newOriginalQty = originalItem.quantity - qty;
    newItems[returnItemIndex] = {
      ...originalItem,
      quantity: newOriginalQty,
      total_price: originalItem.unit_price * newOriginalQty,
    };
    
    // Insert return item right after the original (for tracking)
    newItems.splice(returnItemIndex + 1, 0, returnItem);
    setItems(newItems);
    
    setReturnDialogOpen(false);
    setReturnItemIndex(null);
    setReturnQuantity("");
    
    toast.success(`Return of ${qty} ${originalItem.quantity_type} processed. Original qty reduced to ${newOriginalQty}.`);
  };

  // Get max return quantity for an item (current qty since original is already reduced by previous returns)
  const getMaxReturnQuantity = (index: number) => {
    const item = items[index];
    if (!item || item.is_return) return 0;
    
    // Since original quantity is reduced when return is made,
    // max returnable is simply the current quantity
    return item.quantity;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagePreview; // Return existing image URL if no new file
    
    setIsUploadingImage(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `invoice_${Date.now()}.${fileExt}`;
      const filePath = `${ownerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-images")
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("payment-images").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveInvoice = async () => {
    debugLog("💾 SAVE INITIATED");
    
    // PERMISSION CHECK: Block save if user lacks permission
    if (editSaleId && !canEdit) {
      toast.error("You do not have permission to edit invoices.");
      debugLog("⛔ BLOCKED: No edit permission");
      return;
    }
    if (!editSaleId && !canCreate) {
      toast.error("You do not have permission to create invoices.");
      debugLog("⛔ BLOCKED: No create permission");
      return;
    }
    
    // PREVENT DOUBLE SAVES - Critical protection
    if (saveInProgressRef.current) {
      debugLog("⛔ BLOCKED: Save already in progress");
      toast.error("Save in progress, please wait...");
      return;
    }

    // CRITICAL VALIDATION: Ensure items exist
    if (items.length === 0) {
      toast.error("Cannot save invoice without items! Please add at least one product.");
      debugLog("⛔ BLOCKED: No items to save");
      return;
    }

    // CRITICAL VALIDATION: Check for incomplete items
    const incompleteItems = items.filter(item => !isItemComplete(item));
    if (incompleteItems.length > 0) {
      // Mark all incomplete items with validation errors
      const newErrors: {[key: number]: {product: boolean, quantity: boolean, price: boolean}} = {};
      items.forEach((item, index) => {
        if (!isItemComplete(item)) {
          newErrors[index] = {
            product: !item.product_id || !item.product_name,
            quantity: !item.quantity || item.quantity <= 0,
            price: !item.unit_price || item.unit_price <= 0,
          };
        }
      });
      setValidationErrors(newErrors);
      
      toast.error(`${incompleteItems.length} incomplete item(s) found! Please complete or delete them before saving.`, {
        duration: 4000,
        className: "animate-shake",
      });
      debugLog(`⛔ BLOCKED: ${incompleteItems.length} incomplete items found`);
      return;
    }

    // Additional validation for edit mode
    if (editSaleId && originalItems.length === 0) {
      toast.error("CRITICAL ERROR: Original items not loaded. Cannot safely update. Please reload the page.");
      debugLog("⛔ BLOCKED: Original items not loaded in edit mode");
      return;
    }

    // LOCK ITEMS BEFORE SAVE - Take snapshot
    itemsBeforeSaveRef.current = JSON.parse(JSON.stringify(items));
    debugLog(`🔒 LOCKED ${itemsBeforeSaveRef.current.length} items before save:`, 
      itemsBeforeSaveRef.current.map(i => i.product_name));

    const confirmMessage = editSaleId 
      ? `Update sale with ${items.length} items?\n\nOriginal items: ${originalItems.length}\nNew items: ${items.length}` 
      : `Create invoice with ${items.length} items?`;
    
    if (!confirm(confirmMessage)) {
      debugLog("⚠️ Save cancelled by user");
      return;
    }

    saveInProgressRef.current = true;
    setIsSaving(true);
    
    try {
      if (editSaleId) {
        await updateSale();
      } else {
        await createSale();
      }
      
      // VALIDATE: Items should match what we started with
      if (items.length !== itemsBeforeSaveRef.current.length) {
        debugLog(`⚠️ WARNING: Items count changed during save! Before: ${itemsBeforeSaveRef.current.length}, After: ${items.length}`);
        toast.error("WARNING: Item count changed during save. Please verify your invoice.");
      } else {
        debugLog("✅ SAVE COMPLETE: Items count verified");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save invoice");
      debugLog("❌ Save failed:", error);
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  };

  const createSale = async () => {
    debugLog("🆕 CREATE SALE: Starting");
    
    // Use locked items snapshot for absolute safety
    const safeItems = itemsBeforeSaveRef.current.length > 0 
      ? itemsBeforeSaveRef.current 
      : items;
    
    debugLog(`📦 Creating invoice with ${safeItems.length} items (locked snapshot)`);
    
    const newInvoiceNumber = `INV-${Date.now()}`;
    const totalAmount = calculateTotal();
    const finalAmount = calculateFinalAmount();
    const paid = paidAmount ? parseFloat(paidAmount) : finalAmount;

    // Use selected invoice date with current time preserved
    const now = new Date();
    let invoiceDateISO: string;
    if (invoiceDate) {
      // User selected a specific date - combine with current time
      const selectedDate = new Date(invoiceDate);
      selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
      invoiceDateISO = selectedDate.toISOString();
    } else {
      // No date selected - use current datetime
      invoiceDateISO = now.toISOString();
    }

    // Upload image if provided
    const uploadedImageUrl = await uploadImage();

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        invoice_number: newInvoiceNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        total_amount: totalAmount,
        discount: discount,
        final_amount: finalAmount,
        payment_method: paymentMethod,
        paid_amount: paid,
        payment_status: isFullPayment ? "paid" : "pending",
        created_at: invoiceDateISO,
        owner_id: ownerId,
        description: description || null,
        image_url: uploadedImageUrl || null,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    debugLog(`💾 Sale record created: ${newInvoiceNumber}`);

    // CRITICAL: Insert each item from LOCKED snapshot
    for (let i = 0; i < safeItems.length; i++) {
      const item = safeItems[i];
      const profit = (item.unit_price - item.purchase_price) * item.quantity;
      
      debugLog(`📝 Inserting item ${i + 1}/${safeItems.length}: ${item.product_name}`);
      
      // Step 1: Insert the sale item
      const { error: itemInsertError } = await supabase.from("sale_items").insert({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        purchase_price: item.purchase_price,
        total_price: item.total_price,
        profit: profit,
        is_return: item.is_return || false,
      });

      if (itemInsertError) {
        debugLog(`❌ Error inserting item ${i + 1}/${safeItems.length}:`, itemInsertError);
        toast.error(`Failed to add item: ${item.product_name}`);
        throw itemInsertError;
      }

      debugLog(`✅ Item ${i + 1}/${safeItems.length} inserted: ${item.product_name}`);

      // SKIP inventory for return items - they are just for tracking
      // The main item's reduced quantity already accounts for the return
      if (item.is_return) {
        debugLog(`⏭️ Skipping inventory update for return item: ${item.product_name} (tracking only)`);
        continue;
      }

      // Step 2: Fetch current stock from database (not from state)
      const { data: product, error: fetchError } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", item.product_id)
        .single();

      if (fetchError || !product) {
        console.error("Error fetching product stock:", fetchError);
        toast.error(`Failed to update inventory for ${item.product_name}`);
        throw fetchError || new Error("Product not found");
      }

      // Step 3: Deduct stock for regular items only
      const newStock = product.stock_quantity - item.quantity;
      
      if (newStock < 0) {
        toast.error(`Insufficient stock for ${item.product_name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
        throw new Error("Insufficient stock");
      }
      console.log(`Reducing stock for ${item.product_name}: ${product.stock_quantity} - ${item.quantity} = ${newStock}`);

      // Step 4: Update inventory
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock_quantity: newStock })
        .eq("id", item.product_id);

      if (updateError) {
        console.error("Error updating inventory:", updateError);
        toast.error(`Failed to update inventory for ${item.product_name}`);
        throw updateError;
      }

      debugLog(`✅ Inventory updated for ${item.product_name}`);
    }

    debugLog(`✅ ALL ${safeItems.length} ITEMS SAVED AND INVENTORY UPDATED`);

    if (paid < finalAmount) {
      const creditAmount = finalAmount - paid;
      await supabase.from("credits").insert({
        sale_id: sale.id,
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone || null,
        amount: creditAmount,
        paid_amount: 0,
        remaining_amount: creditAmount,
        status: "pending",
        notes: `Partial payment for invoice ${newInvoiceNumber}`,
        created_at: invoiceDateISO,
        owner_id: ownerId,
      });
    }

    toast.success("Invoice created successfully!");
    printInvoice(newInvoiceNumber);
    resetForm();
  };

  const updateSale = async () => {
    debugLog("🔄 UPDATE SALE: Starting");
    
    // Use locked items snapshot
    const safeItems = itemsBeforeSaveRef.current.length > 0 
      ? itemsBeforeSaveRef.current 
      : items;
    
    debugLog(`📦 Updating with ${safeItems.length} items (locked snapshot)`);
    
    try {
      // CRITICAL VALIDATION: Prevent data loss
      if (safeItems.length === 0) {
        toast.error("Cannot save invoice without items! Please add products before saving.");
        debugLog("⛔ BLOCKED: No items to update");
        return;
      }

      // Validate that we have original items to compare against
      if (originalItems.length === 0) {
        toast.error("Cannot update sale - original items not loaded. Please reload the page.");
        debugLog("⛔ BLOCKED: Original items not loaded");
        return;
      }

      const totalAmount = calculateTotal();
      const finalAmount = calculateFinalAmount();
      let paid = paidAmount ? parseFloat(paidAmount) : finalAmount;
      
      // Add additional payment if provided
      if (additionalPayment && parseFloat(additionalPayment) > 0) {
        paid += parseFloat(additionalPayment);
      }

      // Step 1: Reverse stock changes for original items (ONLY regular items, skip returns)
      // Return items are tracking-only and never affected inventory
      debugLog("♻️ Reversing stock for original items:", originalItems.filter(i => !i.is_return).map(i => i.product_name));
      for (const originalItem of originalItems) {
        // SKIP return items - they never affected inventory
        if (originalItem.is_return) {
          debugLog(`⏭️ Skipping reversal for return item: ${originalItem.product_name} (tracking only)`);
          continue;
        }

        const { data: product, error: fetchError } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", originalItem.product_id)
          .single();

        if (fetchError) {
          console.error("Error fetching product for restoration:", fetchError);
          toast.error(`Failed to restore stock for ${originalItem.product_name}`);
          throw fetchError;
        }

        if (!product) {
          toast.error(`Product not found: ${originalItem.product_name}`);
          throw new Error("Product not found");
        }

        // Regular items were DEDUCTED from stock, so we ADD back
        const restoredStock = product.stock_quantity + originalItem.quantity;
        console.log(`Reversing deduction for ${originalItem.product_name}: ${product.stock_quantity} + ${originalItem.quantity} = ${restoredStock}`);

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: restoredStock })
          .eq("id", originalItem.product_id);
        
        if (updateError) {
          console.error("Error restoring stock:", updateError);
          toast.error(`Failed to restore stock for ${originalItem.product_name}`);
          throw updateError;
        }
      }

      // Step 2: Update sale record with accurate data
      // NOTE: We do NOT update created_at to preserve the original invoice date/time
      
      // Upload image if provided
      const uploadedImageUrl = await uploadImage();

      const { error: saleError } = await supabase.from("sales").update({
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        total_amount: totalAmount,
        discount: discount,
        final_amount: finalAmount,
        payment_method: paymentMethod,
        paid_amount: paid,
        status: paid >= finalAmount ? "completed" : "pending",
        payment_status: isFullPayment ? "paid" : "pending",
        description: description || null,
        image_url: uploadedImageUrl || null,
      }).eq("id", editSaleId);

      if (saleError) {
        console.error("Error updating sale:", saleError);
        toast.error("Failed to update sale record");
        throw saleError;
      }

      // Step 3: CRITICAL - Only delete old items if we have new items to insert
      // This prevents accidental data loss
      if (safeItems.length === 0) {
        toast.error("CRITICAL: Cannot delete items without replacements. Operation aborted.");
        debugLog("⛔ BLOCKED: Attempted to delete without replacements");
        throw new Error("Cannot delete items - no replacement items available");
      }
      
      debugLog(`🗑️ Deleting old items and replacing with ${safeItems.length} new items`);
      const { error: deleteError } = await supabase.from("sale_items").delete().eq("sale_id", editSaleId);
      if (deleteError) {
        debugLog("❌ Error deleting old sale items:", deleteError);
        toast.error("Failed to update sale items");
        throw deleteError;
      }

      // Step 4: Insert new sale items from LOCKED snapshot and deduct stock
      debugLog(`📝 Inserting ${safeItems.length} new items for updated invoice`);
      for (let i = 0; i < safeItems.length; i++) {
        const item = safeItems[i];
        const profit = (item.unit_price - item.purchase_price) * item.quantity;
        
        const { error: insertError } = await supabase.from("sale_items").insert({
          sale_id: editSaleId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          purchase_price: item.purchase_price,
          total_price: item.total_price,
          profit: profit,
          is_return: item.is_return || false,
        });

        if (insertError) {
          debugLog(`❌ Error inserting item ${i + 1}/${safeItems.length}:`, insertError);
          toast.error(`Failed to add ${item.product_name} to sale`);
          throw insertError;
        }

        debugLog(`✅ Item ${i + 1}/${safeItems.length} inserted: ${item.product_name}`);

        // SKIP inventory for return items - they are just for tracking
        // The main item's reduced quantity already accounts for the return
        if (item.is_return) {
          debugLog(`⏭️ Skipping inventory update for return item: ${item.product_name} (tracking only)`);
          continue;
        }

        // Deduct stock for regular items only
        const { data: product, error: fetchError } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();

        if (fetchError) {
          console.error("Error fetching product for deduction:", fetchError);
          toast.error(`Failed to update stock for ${item.product_name}`);
          throw fetchError;
        }

        if (!product) {
          toast.error(`Product not found: ${item.product_name}`);
          throw new Error("Product not found");
        }

        // Deduct stock for regular items
        const newStock = product.stock_quantity - item.quantity;
        console.log(`Deducting ${item.product_name}: ${product.stock_quantity} - ${item.quantity} = ${newStock}`);

        if (newStock < 0) {
          toast.error(`Insufficient stock for ${item.product_name}. Available: ${product.stock_quantity}, Required: ${item.quantity}`);
          throw new Error("Insufficient stock");
        }

        const { error: updateError } = await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", item.product_id);
        
        if (updateError) {
          console.error("Error updating stock:", updateError);
          toast.error(`Failed to update stock for ${item.product_name}`);
          throw updateError;
        }

        debugLog(`✅ Inventory updated for ${item.product_name}`);
      }

      debugLog(`✅ ALL ${safeItems.length} ITEMS UPDATED AND INVENTORY SYNCED`);

      // Step 5: Handle credit updates
      const { data: existingCredit } = await supabase
        .from("credits")
        .select("*")
        .eq("sale_id", editSaleId)
        .maybeSingle();

      if (existingCredit) {
        if (paid >= finalAmount) {
          const { error: creditDeleteError } = await supabase.from("credits").delete().eq("id", existingCredit.id);
          if (creditDeleteError) {
            console.error("Error deleting credit:", creditDeleteError);
          }
        } else {
          const newCreditAmount = finalAmount - paid;
          const { error: creditUpdateError } = await supabase.from("credits").update({
            amount: newCreditAmount,
            remaining_amount: newCreditAmount,
            paid_amount: 0,
          }).eq("id", existingCredit.id);
          if (creditUpdateError) {
            console.error("Error updating credit:", creditUpdateError);
          }
        }
      } else if (paid < finalAmount) {
        const creditAmount = finalAmount - paid;
        const { error: creditInsertError } = await supabase.from("credits").insert({
          sale_id: editSaleId,
          customer_name: customerName || "Walk-in Customer",
          customer_phone: customerPhone || null,
          amount: creditAmount,
          paid_amount: 0,
          remaining_amount: creditAmount,
          status: "pending",
          notes: `Partial payment for invoice ${invoiceNumber}`,
        });
        if (creditInsertError) {
          console.error("Error creating credit:", creditInsertError);
        }
      }

      toast.success("Sale updated successfully! Inventory and credits synchronized.");
      navigate("/sales");
    } catch (error) {
      console.error("Critical error updating sale:", error);
      toast.error("Failed to update sale. Please try again or contact support.");
    }
  };

  const handleDeleteSale = async () => {
    if (!editSaleId) return;
    if (!confirm("Are you sure you want to delete this sale? This action cannot be undone.")) return;

    setIsSaving(true);
    try {
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("product_id, quantity, is_return")
        .eq("sale_id", editSaleId);

      // Reverse stock changes for regular items only (return items never affected inventory)
      if (saleItems) {
        for (const item of saleItems) {
          // SKIP return items - they never affected inventory
          if (item.is_return) {
            console.log(`Skipping return item on delete (tracking only)`);
            continue;
          }

          const { data: product } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.product_id)
            .maybeSingle();

          if (product) {
            // Regular items were DEDUCTED, so ADD back
            const newStock = product.stock_quantity + item.quantity;
            console.log(`Reversing deduction on delete: ${product.stock_quantity} + ${item.quantity} = ${newStock}`);
            
            await supabase
              .from("products")
              .update({ stock_quantity: newStock })
              .eq("id", item.product_id);
          }
        }
        await supabase.from("sale_items").delete().eq("sale_id", editSaleId);
      }

      // Delete associated credit if it exists
      const { data: associatedCredit } = await supabase
        .from("credits")
        .select("*")
        .ilike("notes", `%${invoiceNumber}%`)
        .eq("customer_name", customerName || "Walk-in Customer")
        .maybeSingle();

      if (associatedCredit) {
        await supabase.from("credits").delete().eq("id", associatedCredit.id);
      }

      await supabase.from("sales").delete().eq("id", editSaleId);
      toast.success("Sale deleted successfully! Inventory and credits updated.");
      navigate("/sales");
    } catch (error) {
      toast.error("Failed to delete sale");
    }
  };

  const printInvoice = (invoiceNum: string) => {
    // Set the invoice number for print and trigger print
    window.print();
  };

  const resetForm = () => {
    setItems([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount(0);
    setPaymentMethod("cash");
    setPaidAmount("");
    setInvoiceDate(formatDateInput(new Date()));
    setIsFullPayment(false);
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      {(isLoading || isSaving || isLoadingItems) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <AnimatedLogoLoader size="lg" showMessage message={isSaving ? "Saving invoice..." : "Loading..."} />
        </div>
      )}

      <div className="flex items-center gap-4">
        {editSaleId && (
          <Button onClick={() => navigate("/sales")} variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {editSaleId ? "Edit sale" : "Create invoice"}
          </h1>
          <p className="text-muted-foreground">
            {editSaleId ? "Modify sale details and products" : "Generate a new sale receipt"}
          </p>
        </div>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="relative">
            <Label htmlFor="customerName">Customer name (Optional)</Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => handleCustomerNameChange(e.target.value)}
              onFocus={() => setShowCustomerSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
              placeholder="Enter customer name"
            />
            {showCustomerSuggestions && getFilteredCustomers().length > 0 && (
              <Card className="absolute z-50 w-full mt-1 max-h-[200px] overflow-auto">
                {getFilteredCustomers().map((customer, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 hover:bg-muted cursor-pointer"
                    onMouseDown={() => {
                      setCustomerName(customer.name.trim());
                      setCustomerPhone(customer.phone?.trim() || "");
                      setShowCustomerSuggestions(false);
                    }}
                  >
                    <div className="font-medium">{customer.name}</div>
                    {customer.phone && (
                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </div>
          <div>
            <Label htmlFor="customerPhone">Customer phone (Optional)</Label>
            <Input
              id="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* Description and Image Upload */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or description for this invoice..."
              rows={3}
            />
          </div>
          <div>
            <Label>Upload image (Optional)</Label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="h-24 w-auto rounded-lg border border-border object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={clearImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full h-24 border-dashed"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload image</span>
                  </div>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Items</h3>
              <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                Total: {items.length}
              </span>
            </div>
            <Button onClick={addItem} size="sm" variant="outline" disabled={isSaving || isLoadingItems}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {isLoadingItems ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading items...</p>
              </div>
            </div>
          ) : (
            items.map((item, index) => {
              const itemComplete = isItemComplete(item);
              const errors = validationErrors[index];
              
              return (
                <div key={index} className={cn(
                  "grid gap-3 md:grid-cols-[auto_2fr_1fr_0.7fr_1fr_1fr_1fr_1fr_auto_auto] items-start border-b pb-4 transition-all duration-300",
                  !itemComplete && errors && "bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border-red-200 dark:border-red-800",
                  item.is_return && "bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border-l-4 border-l-orange-500"
                )}>
                  {/* Status Icon */}
                  <div className="flex flex-col items-center justify-center pt-7">
                    <ItemStatusIcon isComplete={itemComplete} />
                  </div>
                  
                  <div className="flex flex-col">
                    <Label className={cn("mb-2", errors?.product && "text-red-500 font-semibold")}>
                      {item.is_return ? (
                        <span className="flex items-center gap-2">
                          Product <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded">RETURN</span>
                        </span>
                      ) : (
                        <>Product {errors?.product && <span className="text-red-500">*</span>}</>
                      )}
                    </Label>
                    {item.is_return ? (
                      <Input 
                        value={item.product_name} 
                        disabled 
                        className="bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 font-medium"
                      />
                    ) : (
                      <Popover open={openProductIndex === index} onOpenChange={(open) => setOpenProductIndex(open ? index : null)}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="outline" 
                            role="combobox" 
                            aria-expanded={openProductIndex === index} 
                            className={cn(
                              "w-full justify-between",
                              errors?.product && "border-red-500 ring-2 ring-red-200 dark:ring-red-800 animate-pulse"
                            )}
                          >
                            {item.product_name || "Select product..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search product..." />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => {
                                      updateItem(index, "product_id", product.id);
                                      setOpenProductIndex(null);
                                      // Clear product error when selected
                                      setValidationErrors(prev => {
                                        if (prev[index]) {
                                          return {...prev, [index]: {...prev[index], product: false}};
                                        }
                                        return prev;
                                      });
                                    }}
                                    className="hover:bg-blue-600 hover:text-white [&[aria-selected=true]]:bg-blue-600 [&[aria-selected=true]]:text-white"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", item.product_id === product.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>{product.name}</span>
                                      <span className="text-xs hover:text-white [&[aria-selected=true]]:text-white">
                                        Stock: {product.stock_quantity} | Cost: Rs. {product.purchase_price} | Category: {product.category || 'N/A'}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <Label className={cn("mb-2", errors?.quantity && "text-red-500 font-semibold")}>
                      Quantity {errors?.quantity && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      ref={(el) => { quantityInputRefs.current[index] = el; }}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity || ""}
                      onFocus={(e) => {
                        if (item.quantity === 0) {
                          updateItem(index, "quantity", "");
                        }
                      }}
                      onChange={(e) => {
                        e.preventDefault();
                        updateItem(index, "quantity", e.target.value);
                        // Clear quantity error when value entered
                        if (parseFloat(e.target.value) > 0) {
                          setValidationErrors(prev => {
                            if (prev[index]) {
                              return {...prev, [index]: {...prev[index], quantity: false}};
                            }
                            return prev;
                          });
                        }
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      className={cn(
                        "font-semibold",
                        errors?.quantity && "border-red-500 ring-2 ring-red-200 dark:ring-red-800 animate-pulse"
                      )}
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label className="mb-2">Type</Label>
                    <Input type="text" value={item.quantity_type} disabled className="text-xs" />
                  </div>
                  <div className="flex flex-col">
                    <Label className={cn("mb-2", errors?.price && "text-red-500 font-semibold")}>
                      Price {errors?.price && <span className="text-red-500">*</span>}
                    </Label>
                    <Input 
                      type="number" 
                      value={item.unit_price || ""} 
                      onFocus={(e) => {
                        if (item.unit_price === 0) {
                          updateItem(index, "unit_price", "");
                        }
                      }}
                      onChange={(e) => {
                        e.preventDefault();
                        updateItem(index, "unit_price", e.target.value);
                        // Clear price error when value entered
                        if (parseFloat(e.target.value) > 0) {
                          setValidationErrors(prev => {
                            if (prev[index]) {
                              return {...prev, [index]: {...prev[index], price: false}};
                            }
                            return prev;
                          });
                        }
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      className={cn(
                        "font-semibold",
                        errors?.price && "border-red-500 ring-2 ring-red-200 dark:ring-red-800 animate-pulse"
                      )}
                    />
                  </div>
                  <div className="flex flex-col">
                    <Label className="mb-2">Cost</Label>
                    <Input type="number" value={(item.purchase_price * item.quantity).toFixed(2)} disabled className="text-destructive font-medium" />
                  </div>
                  <div className="flex flex-col">
                    <Label className="mb-2">Profit</Label>
                    <Input type="number" value={((item.unit_price - item.purchase_price) * item.quantity).toFixed(2)} disabled className="text-success font-medium" />
                  </div>
                  <div className="flex flex-col">
                    <Label className="mb-2">Total</Label>
                    <Input 
                      type="number" 
                      value={item.total_price || ""} 
                      onFocus={(e) => {
                        if (item.total_price === 0) {
                          updateItem(index, "total_price", "");
                        }
                      }}
                      onChange={(e) => {
                        e.preventDefault();
                        updateItem(index, "total_price", e.target.value);
                      }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                      className="font-semibold"
                    />
                  </div>
                  {/* Only show return button for non-return items */}
                  {!item.is_return && (
                    <div className="flex flex-col items-center">
                      <Label className="mb-2 opacity-0">Return</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openReturnDialog(index)}
                        disabled={isSaving || !isItemComplete(item) || getMaxReturnQuantity(index) <= 0}
                        className="hover:bg-orange-100 hover:text-orange-600 hover:border-orange-300"
                        title={getMaxReturnQuantity(index) <= 0 ? "All items already returned" : "Add return for this item"}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {/* Show indicator for return items */}
                  {item.is_return && (
                    <div className="flex flex-col items-center">
                      <Label className="mb-2 opacity-0">Return</Label>
                      <div className="h-9 w-9 flex items-center justify-center bg-orange-500 text-white rounded-md">
                        <RotateCcw className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <Label className="mb-2 opacity-0">Action</Label>
                    <Button onClick={() => removeItem(index)} variant="destructive" size="icon" disabled={isSaving}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
          <div>
            <Label htmlFor="invoiceDate">Invoice date</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="paymentMethod">Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="online">Online Transfer</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="installment">Installment</SelectItem>
              </SelectContent>
            </Select>
          </div>
            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="paidAmount">Paid amount (Optional)</Label>
              <div className="text-xs text-muted-foreground mb-1 font-medium">
                Current total: Rs. {calculateFinalAmount().toFixed(2)}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox 
                  id="fullPayment" 
                  checked={isFullPayment}
                  onCheckedChange={(checked) => {
                    setIsFullPayment(checked as boolean);
                    if (checked) {
                      setPaidAmount(calculateFinalAmount().toString());
                    } else {
                      setPaidAmount("");
                    }
                  }}
                />
                <label htmlFor="fullPayment" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  Full payment
                  {isFullPayment && (
                    <CheckCircle className="h-4 w-4 text-green-500 animate-in fade-in zoom-in duration-300" />
                  )}
                </label>
              </div>
              <Input
                id="paidAmount"
                type="number"
                value={paidAmount}
                onChange={(e) => {
                  setPaidAmount(e.target.value);
                  setIsFullPayment(false);
                }}
                placeholder="Leave empty for full payment"
                disabled={isFullPayment}
              />
            </div>
            {editSaleId && paidAmount && parseFloat(paidAmount) < calculateFinalAmount() && (
              <div>
                <Label htmlFor="additionalPayment">Add payment to remaining</Label>
                <div className="text-xs text-warning mb-1 font-medium">
                  Remaining balance: Rs. {(calculateFinalAmount() - parseFloat(paidAmount)).toFixed(2)}
                </div>
                <Input
                  id="additionalPayment"
                  type="number"
                  value={additionalPayment}
                  onChange={(e) => setAdditionalPayment(e.target.value)}
                  placeholder="Enter payment amount"
                />
              </div>
            )}
          </div>
          
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">Rs. {calculateSubtotal().toFixed(2)}</span>
              </div>
              {calculateReturnAmount() > 0 && (
                <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                  <span className="flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Return Amount:
                  </span>
                  <span className="font-medium">- Rs. {calculateReturnAmount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Net Total:</span>
                <span className="font-medium">Rs. {calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total cost:</span>
                <span className="font-medium text-destructive">Rs. {calculateTotalCost().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total profit:</span>
                <span className="font-medium text-success">Rs. {calculateTotalProfit().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-destructive">
                <span>Discount:</span>
                <span className="font-medium">- Rs. {discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-3">
                <span>Final Total:</span>
                <span className="text-success">Rs. {calculateFinalAmount().toFixed(2)}</span>
              </div>
              {isFullPayment && (
                <div className="flex justify-center py-2 border-t">
                  <AnimatedTick />
                </div>
              )}
              {paidAmount && parseFloat(paidAmount) !== calculateFinalAmount() && (
                <>
                  <div className="flex justify-between text-sm text-primary">
                    <span>Paid:</span>
                    <span className="font-medium">Rs. {parseFloat(paidAmount).toFixed(2)}</span>
                  </div>
                  {editSaleId && additionalPayment && parseFloat(additionalPayment) > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Additional payment:</span>
                      <span className="font-medium">+ Rs. {parseFloat(additionalPayment).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(paidAmount) + (additionalPayment ? parseFloat(additionalPayment) : 0) < calculateFinalAmount() ? (
                    <div className="flex justify-between text-sm text-warning">
                      <span>Remaining (Credit):</span>
                      <span className="font-medium">
                        Rs. {(calculateFinalAmount() - parseFloat(paidAmount) - (additionalPayment ? parseFloat(additionalPayment) : 0)).toFixed(2)}
                      </span>
                    </div>
                  ) : parseFloat(paidAmount) + (additionalPayment ? parseFloat(additionalPayment) : 0) > calculateFinalAmount() ? (
                    <div className="flex justify-between text-sm text-success font-semibold">
                      <span>Change to Return:</span>
                      <span>Rs. {(parseFloat(paidAmount) + (additionalPayment ? parseFloat(additionalPayment) : 0) - calculateFinalAmount()).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-sm text-success font-semibold">
                      <span>Fully paid</span>
                      <span>✓</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={saveInvoice} className="flex-1" disabled={isSaving}>
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {editSaleId ? "Updating..." : "Saving..."}
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                {editSaleId ? "Update Sale" : "Save & Print"}
              </>
            )}
          </Button>
          {editSaleId ? (
            <Button onClick={handleDeleteSale} variant="destructive" disabled={isSaving}>
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          ) : (
            <Button onClick={resetForm} variant="outline" disabled={isSaving}>
              Reset
            </Button>
          )}
        </div>
      </Card>
      
      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Return Item
            </DialogTitle>
            <DialogDescription>
              {returnItemIndex !== null && items[returnItemIndex] && (
                <span>
                  Enter the quantity to return for <strong>{items[returnItemIndex].product_name}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {returnItemIndex !== null && items[returnItemIndex] && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Sold Quantity</p>
                  <p className="font-medium">{items[returnItemIndex].quantity} {items[returnItemIndex].quantity_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit Price</p>
                  <p className="font-medium">Rs. {items[returnItemIndex].unit_price.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Returnable</p>
                  <p className="font-medium text-orange-600">{getMaxReturnQuantity(returnItemIndex)} {items[returnItemIndex].quantity_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Return Value</p>
                  <p className="font-medium text-orange-600">
                    Rs. {(parseFloat(returnQuantity || "0") * items[returnItemIndex].unit_price).toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="returnQuantity">Return Quantity</Label>
                <Input
                  id="returnQuantity"
                  type="number"
                  step="0.01"
                  min="0"
                  max={getMaxReturnQuantity(returnItemIndex)}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  placeholder={`Max: ${getMaxReturnQuantity(returnItemIndex)}`}
                  className="mt-1"
                  autoFocus
                />
                {parseFloat(returnQuantity || "0") > getMaxReturnQuantity(returnItemIndex) && (
                  <p className="text-xs text-destructive mt-1">
                    Cannot exceed sold quantity ({getMaxReturnQuantity(returnItemIndex)})
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReturnConfirm}
              className="bg-orange-500 hover:bg-orange-600 text-white"
              disabled={!returnQuantity || parseFloat(returnQuantity) <= 0 || (returnItemIndex !== null && parseFloat(returnQuantity) > getMaxReturnQuantity(returnItemIndex))}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Print Invoice Component - Hidden on screen, visible only when printing */}
      <PrintInvoice
        ref={printRef}
        invoiceNumber={invoiceNumber || `INV-${Date.now()}`}
        customerName={customerName}
        customerPhone={customerPhone}
        invoiceDate={new Date().toISOString()}
        items={items}
        discount={discount}
        finalAmount={calculateFinalAmount()}
        paidAmount={Number(paidAmount) || 0}
        settings={receiptSettings}
        timezone={timezone}
      />
    </div>
  );
};

export default Invoice;
