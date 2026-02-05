import React from "react";
 import { Card } from "@/components/ui/card";
 import { ArrowDownCircle, DollarSign, AlertCircle } from "lucide-react";
 
 interface CreditSummaryCardsProps {
   totalCreditGiven: number;
   totalPaid: number;
   outstandingBalance: number;
 }
 
 const CreditSummaryCards = ({ totalCreditGiven, totalPaid, outstandingBalance }: CreditSummaryCardsProps) => {
   return (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
       <Card className="p-4 bg-primary/5 border-primary/20">
         <div className="flex items-start justify-between gap-3">
           <div className="min-w-0 flex-1">
             <p className="text-xs md:text-sm text-muted-foreground">Total Credit Given</p>
             <p className="text-xl md:text-2xl font-bold text-primary">
               Rs. {totalCreditGiven.toLocaleString()}
             </p>
             <p className="text-xs text-muted-foreground">Total invoices on credit</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
             <ArrowDownCircle className="h-5 w-5 text-primary" />
           </div>
         </div>
       </Card>
 
       <Card className="p-4 bg-success/10 border-success/30">
         <div className="flex items-start justify-between gap-3">
           <div className="min-w-0 flex-1">
             <p className="text-xs md:text-sm text-muted-foreground">Total Paid</p>
             <p className="text-xl md:text-2xl font-bold text-success">
               Rs. {totalPaid.toLocaleString()}
             </p>
             <p className="text-xs text-muted-foreground">Amount received</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
             <DollarSign className="h-5 w-5 text-success" />
           </div>
         </div>
       </Card>
 
       <Card className="p-4 bg-warning/10 border-warning/30">
         <div className="flex items-start justify-between gap-3">
           <div className="min-w-0 flex-1">
             <p className="text-xs md:text-sm text-muted-foreground">Outstanding Balance</p>
             <p className="text-xl md:text-2xl font-bold text-warning">
               Rs. {outstandingBalance.toLocaleString()}
             </p>
             <p className="text-xs text-muted-foreground">Pending amount</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
             <AlertCircle className="h-5 w-5 text-warning" />
           </div>
         </div>
       </Card>
     </div>
   );
 };
 
 export default CreditSummaryCards;