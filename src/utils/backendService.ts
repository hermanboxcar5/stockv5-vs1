import { useParams } from "react-router-dom";

const API_BASE = "https://stockv5-backend-v1s.vercel.app/";

export interface ClaimItem {
  sku: string;
  name: string;
  quantity: number;
}

export interface Claim {
  id: string;
  name: string;
  status: 'pending' | 'approved';
  createdAt: string;
  createdBy: string;
  data: {
    teamName: string;
    submittedDate: string;
    items: ClaimItem[];
    canFulfill?: boolean;
  };
}

export interface Deposit {
  id: string;
  name: string;
  status: 'pending' | 'approved';
  createdAt: string;
  createdBy: string;
  data: {
    teamName: string;
    submittedDate: string;
    items: ClaimItem[];
  };
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: string;
    url: string;
    stock: boolean;
  }>;
}

export interface VexPart {
  name: string;
  price: string;
  url: string;
  stock: boolean;
  thumbnail: string;
  type: string;
}

export interface VexPartsData {
  [sku: string]: VexPart;
}

export interface WarehouseItem extends VexPart {
  inventoryStock: number;
}

export interface WarehouseData {
  [sku: string]: WarehouseItem;
}

const getAccessToken = async () => {
  const SUPABASE_URL = 'https://bmmcwlukjgfxmzxjpjwx.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_b60TKX8zQ9yPaAB5xEpvuw_VmC14CGY';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

const makeAuthenticatedRequest = async (endpoint: string, data: any) => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Request failed');
  }
  
  return result.data;
};

// VEX Parts data functions
export async function loadVexParts(): Promise<VexPartsData> {
  try {
    const response = await fetch('/vex.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch VEX parts data:', error);
    return {};
  }
}

// Organization data functions
export async function loadOrganizationData(orgId: string) {
  return await makeAuthenticatedRequest('/api/v1/orgs/read', { organization: orgId });
}

export async function checkOrganizationExists(orgId: string): Promise<boolean> {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/orgs/exists', { organization: orgId });
    return result == true;
  } catch (error) {
    console.error('Failed to check organization existence:', error);
    return false;
  }
}

export async function createOrganization(name: string, preset?: any): Promise<void> {
  const payload: any = { name };
  if (preset) {
    payload.preset = preset;
  }
  
  await makeAuthenticatedRequest('/api/v1/orgs/create', payload);
}

// Warehouse functions
export async function loadWarehouse(orgId: string): Promise<WarehouseData> {
  try {
    const orgData = await loadOrganizationData(orgId);
    console.log(orgData)
    return orgData.data?.data?.warehouse || {};
  } catch (error) {
    console.error('Failed to load warehouse data:', error);
    return {};
  }
}

export async function addItemToWarehouse(orgId: string, sku: string, quantity: number): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/warehouse/additem', {
    orgId,
    sku,
    quantity
  });
}

export async function removeItemFromWarehouse(orgId: string, sku: string): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/warehouse/removeitem', {
    orgId,
    sku
  });
}

// Claims functions
export async function loadClaims(orgId: string): Promise<Claim[]> {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/orgs/claims/list', { orgId });
    if (result && Array.isArray(result)) {
      // Sort by createdAt descending (newest first)
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('Failed to load claims:', error);
    return [];
  }
}

export async function createClaim(orgId: string, name: string, data: any): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/claims/create', {
    orgId,
    name,
    data
  });
}

export async function modifyClaim(orgId: string, claimId: string, data: any): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/claims/modify', {
    orgId,
    claimId,
    data
  });
}

export async function approveClaim(orgId: string, claimId: string): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/claims/approve', {
    orgId,
    claimId
  });
}

export async function deleteClaim(orgId: string, claimId: string): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/claims/delete', {
    orgId,
    claimId
  });
}

// Deposits functions
export async function loadDeposits(orgId: string): Promise<Deposit[]> {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/orgs/deposits/list', { orgId });
    if (result && Array.isArray(result)) {
      // Sort by createdAt descending (newest first)
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (error) {
    console.error('Failed to load deposits:', error);
    return [];
  }
}

export async function createDeposit(orgId: string, name: string, data: any): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/deposits/create', {
    orgId,
    name,
    data
  });
}

export async function modifyDeposit(orgId: string, depositId: string, data: any): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/deposits/modify', {
    orgId,
    depositId,
    data
  });
}

export async function approveDeposit(orgId: string, depositId: string): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/deposits/approve', {
    orgId,
    depositId
  });
}

export async function deleteDeposit(orgId: string, depositId: string): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/deposits/delete', {
    orgId,
    depositId
  });
}

// Shopping lists functions
export async function loadShoppingLists(orgId: string): Promise<ShoppingList[]> {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/orgs/shoppinglists/list', { orgId });
    if (result && Array.isArray(result)) {
      // Sort by createdAt descending, but keep auto-generated list at top
      return result.sort((a, b) => {
        // Auto-generated list always comes first
        if (a.name.toLowerCase().includes('auto-generated')) return -1;
        if (b.name.toLowerCase().includes('auto-generated')) return 1;
        // Then sort by createdAt descending
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
    return [];
  } catch (error) {
    console.error('Failed to load shopping lists:', error);
    return [];
  }
}

export async function createShoppingList(orgId: string, name: string, items: any[]): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/shoppinglists/create', {
    orgId,
    name,
    items
  });
}

export async function modifyShoppingList(orgId: string, listId: string, updateData: any): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/shoppinglists/modify', {
    orgId,
    listId,
    ...updateData
  });
}

export async function deleteShoppingList(orgId: string, listId: string): Promise<void> {
  await makeAuthenticatedRequest('/api/v1/orgs/shoppinglists/delete', {
    orgId,
    listId
  });
}

// User management functions
export async function listOrgUsers(orgId: string) {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/orgs/listusers', { organization: orgId });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to list org users:', error);
    return { success: false, error: error.message };
  }
}

export async function listUserNames(uuids: string[]) {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/users/listnames', { uuids });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to list user names:', error);
    return { success: false, error: error.message };
  }
}

export async function manageUsers(orgId: string, actions: any[]) {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/users/manage', { 
      organization: orgId, 
      actions 
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to manage users:', error);
    return { success: false, error: error.message };
  }
}

// Invite functions
export async function listInvites(orgId: string) {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/invites/list', { organization: orgId });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to list invites:', error);
    return { success: false, error: error.message };
  }
}

export async function createInvite(orgId: string, role: 'member' | 'admin') {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/invites/create', { 
      organization: orgId, 
      inviterole: role 
    });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to create invite:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteInvite(inviteCode: string) {
  try {
    const result = await makeAuthenticatedRequest('/api/v1/invites/delete', { invitecode: inviteCode });
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to delete invite:', error);
    return { success: false, error: error.message };
  }
}

// Utility functions
export function hasDirectoryAccess(): boolean {
  return true; // Always return true since we're using backend
}

export async function requestDirectoryAccess(): Promise<boolean> {
  return true; // Always return true since we're using backend
}

export function clearVexPartsCache(): void {
  // No-op since we fetch from URL each time
}
