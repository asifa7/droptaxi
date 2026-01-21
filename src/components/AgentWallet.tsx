
import React, { useState } from 'react';
import { AgentProfile } from '../types';
import { COMMISSION_RATE } from '../constants';

interface AgentWalletProps {
   profile: AgentProfile;
   onWithdraw: (amount: number, upiId: string) => void;
   onClose: () => void;
}

const AgentWallet: React.FC<AgentWalletProps> = ({ profile, onWithdraw, onClose }) => {
   const [withdrawAmount, setWithdrawAmount] = useState('');
   const [upiId, setUpiId] = useState('');
   const [isWithdrawing, setIsWithdrawing] = useState(false);

   const handleWithdrawal = (e: React.FormEvent) => {
      e.preventDefault();
      const amt = Number.parseFloat(withdrawAmount);
      if (amt > profile.balance) {
         alert("Insufficient balance!");
         return;
      }
      if (amt < 500) {
         alert("Minimum withdrawal is ₹500");
         return;
      }
      onWithdraw(amt, upiId);
      setIsWithdrawing(false);
   };

   const getTransactionStyle = (type: string) => {
      switch (type) {
         case 'EARNING': return 'bg-green-100 text-green-600';
         case 'WITHDRAWAL': return 'bg-blue-100 text-blue-600';
         default: return 'bg-red-100 text-red-600';
      }
   };

   const getTransactionIcon = (type: string) => {
      switch (type) {
         case 'EARNING': return '💰';
         case 'WITHDRAWAL': return '🏦';
         default: return '📑';
      }
   };

   return (
      <div className="fixed inset-0 z-[7000] flex items-end justify-center animate-in fade-in duration-300">
         <button
            type="button"
            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md w-full h-full cursor-default"
            onClick={onClose}
            aria-label="Close wallet"
         />

         <div className="relative w-full max-w-lg bg-white rounded-t-[3rem] h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
            <div className="p-8 pb-4">
               <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
               <div className="flex justify-between items-start">
                  <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Agent Wallet</p>
                     <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">My Earnings</h2>
                  </div>
                  <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400" aria-label="Close">✕</button>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-8 hide-scrollbar">
               {/* Balance Card */}
               <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Available to Withdraw</p>
                  <h3 className="text-5xl font-black tracking-tighter mb-6">₹{profile.balance.toLocaleString()}</h3>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/5">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total Earned</p>
                        <p className="text-lg font-black text-yellow-400">₹{profile.totalEarnings.toLocaleString()}</p>
                     </div>
                     <div className="bg-white/5 p-4 rounded-2xl backdrop-blur-md border border-white/5">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Commission ({(COMMISSION_RATE * 100)}%)</p>
                        <p className="text-lg font-black text-red-400">₹{(profile.totalEarnings * COMMISSION_RATE).toLocaleString()}</p>
                     </div>
                  </div>
               </div>

               {isWithdrawing ? (
                  <form onSubmit={handleWithdrawal} className="space-y-4 animate-in zoom-in-95">
                     <div className="space-y-1">
                        <label htmlFor="withdraw-amt" className="text-[10px] font-black uppercase text-slate-400 ml-2">Amount to Withdraw (Min ₹500)</label>
                        <input id="withdraw-amt" required type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xl font-black outline-none focus:ring-2 focus:ring-yellow-400" placeholder="₹ 1,000" />
                     </div>
                     <div className="space-y-1">
                        <label htmlFor="upi-id" className="text-[10px] font-black uppercase text-slate-400 ml-2">UPI ID (e.g. mobile@upi)</label>
                        <input id="upi-id" required type="text" value={upiId} onChange={e => setUpiId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-yellow-400" placeholder="7200134807@ybl" />
                     </div>
                     <div className="grid grid-cols-2 gap-3 pt-4">
                        <button type="button" onClick={() => setIsWithdrawing(false)} className="bg-slate-100 text-slate-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest">Cancel</button>
                        <button type="submit" className="bg-slate-900 text-yellow-400 font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl">Submit Request</button>
                     </div>
                  </form>
               ) : (
                  <>
                     <button onClick={() => setIsWithdrawing(true)} className="w-full bg-yellow-400 text-slate-900 font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-xs flex items-center justify-center space-x-3 active:scale-95 transition-all">
                        <span>Withdraw Now</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                     </button>

                     <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Recent Activity</h4>
                        <div className="space-y-3">
                           {profile.transactions.length === 0 ? (
                              <div className="py-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">No transactions yet</div>
                           ) : (
                              profile.transactions.map((tx) => (
                                 <div key={tx.id} className="p-4 bg-slate-50 rounded-3xl flex items-center justify-between group hover:bg-white border border-slate-50 hover:border-slate-100 transition-all">
                                    <div className="flex items-center space-x-4">
                                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm ${getTransactionStyle(tx.type)}`}>
                                          {getTransactionIcon(tx.type)}
                                       </div>
                                       <div>
                                          <p className="text-xs font-black text-slate-900 truncate max-w-[150px]">{tx.description}</p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(tx.createdAt).toLocaleDateString()} • {tx.status}</p>
                                       </div>
                                    </div>
                                    <p className={`text-sm font-black ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                       {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                    </p>
                                 </div>
                              ))
                           )}
                        </div>
                     </div>
                  </>
               )}
            </div>
         </div>
      </div>
   );
};

export default AgentWallet;
