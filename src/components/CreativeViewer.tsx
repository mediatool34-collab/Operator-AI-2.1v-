import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface CreativeViewerProps {
  creative: any | null;
}

export function CreativeViewer({ creative }: CreativeViewerProps) {
  const [imgError, setImgError] = React.useState(false);

  // Reset error state when creative changes
  React.useEffect(() => {
    setImgError(false);
  }, [creative?.id, creative?.imageUrl]);

  if (!creative) {
    return (
      <div className="glass-panel rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
        <ImageIcon className="w-10 h-10 text-gray-600 mb-3" />
        <h3 className="text-white font-medium">No Creative Selected</h3>
        <p className="text-gray-500 text-sm mt-1">Select an ad or creative to view its assets.</p>
      </div>
    );
  }

  const showPlaceholder = !creative.imageUrl || imgError;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden h-full flex flex-col relative group">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <div className="p-5 border-b border-white/5 bg-[#111827]/50 relative z-10">
        <h2 className="font-bold text-white flex items-center gap-2">
          <div className="p-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <ImageIcon className="w-4 h-4 text-blue-400" />
          </div>
          Creative Assets
        </h2>
      </div>
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="space-y-6">
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Visual</h3>
            {!showPlaceholder ? (
              <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0B0F19] flex items-center justify-center relative group/img">
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-sm font-medium rounded-lg border border-white/20 transition-all">
                    View Full Size
                  </button>
                </div>
                <img 
                  src={creative.imageUrl} 
                  alt={creative.name || 'Creative'} 
                  className="max-w-full h-auto max-h-[400px] object-contain"
                  onError={() => setImgError(true)}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 flex flex-col items-center justify-center text-gray-500 min-h-[300px]">
                <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/5">
                  <ImageIcon className="w-8 h-8 opacity-40 text-gray-400" />
                </div>
                <p className="text-sm font-medium">No visual available</p>
                <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-tighter">The asset link may have expired or is unavailable</p>
              </div>
            )}
          </div>

          {creative.body && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Primary Text</h3>
              <div className="p-4 bg-[#111827]/50 rounded-xl border border-white/5 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {creative.body}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[#111827]/30 rounded-xl border border-white/5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Creative ID</h3>
              <p className="text-sm text-gray-300 font-mono mt-1">{creative.id}</p>
            </div>
            <div className="p-4 bg-[#111827]/30 rounded-xl border border-white/5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Platform</h3>
              <p className="text-sm text-gray-300 capitalize mt-1">{creative.platform}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
