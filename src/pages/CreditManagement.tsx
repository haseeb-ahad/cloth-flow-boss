import CreditManagement from "@/components/credits/CreditManagement";

const CreditManagementPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Credit Management</h1>
        <p className="text-muted-foreground">
          Manage credit given and taken with customers and suppliers
        </p>
      </div>
      <CreditManagement />
    </div>
  );
};

export default CreditManagementPage;
