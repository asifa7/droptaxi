
import React, { useState, useEffect } from 'react';
import { BRAND_NAME, COMPANY_VPA } from '../constants';

interface PaymentGatewayProps {
  amount: number;
  bookingId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentGateway: React.FC<PaymentGatewayProps> = ({ amount, bookingId, onSuccess, onCancel }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  const upiLink = `upi://pay?pa=${COMPANY_VPA}&pn=${encodeURIComponent(BRAND_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Booking-' + bookingId)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  const handleNativePay = () => {
    window.location.href = upiLink;
  };

  return (
    <div className="fixed inset-0 z-[6000] flex items-end justify-center animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onCancel}></div>
      
      <div className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom-20 duration-500">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8"></div>
        
        <div className="text-center space-y-2 mb-8">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Secure Checkout</p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">₹{amount.toLocaleString()}</h2>
          <p className="text-xs font-bold text-slate-500">Pay directly via any UPI App</p>
        </div>

        <div className="space-y-4">
          {isMobile ? (
            <div className="grid grid-cols-1 gap-3">
              <button onClick={handleNativePay} className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl flex items-center justify-center space-x-3 shadow-xl active:scale-95 transition-all">
                <span className="text-xl">📱</span>
                <span className="uppercase tracking-widest text-sm">Open UPI Apps</span>
              </button>
              
              <div className="flex justify-center space-x-4 opacity-50 grayscale mt-2">
                 <img src="https://img.icons8.com/color/48/google-pay.png" className="w-6 h-6" alt="GPay" />
                 <img src="https://img.icons8.com/color/48/phone-pe.png" className="w-6 h-6" alt="PhonePe" />
                 <img src="https://img.icons8.com/color/48/paytm.png" className="w-6 h-6" alt="Paytm" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-6 py-4 bg-slate-50 rounded-[2.5rem] border border-slate-100">
               <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100">
                  <img src={qrUrl} alt="UPI QR Code" className="w-40 h-40" />
               </div>
               <p className="text-[10px] font-black uppercase text-slate-400">Scan with GPay, PhonePe or Paytm</p>
            </div>
          )}

          <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 space-y-2">
             <div className="flex items-center space-x-2">
                <span className="text-blue-600">🛡️</span>
                <p className="text-[10px] font-black uppercase text-blue-900 tracking-tight">Direct Bank Transfer</p>
             </div>
             <p className="text-[10px] text-blue-700 font-bold leading-relaxed">
               This is a 0% fee transaction. Your payment goes directly to the agent.
             </p>
          </div>

          <div className="pt-4 space-y-3">
            <button onClick={onSuccess} className="w-full bg-yellow-400 text-slate-900 font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm active:scale-95 transition-all">
              I have completed payment
            </button>
            <button onClick={onCancel} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
              Cancel & Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentGateway;
