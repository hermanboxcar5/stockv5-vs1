
// File System Access API utilities for storing inventory data
let directoryHandle: FileSystemDirectoryHandle | null = null;

// Cache for VEX parts data
let vexPartsCache: VexPartsData | null = null;
let vexPartsCachePromise: Promise<VexPartsData> | null = null;

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
  inventoryStock: number; // This is our inventory count, separate from the boolean stock from VEX
}

export interface WarehouseData {
  [sku: string]: WarehouseItem;
}

export interface ClaimItem {
  sku: string;
  name: string;
  quantity: number;
}

export interface Claim {
  id: string;
  teamName: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  items: ClaimItem[];
  canFulfill: boolean;
}

export interface Deposit {
  id: string;
  teamName: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected';
  items: ClaimItem[];
}

export interface ShoppingListItem extends ClaimItem {
  price: string;
  url: string;
  stock: boolean;
}

export interface ShoppingList {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  items: ShoppingListItem[];
  totalCost: number;
}

// Request directory access from user
export async function requestDirectoryAccess(): Promise<boolean> {
  try {
    if ('showDirectoryPicker' in window) {
      directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      return true;
    } else {
      throw new Error('File System Access API not supported');
    }
  } catch (error) {
    console.error('Failed to access directory:', error);
    return false;
  }
}

// Check if directory is accessible
export function hasDirectoryAccess(): boolean {
  return directoryHandle !== null;
}

// Generic file read function
async function readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  if (!directoryHandle) {
    return defaultValue;
  }

  try {
    const fileHandle = await directoryHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (error) {
    // File doesn't exist, return default
    return defaultValue;
  }
}

// Generic file write function
async function writeJsonFile<T>(filename: string, data: T): Promise<void> {
  if (!directoryHandle) {
    throw new Error('No directory access');
  }

  try {
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (error) {
    console.error(`Failed to write ${filename}:`, error);
    throw error;
  }
}

// VEX Parts data functions - now fetches from URL with caching
export async function loadVexParts(): Promise<VexPartsData> {
  // If we already have cached data, return it immediately
  if (vexPartsCache) {
    console.log('Using cached VEX parts data');
    return vexPartsCache;
  }

  // If there's already a fetch in progress, wait for it
  if (vexPartsCachePromise) {
    console.log('Waiting for existing VEX parts fetch');
    return vexPartsCachePromise;
  }

  // Start a new fetch and cache the promise
  console.log('Fetching VEX parts data from URL');
  vexPartsCachePromise = fetchVexPartsData();
  
  try {
    vexPartsCache = await vexPartsCachePromise;
    return vexPartsCache;
  } catch (error) {
    // Reset the promise on error so we can retry
    vexPartsCachePromise = null;
    throw error;
  }
}

async function fetchVexPartsData(): Promise<VexPartsData> {
  try {
    const response = await fetch('/vex.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch VEX parts data:', error);
    return {};
  }
}

// Function to clear cache if needed (for manual refresh)
export function clearVexPartsCache(): void {
  vexPartsCache = null;
  vexPartsCachePromise = null;
}

export async function saveVexParts(data: VexPartsData): Promise<void> {
  return writeJsonFile('vex-parts.json', data);
}

// Warehouse data functions
export async function loadWarehouse(): Promise<WarehouseData> {
  return readJsonFile<WarehouseData>('warehouse.json', {});
}

export async function saveWarehouse(data: WarehouseData): Promise<void> {
  return writeJsonFile('warehouse.json', data);
}

// Claims data functions
export async function loadClaims(): Promise<Claim[]> {
  return readJsonFile<Claim[]>('claims.json', []);
}

export async function saveClaims(data: Claim[]): Promise<void> {
  return writeJsonFile('claims.json', data);
}

// Deposits data functions
export async function loadDeposits(): Promise<Deposit[]> {
  return readJsonFile<Deposit[]>('deposits.json', []);
}

export async function saveDeposits(data: Deposit[]): Promise<void> {
  return writeJsonFile('deposits.json', data);
}

// Shopping lists data functions
export async function loadShoppingLists(): Promise<ShoppingList[]> {
  return readJsonFile<ShoppingList[]>('shopping-lists.json', []);
}

export async function saveShoppingLists(data: ShoppingList[]): Promise<void> {
  return writeJsonFile('shopping-lists.json', data);
}

// Upload VEX parts JSON file - now deprecated since we fetch from URL
export async function uploadVexPartsFile(): Promise<boolean> {
  console.log('VEX parts are now automatically fetched from URL');
  return true;
}
