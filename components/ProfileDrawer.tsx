
import React, { useState } from 'react';
import { UserRole, AgentProfile } from '../types';
import { BRAND_NAME, LOGO_TEXT } from '../constants';
import { supabaseService } from '../supabaseClient';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onToggleLogin: () => void;
  currentRole: UserRole;
  onToggleRole: () => void;
  agentProfile: AgentProfile | null;
  onUpdateAgent: (profile: AgentProfile) => void;
  userPhone?: string;
}

const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  isOpen,
  onClose,
  isLoggedIn,
  onToggleLogin,
  currentRole,
  onToggleRole,
  agentProfile,
  onUpdateAgent,
  userPhone
}) => {
  const [isRegisteringAgent, setIsRegisteringAgent] = useState(false);
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  const [loginStep, setLoginStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [criticalError, setCriticalError] = useState<{code: string, message: string} | null>(null);
  
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vNum: '',
    vModel: ''
  });

  if (!isOpen) return null;

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriticalError(null);
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setCriticalError({ code: 'CLIENT_ERROR', message: "Please enter a valid 10-digit mobile number." });
      return;
    }
    
    setIsLoading(true);
    try {
      await supabaseService.sendOTP(cleanPhone);
      setLoginStep('OTP');
    } catch (err: any) {
      console.error("Login Error Catch:", err);
      const msg = err.message || "";
      
      if (msg.includes('20003') || msg.toLowerCase().includes('invalid username')) {
        setCriticalError({ 
          code: 'TWILIO_20003', 
          message: "Twilio Authentication Error. Your SID/Token in Supabase are incorrect." 
        });
      } else if (msg.includes('21608') || msg.toLowerCase().includes('unverified')) {
        setCriticalError({ 
          code: 'TWILIO_21608', 
          message: "Twilio Trial Limit: You must verify this phone number in your Twilio Console before sending SMS to it." 
        });
      } else {
        setCriticalError({ 
          code: 'GENERIC_ERROR', 
          message: msg || "SMS Provider Error. Please check your Supabase/Twilio logs." 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriticalError(null);
    if (otp.length < 6) {
      setCriticalError({ code: 'CLIENT_ERROR', message: "Please enter the 6-digit verification code." });
      return;
    }
    setIsLoading(true);
    try {
      const session = await supabaseService.verifyOTP(phone, otp);
      if (session) {
        onToggleLogin(); 
        setIsLoginFlow(false);
        setLoginStep('PHONE');
        onClose();
      }
    } catch (err: any) {
      setCriticalError({ code: 'AUTH_FAILED', message: "Invalid code. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoBypass = () => {
    onToggleLogin();
    setIsLoginFlow(false);
    setLoginStep('PHONE');
    setCriticalError(null);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await supabaseService.signOut();
      onClose();
    } catch (err: any) {
      alert("Error signing out.");
    }
  };

  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAgent({
      name: formData.name,
      phone: formData.phone,
      vehicleNumber: formData.vNum,
      vehicleModel: formData.vModel,
      isVerified: false
    });
    setIsRegisteringAgent(false);
    onToggleRole(); 
  };

  return (
    <div className="fixed inset-0 z-[5000] flex">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-[90%] max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-500 ease-out">
        <div className="p-8 pb-10 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          
          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white z-10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="flex items-center space-x-5 mb-8 relative z-10">
            <div className="w-20 h-20 rounded-[2rem] bg-yellow-400 flex items-center justify-center text-4xl shadow-2xl border-4 border-slate-800 rotate-3">
               {currentRole === UserRole.DRIVER ? '👨‍✈️' : (isLoggedIn ? '👤' : '🛞')}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter truncate max-w-[180px]">
                {currentRole === UserRole.DRIVER ? (agentProfile?.name || 'Agent') : (isLoggedIn ? (userPhone || 'Member') : 'Guest')}
              </h2>
              <div className="flex items-center space-x-1">
                 <p className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    {currentRole === UserRole.DRIVER ? 'Active Agent' : (isLoggedIn ? 'Verified' : 'Ready to Ride')}
                 </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-3xl backdrop-blur-sm relative z-10">
            <div className="text-center">
              <p className="text-sm font-black">{isLoggedIn ? '8' : '0'}</p>
              <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Trips</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-sm font-black">{isLoggedIn ? '5.0' : '-'}</p>
              <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black">Lite</p>
              <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Plan</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto bg-slate-50">
          {!isRegisteringAgent && !isLoginFlow ? (
            <>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Manage Account</h3>
                <div className="bg-white rounded-[2rem] p-2 space-y-1 shadow-sm border border-slate-100">
                  {isLoggedIn ? (
                    <button onClick={handleSignOut} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-red-50 transition-colors group">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">🔓</div>
                        <span className="font-bold text-red-600 text-sm">Sign Out</span>
                      </div>
                    </button>
                  ) : (
                    <button onClick={() => { setIsLoginFlow(true); setCriticalError(null); }} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-yellow-100 transition-colors text-lg">📱</div>
                        <span className="font-bold text-slate-800 text-sm">Sign In via SMS</span>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}

                  {!agentProfile && (
                    <button onClick={() => setIsRegisteringAgent(true)} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors">🚕</div>
                        <span className="font-bold text-slate-800 text-sm">Register as Agent</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Interface Mode</h3>
                <div className="p-1.5 bg-white rounded-[2rem] flex shadow-sm border border-slate-100">
                  <button onClick={() => currentRole !== UserRole.USER && onToggleRole()} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${currentRole === UserRole.USER ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400'}`}>
                    Passenger
                  </button>
                  <button 
                    disabled={!agentProfile && !isLoggedIn}
                    onClick={() => {
                      if (!agentProfile && !isLoggedIn) setIsRegisteringAgent(true);
                      else if (currentRole !== UserRole.DRIVER) onToggleRole();
                    }} 
                    className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${currentRole === UserRole.DRIVER ? 'bg-yellow-400 text-slate-900 shadow-xl' : 'text-slate-400'} ${(!agentProfile && !isLoggedIn) && 'opacity-30 cursor-not-allowed'}`}
                  >
                    Agent
                  </button>
                </div>
              </div>
            </>
          ) : isLoginFlow ? (
             <div className="animate-in slide-in-from-right duration-300 space-y-6">
                <button onClick={() => { setIsLoginFlow(false); setLoginStep('PHONE'); setCriticalError(null); }} className="text-slate-400 font-bold text-[10px] uppercase flex items-center hover:text-slate-900 transition-colors">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to Menu
                </button>
                
                <div className="space-y-1">
                   <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
                      {loginStep === 'PHONE' ? 'Step 1: Mobile' : 'Step 2: Verify'}
                   </h3>
                   <p className="text-xs text-slate-500 font-bold">
                      {loginStep === 'PHONE' ? 'Enter your 10-digit number for OTP.' : `Verify code sent to ${phone}`}
                   </p>
                </div>

                {criticalError ? (
                   <div className="p-8 bg-red-50/80 border border-red-100 rounded-[2.5rem] space-y-6 shadow-sm animate-in zoom-in-95">
                      <div className="w-14 h-14 bg-red-100/50 rounded-2xl flex items-center justify-center shadow-inner">
                         <span className="text-3xl">⚠️</span>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-lg font-black text-red-900 uppercase tracking-tight">Provider Error</h4>
                        <p className="text-xs text-red-700 leading-relaxed font-bold">
                          {criticalError.message}
                        </p>
                        {criticalError.code === 'TWILIO_21608' && (
                           <p className="text-[10px] text-red-800 font-black mt-2 bg-red-100 p-2 rounded-lg">
                             TIP: Go to Twilio.com > Phone Numbers > Verified Caller IDs and add your personal phone number there.
                           </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <button onClick={handleDemoBypass} className="w-full bg-[#0f172a] text-yellow-400 font-black py-5 rounded-2xl text-[11px] uppercase tracking-widest shadow-xl transform active:scale-[0.98] transition-all">
                          Skip SMS & Use Demo Mode
                        </button>
                        <button onClick={() => setCriticalError(null)} className="w-full bg-white text-slate-400 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-slate-200 shadow-sm active:bg-slate-50">
                          Try Again
                        </button>
                      </div>
                   </div>
                ) : (
                  <>
                    {loginStep === 'PHONE' ? (
                      <form onSubmit={handleSendOTP} className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Mobile Number</label>
                              <div className="relative">
                                 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">+91</span>
                                 <input required type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-yellow-400 transition-all pl-14 shadow-inner" placeholder="9876543210" />
                              </div>
                          </div>
                          <button disabled={isLoading || phone.length < 10} type="submit" className="w-full bg-slate-900 text-yellow-400 font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest mt-2 flex items-center justify-center disabled:opacity-50 transition-opacity text-[11px]">
                              {isLoading ? <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div> : 'Request Real OTP'}
                          </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOTP} className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Verification Code</label>
                              <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[0.5em] outline-none focus:ring-2 focus:ring-yellow-400 transition-all shadow-inner" placeholder="••••••" />
                          </div>
                          <button disabled={isLoading || otp.length < 6} type="submit" className="w-full bg-yellow-400 text-slate-900 font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest mt-2 flex items-center justify-center disabled:opacity-50">
                              {isLoading ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : 'Confirm & Log In'}
                          </button>
                          <button type="button" onClick={() => setLoginStep('PHONE')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest py-2 hover:text-slate-900 transition-colors">Change Mobile Number</button>
                      </form>
                    )}
                  </>
                )}
             </div>
          ) : (
            <div className="animate-in slide-in-from-right duration-300">
                <button onClick={() => setIsRegisteringAgent(false)} className="text-slate-400 font-bold text-[10px] uppercase mb-6 flex items-center hover:text-slate-900 transition-colors">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    Back to Menu
                </button>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Agent Registration</h3>
                <form onSubmit={handleAgentSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Your Name</label>
                        <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-yellow-400" placeholder="e.g. Arjun" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Mobile Number</label>
                        <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-yellow-400" placeholder="9876543210" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Vehicle Number</label>
                        <input required value={formData.vNum} onChange={e => setFormData({...formData, vNum: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-yellow-400" placeholder="TN 01 AT 1234" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Vehicle Model</label>
                        <input required value={formData.vModel} onChange={e => setFormData({...formData, vModel: e.target.value})} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black outline-none focus:ring-2 focus:ring-yellow-400" placeholder="Toyota Innova" />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-yellow-400 font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest mt-4">Complete Agent Profile</button>
                </form>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-yellow-400 text-sm shadow-lg">🛞</div>
             <p className="text-[10px] font-black uppercase text-slate-900 tracking-tighter">
               {BRAND_NAME} <span className="text-yellow-600">{LOGO_TEXT}</span>
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDrawer;
