import React, { useState, useEffect } from 'react';
import { Upload, Users, ShoppingBag, ArrowRight, DollarSign, Loader2 } from 'lucide-react';
import { useOS } from '../lib/OSContext';

const LEAD_STAGES = ['New', 'Contacted', 'Qualified', 'Meeting booked', 'Proposal', 'Won', 'Lost'];

export function CRM() {
  const { selectedBusiness } = useOS();
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [crmType, setCrmType] = useState<'lead' | 'ecommerce'>('lead');

  const fetchLeads = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('operator_token');
      const res = await fetch(`/api/crm/leads/${selectedBusiness}`, {
        headers: { 'x-user-id': token || 'demo' }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeads(data);
      }
    } catch (e) {
      console.error("Error fetching leads", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness) {
      fetchLeads();
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
        const [name, email, phone, stage, value, source] = row.split(',');
        return { name, email, phone, stage: stage?.trim() || 'New', value: parseFloat(value) || 0, source };
      }).filter(r => r.name || r.email);

      try {
        const res = await fetch(`/api/crm/upload-csv/${selectedBusiness}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'lead', rows })
        });
        const data = await res.json();
        if (data.success) {
          alert('CSV Uploaded Successfully!');
          fetchLeads();
        }
      } catch (err) {
        alert('Failed to upload CSV');
      } finally {
        setUploading(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (!selectedBusiness) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
        <h1 className="text-3xl font-serif tracking-tight">CRM & Pipeline</h1>
        <div className="p-8 text-center border border-border border-dashed rounded-2xl bg-card">
          <p className="text-muted-foreground">Select a brand from the sidebar to view CRM.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif tracking-tight">CRM & Pipeline</h1>
          <p className="text-muted-foreground mt-2">Manage customer journeys and lead stages (Phase 3 MVP)</p>
        </div>
        <div className="flex gap-2">
          <label className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 shadow-sm">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#333] flex gap-4">
        <button 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${crmType === 'lead' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}
          onClick={() => setCrmType('lead')}
        >
          <Users className="w-4 h-4" />
          Lead Gen Pipeline
        </button>
        <button 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${crmType === 'ecommerce' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400 hover:bg-[#2a2a2a]'}`}
          onClick={() => setCrmType('ecommerce')}
        >
          <ShoppingBag className="w-4 h-4" />
          E-commerce Orders
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : crmType === 'lead' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {LEAD_STAGES.map(stage => {
            const stageLeads = leads.filter(l => l.stage === stage);
            return (
              <div key={stage} className="min-w-[280px] flex-1 bg-[#1a1a1a] rounded-xl border border-[#333] flex flex-col max-h-[70vh]">
                <div className="p-4 border-b border-[#333] bg-[#222] rounded-t-xl flex justify-between items-center">
                  <h3 className="font-semibold text-white">{stage}</h3>
                  <span className="text-xs font-medium bg-black/50 text-gray-400 px-2 py-1 rounded-full">{stageLeads.length}</span>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No leads</p>
                  ) : (
                    stageLeads.map(lead => (
                      <div key={lead.id} className="bg-[#2a2a2a] p-3 rounded-lg border border-[#444] shadow-sm hover:border-indigo-500/50 transition-colors cursor-default">
                        <div className="font-medium text-white text-sm mb-1">{lead.name}</div>
                        <div className="text-xs text-gray-400 mb-2 truncate">{lead.email}</div>
                        <div className="flex justify-between items-center mt-3 border-t border-[#444] pt-2">
                          <span className="text-xs font-bold text-emerald-400 flex items-center">
                            <DollarSign className="w-3 h-3" />
                            {lead.value.toLocaleString()}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">{lead.source}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#1a1a1a] rounded-xl border border-[#333]">
          <ShoppingBag className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">E-commerce Orders Status</h2>
          <p className="text-gray-400">Order tracking and LTV features are being enabled for your workspace.</p>
        </div>
      )}
    </div>
  );
}
