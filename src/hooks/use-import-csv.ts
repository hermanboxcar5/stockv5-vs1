
type ImportItem = {
  sku: string;
  name: string;
  quantity: number;
};

export type CsvType = 'default' | 'onshape' | 'stockv5';

export type ImportConfig<T> = {
  prefix: string;
  list: T[];
  setList: (newList: T[]) => void;
  saveList: (newList: T[]) => Promise<void>;

  partData: Record<string, { name: string }>;
  stockData?: Record<string, { inventoryStock: number }>;

  /**
   * Choose parser based on CSV origin (optional; defaults to 'default')
   */
  csvType?: CsvType;

  /**
   * Create a single record via backend API
   */
  createRecord: (name: string, data: any) => Promise<void>;
};

export function useImportCsv<T>(config: ImportConfig<T>) {
  return async () => {
    const {
      prefix,
      list,
      setList,
      partData,
      stockData,
      createRecord,
      csvType = 'default'
    } = config;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      let items: ImportItem[] = [];

      switch (csvType) {
        case 'stockv5':
          // Format: sku,qty,team
          items = lines
            .slice(1)
            .map(l => l.split(',').map(s => s.trim()) as [string, string, string])
            .filter(([sku, qty]) => sku && qty && partData[sku])
            .map(([sku, qty]) => ({
              sku,
              name: partData[sku].name,
              quantity: parseInt(qty, 10) || 1
            }));
          break;

        case 'onshape':
          // Format: Item,Quantity,Part number,Description
          items = lines
            .slice(1)
            .map(l => l.split(',').map(s => s.trim()))
            .filter(cols => cols.length >= 3)
            .map(cols => {
              const qty = cols[1];
              const sku = cols[2];
              return [sku, qty] as [string, string];
            })
            .filter(([sku, qty]) => sku && qty && partData[sku])
            .map(([sku, qty]) => ({
              sku,
              name: partData[sku].name,
              quantity: parseInt(qty, 10) || 1
            }));
          break;

        case 'default':
        default:
          // Format: sku,qty,team
          items = lines
            .slice(1)
            .map(l => l.split(',').map(s => s.trim()) as [string, string, string])
            .filter(([sku, qty]) => sku && qty && partData[sku])
            .map(([sku, qty]) => ({
              sku,
              name: partData[sku].name,
              quantity: parseInt(qty, 10) || 1
            }));
          break;
      }

      if (!items.length) return;

      const today = new Date().toLocaleDateString();
      const existingCount = list.filter(
        (it: any) => it.name?.includes(`Imported ${prefix} ${today}`)
      ).length;

      const recordData = {
        teamName: `Imported ${prefix} ${today} ${existingCount + 1}`,
        submittedDate: new Date().toISOString().split('T')[0],
        items,
        // Add canFulfill for claims if stockData is available
        ...(stockData && prefix === 'Claim' ? {
          canFulfill: items.every(i =>
            (stockData[i.sku]?.inventoryStock || 0) >= i.quantity
          )
        } : {})
      };

      const recordName = `Imported ${prefix} ${today} ${existingCount + 1}`;
      
      // Create the record via backend API
      await createRecord(recordName, recordData);
      
      // Reload the list - the parent component will handle this
      console.log(`Created imported ${prefix} with ${items.length} items`);
    };

    input.click();
  };
}
