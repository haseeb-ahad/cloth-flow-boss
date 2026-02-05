 import { useState, useRef, useEffect } from "react";
 import React from "react";
 import { Input } from "@/components/ui/input";
 import { Card } from "@/components/ui/card";
 import { Search, User, Phone, X } from "lucide-react";
 import { Button } from "@/components/ui/button";
 
 interface Customer {
   name: string;
   phone: string | null;
 }
 
 interface CustomerSearchProps {
   customers: Customer[];
   selectedCustomer: Customer | null;
   onSelect: (customer: Customer) => void;
   onClear: () => void;
 }
 
 const CustomerSearch = ({ customers, selectedCustomer, onSelect, onClear }: CustomerSearchProps) => {
   const [searchTerm, setSearchTerm] = useState("");
   const [showSuggestions, setShowSuggestions] = useState(false);
   const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
   const suggestionRef = useRef<HTMLDivElement>(null);
 
   useEffect(() => {
     const handleClickOutside = (event: MouseEvent) => {
       if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
         setShowSuggestions(false);
       }
     };
     document.addEventListener("mousedown", handleClickOutside);
     return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);
 
   const handleSearch = (value: string) => {
     setSearchTerm(value);
     
     if (value.length > 0) {
       const searchValue = value.toLowerCase().replace(/\s+/g, '');
       const filtered = customers.filter(c => {
         const nameMatch = c.name.toLowerCase().replace(/\s+/g, '').includes(searchValue);
         const phoneMatch = c.phone?.replace(/\s+/g, '').includes(searchValue);
         return nameMatch || phoneMatch;
       });
       setFilteredCustomers(filtered);
       setShowSuggestions(filtered.length > 0);
     } else {
       setShowSuggestions(false);
     }
   };
 
   const handleSelect = (customer: Customer) => {
     onSelect(customer);
     setSearchTerm("");
     setShowSuggestions(false);
   };
 
   if (selectedCustomer) {
     return (
       <Card className="p-4 bg-primary/5 border-primary/20">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
               <User className="h-5 w-5 text-primary" />
             </div>
             <div>
               <p className="font-semibold text-lg">{selectedCustomer.name}</p>
               {selectedCustomer.phone && (
                 <p className="text-sm text-muted-foreground flex items-center gap-1">
                   <Phone className="h-3 w-3" />
                   {selectedCustomer.phone}
                 </p>
               )}
             </div>
           </div>
           <Button variant="ghost" size="icon" onClick={onClear}>
             <X className="h-4 w-4" />
           </Button>
         </div>
       </Card>
     );
   }
 
   return (
     <div className="relative" ref={suggestionRef}>
       <div className="relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
         <Input
           placeholder="Search customer by name or phone..."
           value={searchTerm}
           onChange={(e) => handleSearch(e.target.value)}
           className="pl-10 h-12 text-base"
           onFocus={() => {
             if (searchTerm.length > 0 && filteredCustomers.length > 0) {
               setShowSuggestions(true);
             }
           }}
         />
       </div>
       
       {showSuggestions && filteredCustomers.length > 0 && (
         <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto shadow-lg">
           {filteredCustomers.map((customer, index) => (
             <div
               key={index}
               className="px-4 py-3 hover:bg-accent cursor-pointer flex items-center justify-between border-b last:border-b-0"
               onClick={() => handleSelect(customer)}
             >
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                   <User className="h-4 w-4 text-muted-foreground" />
                 </div>
                 <span className="font-medium">{customer.name}</span>
               </div>
               {customer.phone && (
                 <span className="text-sm text-muted-foreground">{customer.phone}</span>
               )}
             </div>
           ))}
         </Card>
       )}
     </div>
   );
 };
 
 export default CustomerSearch;