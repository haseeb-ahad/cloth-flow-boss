 import { Card } from "@/components/ui/card";
 import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { History, ArrowDownLeft, ArrowUpRight } from "lucide-react";
 
 export interface LedgerEntry {
   id: string;
   date: string;
   transaction_type: "credit_given" | "payment_received";
   invoice_number: string | null;
   amount: number;
   payment_method: string | null;
   balance_after: number;
   notes: string | null;
 }
 
 interface CreditLedgerProps {
   entries: LedgerEntry[];
   formatDate: (date: string) => string;
 }
 
 const CreditLedger = ({ entries, formatDate }: CreditLedgerProps) => {
   if (entries.length === 0) {
     return (
       <Card className="p-6 text-center">
         <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
         <p className="text-muted-foreground">No transaction history yet</p>
       </Card>
     );
   }
 
   return (
     <Card className="p-4">
       <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
         <History className="h-4 w-4" />
         Credit & Payment History
       </h3>
 
       {/* Mobile Cards */}
       <div className="md:hidden space-y-3">
         {entries.map((entry) => (
           <Card key={entry.id} className={`p-3 border ${
             entry.transaction_type === "payment_received" ? "border-success/30 bg-success/5" : "border-primary/30 bg-primary/5"
           }`}>
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2">
                 {entry.transaction_type === "payment_received" ? (
                   <ArrowDownLeft className="h-4 w-4 text-success" />
                 ) : (
                   <ArrowUpRight className="h-4 w-4 text-primary" />
                 )}
                 <Badge variant={entry.transaction_type === "payment_received" ? "default" : "secondary"} 
                   className={entry.transaction_type === "payment_received" ? "bg-success" : ""}>
                   {entry.transaction_type === "payment_received" ? "Payment" : "Credit"}
                 </Badge>
               </div>
               <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
             </div>
             
             <div className="flex items-center justify-between">
               <div>
                 {entry.invoice_number && (
                   <p className="text-xs text-muted-foreground">Invoice: {entry.invoice_number}</p>
                 )}
                 {entry.payment_method && (
                   <p className="text-xs text-muted-foreground capitalize">{entry.payment_method}</p>
                 )}
               </div>
               <div className="text-right">
                 <p className={`font-bold ${entry.transaction_type === "payment_received" ? "text-success" : "text-primary"}`}>
                   {entry.transaction_type === "payment_received" ? "-" : "+"} Rs. {entry.amount.toLocaleString()}
                 </p>
                 <p className="text-xs text-muted-foreground">
                   Balance: Rs. {entry.balance_after.toLocaleString()}
                 </p>
               </div>
             </div>
             {entry.notes && (
               <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{entry.notes}</p>
             )}
           </Card>
         ))}
       </div>
 
       {/* Desktop Table */}
       <div className="hidden md:block overflow-x-auto">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead>Date</TableHead>
               <TableHead>Type</TableHead>
               <TableHead>Invoice #</TableHead>
               <TableHead className="text-right">Amount</TableHead>
               <TableHead>Method</TableHead>
               <TableHead className="text-right">Balance After</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {entries.map((entry) => (
               <TableRow key={entry.id} className={
                 entry.transaction_type === "payment_received" ? "bg-success/5" : "bg-primary/5"
               }>
                 <TableCell>{formatDate(entry.date)}</TableCell>
                 <TableCell>
                   <div className="flex items-center gap-2">
                     {entry.transaction_type === "payment_received" ? (
                       <ArrowDownLeft className="h-4 w-4 text-success" />
                     ) : (
                       <ArrowUpRight className="h-4 w-4 text-primary" />
                     )}
                     <Badge variant={entry.transaction_type === "payment_received" ? "default" : "secondary"}
                       className={entry.transaction_type === "payment_received" ? "bg-success" : ""}>
                       {entry.transaction_type === "payment_received" ? "Payment Received" : "Credit Given"}
                     </Badge>
                   </div>
                 </TableCell>
                 <TableCell>{entry.invoice_number || "-"}</TableCell>
                 <TableCell className={`text-right font-semibold ${
                   entry.transaction_type === "payment_received" ? "text-success" : "text-primary"
                 }`}>
                   {entry.transaction_type === "payment_received" ? "-" : "+"} Rs. {entry.amount.toLocaleString()}
                 </TableCell>
                 <TableCell className="capitalize">{entry.payment_method || "-"}</TableCell>
                 <TableCell className="text-right font-medium">
                   Rs. {entry.balance_after.toLocaleString()}
                 </TableCell>
               </TableRow>
             ))}
           </TableBody>
         </Table>
       </div>
     </Card>
   );
 };
 
 export default CreditLedger;