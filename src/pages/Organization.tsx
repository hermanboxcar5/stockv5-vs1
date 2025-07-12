
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Warehouse } from "@/components/Warehouse";
import { Claims } from "@/components/Claims";
import { Deposits } from "@/components/Deposits";
import { ShoppingLists } from "@/components/ShoppingLists";
import { Settings } from "@/components/Settings";
import { loadOrganizationData, checkOrganizationExists } from "@/utils/backendService";

const Organization = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("dashboard");
  const [highlightedItem, setHighlightedItem] = useState<string | undefined>();
  const [orgName, setOrgName] = useState<string>("");
  const [isValidOrg, setIsValidOrg] = useState<boolean | null>(null);

  useEffect(() => {
    const validateAndFetchOrg = async () => {
      if (!orgId) {
        navigate('/dashboard');
        return;
      }
      
      try {
        // Check if organization exists
        const exists = await checkOrganizationExists(orgId);
        if (!exists) {
          navigate('/dashboard');
          return;
        }
        
        setIsValidOrg(true);
        
        // Fetch organization data
        const orgData = await loadOrganizationData(orgId);
        if (orgData.success && orgData.data.name) {
          setOrgName(orgData.data.name);
        }
      } catch (error) {
        console.error('Failed to validate organization:', error);
        navigate('/dashboard');
      }
    };

    validateAndFetchOrg();
  }, [orgId, navigate]);

  const handleNavigate = (view: string, itemId?: string) => {
    setActiveView(view);
    setHighlightedItem(itemId);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "warehouse":
        return <Warehouse />;
      case "claims":
        return <Claims highlightedClaim={highlightedItem} />;
      case "deposits":
        return <Deposits highlightedDeposit={highlightedItem} />;
      case "shopping":
        return <ShoppingLists onNavigate={handleNavigate} />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  // Show loading while validating
  if (isValidOrg === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeView={activeView} onNavigate={setActiveView} />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <SidebarTrigger className="mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img 
                  src="/logo.png" 
                  alt="StockV5" 
                  className="h-12 w-12"
                />
                <div>
                  <h1 className="text-3xl font-bold text-foreground">StockV5</h1>
                  <p className="text-muted-foreground mt-1">Organization: {orgName || orgId}</p>
                </div>
              </div>
            </div>
          </div>
          {renderActiveView()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Organization;
