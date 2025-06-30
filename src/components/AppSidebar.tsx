
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Home, Package, FileText, Plus, ShoppingCart } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface AppSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const items = [
  {
    title: "Dashboard",
    icon: Home,
    key: "dashboard",
  },
  {
    title: "Warehouse",
    icon: Package,
    key: "warehouse",
  },
  {
    title: "Claims",
    icon: FileText,
    key: "claims",
  },
  {
    title: "Deposits",
    icon: Plus,
    key: "deposits",
  },
  {
    title: "Shopping Lists",
    icon: ShoppingCart,
    key: "shopping",
  },
];

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>StockV5</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={activeView === item.key}
                    onClick={() => onNavigate(item.key)}
                  >
                    <button className="w-full flex items-center">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-center p-2">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
