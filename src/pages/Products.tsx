import React, { useState, useEffect } from 'react';
import { ShoppingBag, Search, RefreshCw, Upload, Loader2, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { useOS } from '../lib/OSContext';

export function Products() {
  const { selectedBusiness } = useOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('operator_token');
      const res = await fetch(`/api/inventory/${selectedBusiness}`, {
        headers: { 'x-user-id': token || 'demo' }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      fetchProducts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness]);

  const filteredProducts = products.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">Product Profitability</h1>
          <p className="text-muted-foreground mt-2">Analyze unit economics, contribution margins, and Break-even ROAS (Phase 4).</p>
        </div>
      </div>

      {!selectedBusiness ? (
        <div className="p-8 text-center border border-border border-dashed rounded-2xl bg-card">
          <p className="text-muted-foreground">Select a brand from the sidebar to view product intelligence.</p>
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
            <button onClick={fetchProducts} className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-white rounded-lg font-medium hover:bg-[#3a3a3a] transition-colors shadow-sm">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="grid gap-6">
            {filteredProducts.map(item => {
              // Financial calculations based on the rules:
              // Contribution margin before ads = Revenue (Price) - product cost - shipping - (let's say 2% payment fee & fulfillment estimated at 5%)
              const paymentFees = item.price * 0.02;
              const fulfillment = item.price * 0.05; // estimate
              const refundsEst = item.price * 0.03; // estimate
              
              const contributionMargin = item.price - item.cost - item.shippingCost - paymentFees - fulfillment - refundsEst;
              const contributionPercentage = item.price > 0 ? (contributionMargin / item.price) * 100 : 0;
              
              // Break-even ROAS = Revenue / contribution available for advertising
              const breakEvenRoas = contributionMargin > 0 ? (item.price / contributionMargin) : 0;
              
              const isUnprofitable = contributionMargin <= 0;

              return (
                <div key={item.id} className={`bg-card rounded-2xl border p-6 shadow-sm overflow-hidden relative ${isUnprofitable ? 'border-rose-500/30' : 'border-border'}`}>
                  {isUnprofitable && (
                     <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  )}
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground uppercase font-bold tracking-widest">Selling Price (AOV)</p>
                          <p className="text-2xl font-black text-white">${item.price.toFixed(2)}</p>
                        </div>
                      </div>

                      {isUnprofitable ? (
                        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex gap-3">
                          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-rose-400">Negative Unit Economics</p>
                            <p className="text-xs text-rose-300/80 mt-1">This product loses money before ad spend. Review COGS or shipping immediately. DO NOT advertise.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex gap-3">
                          <TrendingUp className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-emerald-400">Healthy Margin</p>
                            <p className="text-xs text-emerald-300/80 mt-1">Product yields ${contributionMargin.toFixed(2)} (${contributionPercentage.toFixed(1)}%) in margin per sale.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="lg:w-2/3 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#111] rounded-xl p-4 border border-[#333]">
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">COGS / Unit</p>
                        <p className="text-lg font-bold text-gray-300">${item.cost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Shipping (Est)</p>
                        <p className="text-lg font-bold text-gray-300">${item.shippingCost.toFixed(2)}</p>
                      </div>
                      <div className="bg-[#1a1a1a] p-3 -m-3 rounded-lg border border-[#333]">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Break-Even ROAS</p>
                        <p className={`text-xl font-black ${breakEvenRoas > 3 ? 'text-rose-400' : breakEvenRoas > 1.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {breakEvenRoas > 0 ? `${breakEvenRoas.toFixed(2)}x` : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-[#1a1a1a] p-3 -m-3 rounded-lg border border-[#333]">
                        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mb-1">Cont. Margin</p>
                        <p className={`text-xl font-black ${contributionMargin > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${contributionMargin.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 border border-[#333] border-dashed rounded-xl bg-[#1a1a1a]">
                <ShoppingBag className="w-12 h-12 text-[#444] mx-auto mb-4" />
                <p className="text-gray-400">No products found. Import inventory data first.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
