
import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dashboard } from "@/components/Dashboard";
import { Warehouse } from "@/components/Warehouse";
import { Claims } from "@/components/Claims";
import { Deposits } from "@/components/Deposits";
import { ShoppingLists } from "@/components/ShoppingLists";
import { SetupDialog } from "@/components/SetupDialog";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { hasDirectoryAccess } from "@/utils/fileSystemManager";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const [highlightedItem, setHighlightedItem] = useState<string | undefined>();
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    setShowSetup(!hasDirectoryAccess());
  }, []);

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

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
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (showSetup) {
    return (
      <ThemeProvider>
        <SetupDialog onComplete={handleSetupComplete} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
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
                    <p className="text-muted-foreground mt-1">v1.0.2 Andes</p>
                  </div>
                </div>
              </div>
            </div>
            {renderActiveView()}
          </main>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Index;
