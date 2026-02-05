import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Button } from "@/components/ui/button";
 import { Calendar } from "@/components/ui/calendar";
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
 import { Search, Filter, CalendarIcon } from "lucide-react";
 import { format, parse } from "date-fns";
 import { cn } from "@/lib/utils";
 
 export interface InvoiceCredit {
   id: string;
   sale_id: string;
   invoice_number: string;
   invoice_date: string;
   invoice_amount: number;
   paid_amount: number;
   pending_amount: number;
   status: "cleared" | "pending" | "partial";
 }
 
 interface InvoiceCreditTableProps {
   invoices: InvoiceCredit[];
   formatDate: (date: string) => string;
   startDate: string;
   endDate: string;
   onStartDateChange: (date: string) => void;
   onEndDateChange: (date: string) => void;
 }
 
 const InvoiceCreditTable = ({ 
   invoices, 
   formatDate, 
   startDate, 
   endDate, 
   onStartDateChange, 
   onEndDateChange 
 }: InvoiceCreditTableProps) => {
   const [statusFilter, setStatusFilter] = useState<string>("all");
   const [searchTerm, setSearchTerm] = useState("");
 
   // Convert string dates to Date objects for calendar
   const startDateObj = startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined;
   const endDateObj = endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined;
 
   const handleStartDateSelect = (date: Date | undefined) => {
     onStartDateChange(date ? format(date, 'yyyy-MM-dd') : '');
   };
 
   const handleEndDateSelect = (date: Date | undefined) => {
     onEndDateChange(date ? format(date, 'yyyy-MM-dd') : '');
   };
 
   const filteredInvoices = useMemo(() => {
     let filtered = [...invoices];
 
     // Filter by status
     if (statusFilter !== "all") {
       filtered = filtered.filter(inv => inv.status === statusFilter);
     }
 
     // Filter by search (invoice number)
     if (searchTerm) {
       filtered = filtered.filter(inv => 
         inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
       );
     }
 
     // Filter by date range
     if (startDate) {
       filtered = filtered.filter(inv => inv.invoice_date >= startDate);
     }
     if (endDate) {
       filtered = filtered.filter(inv => inv.invoice_date <= endDate);
     }
 
     return filtered;
   }, [invoices, statusFilter, searchTerm, startDate, endDate]);
 
   const getStatusBadge = (status: string) => {
     switch (status) {
       case "cleared":
         return <Badge className="bg-success text-success-foreground">Cleared</Badge>;
       case "partial":
         return <Badge className="bg-warning text-warning-foreground">Partial</Badge>;
       default:
         return <Badge variant="secondary">Pending</Badge>;
     }
   };
 
   return (
     <Card className="p-4">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
         <h3 className="font-semibold text-lg flex items-center gap-2">
           <Filter className="h-4 w-4" />
           Invoice-wise Credit
         </h3>
         
         <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
           <div className="relative flex-1 min-w-[150px] md:w-48">
             <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
               placeholder="Invoice #"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-8 h-9"
             />
           </div>
           
           <Select value={statusFilter} onValueChange={setStatusFilter}>
             <SelectTrigger className="w-28 h-9">
               <SelectValue placeholder="Status" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All</SelectItem>
               <SelectItem value="pending">Pending</SelectItem>
               <SelectItem value="partial">Partial</SelectItem>
               <SelectItem value="cleared">Cleared</SelectItem>
             </SelectContent>
           </Select>
 
             <Popover>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   className={cn(
                     "w-[130px] h-9 justify-start text-left font-normal",
                     !startDate && "text-muted-foreground"
                   )}
                 >
                   <CalendarIcon className="mr-2 h-4 w-4" />
                   {startDate ? format(startDateObj!, 'dd/MM/yyyy') : <span>From</span>}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="start">
                 <Calendar
                   mode="single"
                   selected={startDateObj}
                   onSelect={handleStartDateSelect}
                   initialFocus
                   className="pointer-events-auto"
                 />
               </PopoverContent>
             </Popover>
             
           <span className="text-muted-foreground">to</span>
             
             <Popover>
               <PopoverTrigger asChild>
                 <Button
                   variant="outline"
                   className={cn(
                     "w-[130px] h-9 justify-start text-left font-normal",
                     !endDate && "text-muted-foreground"
                   )}
                 >
                   <CalendarIcon className="mr-2 h-4 w-4" />
                   {endDate ? format(endDateObj!, 'dd/MM/yyyy') : <span>To</span>}
                 </Button>
               </PopoverTrigger>
               <PopoverContent className="w-auto p-0" align="start">
                 <Calendar
                   mode="single"
                   selected={endDateObj}
                   onSelect={handleEndDateSelect}
                   initialFocus
                   className="pointer-events-auto"
                 />
               </PopoverContent>
             </Popover>
         </div>
       </div>
 
       {filteredInvoices.length === 0 ? (
         <div className="text-center py-8 text-muted-foreground">
           No invoices found matching the filters
         </div>
       ) : (
         <>
           {/* Mobile Cards */}
           <div className="md:hidden space-y-3">
             {filteredInvoices.map((invoice) => (
               <Card key={invoice.id} className="p-3 border">
                 <div className="flex items-center justify-between mb-2">
                   <span className="font-medium text-sm">{invoice.invoice_number}</span>
                   {getStatusBadge(invoice.status)}
                 </div>
                 <div className="text-xs text-muted-foreground mb-2">
                   {formatDate(invoice.invoice_date)}
                 </div>
                 <div className="grid grid-cols-3 gap-2 text-center">
                   <div className="bg-muted/50 rounded p-1.5">
                     <p className="text-[10px] text-muted-foreground">Amount</p>
                     <p className="text-xs font-semibold">Rs. {invoice.invoice_amount.toLocaleString()}</p>
                   </div>
                   <div className="bg-success/10 rounded p-1.5">
                     <p className="text-[10px] text-muted-foreground">Paid</p>
                     <p className="text-xs font-semibold text-success">Rs. {invoice.paid_amount.toLocaleString()}</p>
                   </div>
                   <div className="bg-warning/10 rounded p-1.5">
                     <p className="text-[10px] text-muted-foreground">Pending</p>
                     <p className="text-xs font-bold text-warning">Rs. {invoice.pending_amount.toLocaleString()}</p>
                   </div>
                 </div>
               </Card>
             ))}
           </div>
 
           {/* Desktop Table */}
           <div className="hidden md:block overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Invoice #</TableHead>
                   <TableHead>Date</TableHead>
                   <TableHead className="text-right">Amount</TableHead>
                   <TableHead className="text-right">Paid</TableHead>
                   <TableHead className="text-right">Pending</TableHead>
                   <TableHead>Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredInvoices.map((invoice) => (
                   <TableRow key={invoice.id}>
                     <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                     <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                     <TableCell className="text-right">Rs. {invoice.invoice_amount.toLocaleString()}</TableCell>
                     <TableCell className="text-right text-success">Rs. {invoice.paid_amount.toLocaleString()}</TableCell>
                     <TableCell className="text-right font-semibold text-warning">
                       Rs. {invoice.pending_amount.toLocaleString()}
                     </TableCell>
                     <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
         </>
       )}
     </Card>
   );
 };
 
 export default InvoiceCreditTable;