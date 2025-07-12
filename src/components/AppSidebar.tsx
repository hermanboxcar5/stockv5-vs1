import { useEffect, useState } from "react";
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
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Home, Package, FileText, Plus, ShoppingCart, Settings} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useParams } from "react-router-dom";
import { loadOrganizationData } from "@/utils/backendService";

interface AppSidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

const baseItems = [
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
  }
];

const shoppingItem = {
  title: "Shopping Lists",
  icon: ShoppingCart,
  key: "shopping",
};

const settingsItem = {
  title: "Settings",
  icon: Settings,
  key: "settings",
};

export function AppSidebar({ activeView, onNavigate }: AppSidebarProps) {
  const { orgId } = useParams();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [items, setItems] = useState(baseItems);

  const API_BASE = "https://stockv5-backend.vercel.app";

  const getAccessToken = async () => {
    const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  useEffect(() => {
    const fetchUserRoleAndOrgName = async () => {
      if (!orgId) return;

      try {
        const token = await getAccessToken();
        if (!token) return;

        // Fetch user role
        const response = await fetch(`${API_BASE}/api/v1/users/listorgs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invitecode: 'dummy' })
        });

        const result = await response.json();
        if (result.success && result.data[orgId]) {
          const role = result.data[orgId];
          setUserRole(role);
          
          // Update items based on role
          if (role === 'owner') {
            setItems([...baseItems, shoppingItem, settingsItem]);
          } else if (role === 'admin') {
            setItems([...baseItems, shoppingItem, settingsItem]);
          } else {
            setItems(baseItems);
          }
        }

        // Fetch organization name
        const orgData = await loadOrganizationData(orgId);
        if (orgData.success) {
          setOrgName(orgData.data?.data?.data?.name || orgData.data?.data?.name || orgData.data?.name || `Organization ${orgId}`,);
        }
      } catch (error) {
        console.error('Failed to fetch user role and org name:', error);
        setItems(baseItems); // Default to member view
      }
    };

    fetchUserRoleAndOrgName();
  }, [orgId]);

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="text-center">
          <h3 className="font-semibold text-foreground">{orgName || `Organization ${orgId}`}</h3>
          <p className="text-sm text-muted-foreground">StockV5</p>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
