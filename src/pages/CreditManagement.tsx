import CreditManagement from "@/components/credits/CreditManagement";

const CreditManagementPage = () => {
  return (
    <div className="space-y-4 md:space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Credit Management</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage credit given and taken with customers and suppliers
        </p>
      </div>
      <CreditManagement />
    </div>
  );
};

export default CreditManagementPage;
