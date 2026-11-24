import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, RefreshCw, Upload, Loader2, Info } from 'lucide-react';
import { useOS } from '../lib/OSContext';

export function Inventory() {
  const { selectedBusiness } = useOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('operator_token');
      const res = await fetch(`/api/inventory/${selectedBusiness}`, {
        headers: { 'x-user-id': token || 'demo' }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInventoryItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      fetchInventory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedBusiness) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').slice(1).map(row => {
        const [name, sku, price, cost, stockQuantity, reorderPoint] = row.split(',');
        return { 
          name, 
          sku, 
          price: parseFloat(price) || 0,
          cost: parseFloat(cost) || 0,
          stockQuantity: parseInt(stockQuantity) || 0,
          reorderPoint: parseInt(reorderPoint) || 0,
          reservedQuantity: 0
        };
      }).filter(r => r.name);

      try {
        const res = await fetch(`/api/inventory/upload-csv/${selectedBusiness}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows })
        });
        const data = await res.json();
        if (data.success) {
          alert('Inventory Synced Successfully!');
          fetchInventory();
        }
      } catch (err) {
        alert('Failed to upload Inventory CSV');
      } finally {
        setUploading(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Inventory Intelligence</h1>
          <p className="text-muted-foreground mt-2">Manage stock levels, predict stockouts, and protect ad scaling (Phase 4).</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-colors cursor-pointer shadow-sm">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV (Name,SKU,Price,Cost,Stock,Reorder)
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {!selectedBusiness ? (
        <div className="p-8 text-center border border-border border-dashed rounded-2xl bg-card">
          <p className="text-muted-foreground">Select a brand from the sidebar to view inventory.</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4">
            {filteredItems.map(item => {
              const available = Math.max(0, item.stockQuantity - item.reservedQuantity);
              const isLowStock = available <= item.reorderPoint;
              const isOut = available === 0;

              return (
                <div key={item.id} className={`p-6 rounded-2xl border bg-card shadow-sm transition-all ${isLowStock ? 'border-amber-500/30' : 'border-border'}`}>
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-xl shrink-0 flex items-center justify-center ${isOut ? 'bg-rose-500/10 text-rose-500' : isLowStock ? 'bg-amber-500/10 text-amber-500' : 'bg-primary/10 text-primary'}`}>
                        <Package className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                        
                        {isLowStock && (
                          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 text-xs font-semibold uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {isOut ? 'Stockout Detected' : 'High Stockout Risk'}
                          </div>
                        )}
                        {isLowStock && (
                          <p className="text-xs text-rose-400 mt-2 flex items-start gap-1">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            Warning: Do not scale campaigns for this product. Needs manual review or restock.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-8 items-center bg-[#1a1a1a] p-4 rounded-xl border border-[#333]">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Total Stock</p>
                        <p className="text-xl font-bold text-white">{item.stockQuantity}</p>
                      </div>
                      <div className="w-px h-8 bg-[#333]"></div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Available</p>
                        <p className={`text-xl font-bold ${isOut ? 'text-rose-500' : isLowStock ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {available}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-[#333]"></div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-1">Reorder Point</p>
                        <p className="text-xl font-bold text-gray-400">{item.reorderPoint}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredItems.length === 0 && (
              <div className="text-center py-12 border border-[#333] border-dashed rounded-xl bg-[#1a1a1a]">
                <Package className="w-12 h-12 text-[#444] mx-auto mb-4" />
                <p className="text-gray-400">No inventory found. Import a CSV to begin tracking.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
