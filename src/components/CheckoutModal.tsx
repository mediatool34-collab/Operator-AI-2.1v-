import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Shield, Zap, Bitcoin, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface CheckoutModalProps {
  plan: {
    name: string;
    price: string;
    billing: string;
  } | null;
  onClose: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ plan, onClose }) => {
  const [step, setStep] = React.useState<'method' | 'processing' | 'success'>('method');
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);

  if (!plan) return null;

  const methods = [
    { id: 'card', name: 'Credit / Debit Card', icon: CreditCard, group: 'Global' },
    { id: 'fawry', name: 'Fawry Pay', icon: Shield, group: 'Local (Egypt)' },
    { id: 'vfcash', name: 'Vodafone Cash', icon: Zap, group: 'Local (Egypt)' },
    { id: 'instapay', name: 'Instapay / Bank Trans.', icon: CheckCircle2, group: 'Local (Egypt)' },
    { id: 'crypto', name: 'USDT / Bitcoin', icon: Bitcoin, group: 'Crypto' },
  ];

  const handleExecute = () => {
    if (!selectedMethod) return;
    setStep('processing');
    setTimeout(() => {
      setStep('success');
    }, 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="w-full max-w-xl bg-[#0B0F19] border border-white/5 rounded-[2.5rem] shadow-2xl shadow-blue-500/10 overflow-hidden"
        >
          <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tighter">Strategic Acquisition</h2>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Transaction Securing Protocol v4.2</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-8">
            {step === 'method' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-8 bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Target Protocol</div>
                      <div className="text-lg font-black">{plan.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black">${plan.price}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase">{plan.billing}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-8">
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Select Gateway</div>
                  {methods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left",
                        selectedMethod === method.id 
                          ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20" 
                          : "bg-white/5 border-white/5 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <method.icon className={cn("w-5 h-5", selectedMethod === method.id ? "text-white" : "text-blue-500")} />
                        <div>
                          <div className="text-sm font-bold">{method.name}</div>
                          <div className={cn("text-[8px] font-black uppercase tracking-[0.2em]", selectedMethod === method.id ? "text-blue-200" : "text-gray-500")}>
                            {method.group}
                          </div>
                        </div>
                      </div>
                      {selectedMethod === method.id && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleExecute}
                  disabled={!selectedMethod}
                  className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all disabled:opacity-20 flex items-center justify-center gap-3"
                >
                  Confirm & Execute Transaction <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-8" />
                <h3 className="text-xl font-black uppercase mb-2">Synchronizing with Gateway</h3>
                <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">
                  Encrypted handshake in progress. Do not refresh current protocol.
                </p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center text-white">
                <div className="w-20 h-20 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-8">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-3xl font-black uppercase mb-4 tracking-tighter">Access Authorized</h3>
                <p className="text-sm text-gray-400 font-medium mb-12 max-w-sm mx-auto leading-relaxed">
                  Plan activation sequence complete. Your institutional command terminal is now unlocked.
                </p>
                <button 
                  onClick={onClose}
                  className="w-full bg-green-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-green-600 transition-all"
                >
                  Enter Command Center
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
