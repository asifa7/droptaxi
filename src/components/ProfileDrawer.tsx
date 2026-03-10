import React, { useState } from 'react';
import { UserRole, AgentProfile } from '../types';
import { BRAND_NAME } from '../constants';
import { supabaseService } from '../supabaseClient';

const AppLogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor" aria-hidden="true">
    <path d="M 32 17 h -1.051 a 12.929 12.929 0 0 0 -3.088 -7.447 l 1.159 -1.159 a 0.999 0.999 0 1 0 -1.414 -1.414 l -1.159 1.159 A 12.926 12.926 0 0 0 19 5.051 V 4 a 1 1 0 1 0 -2 0 v 1.051 a 12.932 12.932 0 0 0 -7.448 3.088 L 8.487 7.073 a 0.999 0.999 0 1 0 -1.414 1.414 l 1.066 1.066 A 12.922 12.922 0 0 0 5.051 17 H 4 a 1 1 0 1 0 0 2 h 1.051 a 12.926 12.926 0 0 0 3.088 7.447 L 6.98 27.606 a 0.999 0.999 0 1 0 1.414 1.414 l 1.159 -1.159 A 12.929 12.929 0 0 0 17 30.949 V 32 a 1 1 0 1 0 2 0 v -1.051 a 12.931 12.931 0 0 0 7.447 -3.088 l 1.066 1.066 a 0.997 0.997 0 0 0 1.414 0 a 0.999 0.999 0 0 0 0 -1.414 l -1.066 -1.066 a 12.932 12.932 0 0 0 3.088 -7.448 H 32 A 1 1 0 1 0 32 17 Z m -5.552 -6.033 A 10.943 10.943 0 0 1 28.949 17 h -6.04 a 4.96 4.96 0 0 0 -0.707 -1.788 l 4.246 -4.245 Z M 19 7.051 a 10.954 10.954 0 0 1 6.034 2.501 l -4.22 4.22 A 4.964 4.964 0 0 0 19 13.001 v -5.95 Z M 21 17.9 c 0 1.654 -1.346 3 -3 3 s -3 -1.346 -3 -3 s 1.346 -3 3 -3 s 3 1.346 3 3 Z M 17 7.051 v 5.95 a 4.964 4.964 0 0 0 -1.814 0.771 l -4.22 -4.22 A 10.95 10.95 0 0 1 17 7.051 Z m -7.448 3.916 l 4.246 4.246 a 4.96 4.96 0 0 0 -0.707 1.788 h -6.04 a 10.94 10.94 0 0 1 2.501 -6.034 Z m 0 14.067 A 10.946 10.946 0 0 1 7.051 19 h 6.08 a 4.99 4.99 0 0 0 0.741 1.714 l -4.32 4.32 Z M 17 28.949 a 10.954 10.954 0 0 1 -6.034 -2.501 l 4.345 -4.345 a 4.96 4.96 0 0 0 1.688 0.697 v 6.149 Z m 2 0 v -6.15 a 4.96 4.96 0 0 0 1.688 -0.697 l 4.345 4.346 A 10.94 10.94 0 0 1 19 28.949 Z m 7.447 -3.915 l -4.32 -4.32 a 4.95 4.95 0 0 0 0.741 -1.715 h 6.08 a 10.936 10.936 0 0 1 -2.501 6.035 Z" />
  </svg>
);

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn: boolean;
  onToggleLogin: () => void;
  currentRole: UserRole;
  onToggleRole: () => void;
  agentProfile: AgentProfile | null;
  onUpdateAgent: (profile: AgentProfile) => void;
  onOpenWallet: () => void;
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
  onOpenWallet,
  userPhone
}) => {
  const [isRegisteringAgent, setIsRegisteringAgent] = useState(false);
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  const [loginStep, setLoginStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [isLoading, setIsLoading] = useState(false);
  const [criticalError, setCriticalError] = useState<{ code: string, message: string } | null>(null);

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
    const cleanPhone = phone.replaceAll(/\D/g, '');
    if (cleanPhone.length < 10) {
      setCriticalError({ code: 'CLIENT_ERROR', message: "Please enter a valid 10-digit mobile number." });
      return;
    }

    setIsLoading(true);
    try {
      await supabaseService.sendOTP(cleanPhone);
      setLoginStep('OTP');
    } catch (err: any) {
      console.error("OTP send failed:", err);
      setCriticalError({ code: 'GENERIC_ERROR', message: err.message || "SMS Provider Error." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setCriticalError(null);
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
      console.error("OTP verification failed:", err);
      setCriticalError({ code: 'AUTH_FAILED', message: "Invalid code." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoBypass = () => {
    onToggleLogin();
    setIsLoginFlow(false);
    setLoginStep('PHONE');
    onClose();
  };

  const handleAgentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAgent({
      name: formData.name,
      phone: formData.phone,
      vehicleNumber: formData.vNum,
      vehicleModel: formData.vModel,
      isVerified: false,
      balance: 0,
      totalEarnings: 0,
      commissionDue: 0,
      commissionPaid: 0,
      transactions: []
    });
    setIsRegisteringAgent(false);
    onToggleRole();
  };

  const renderUserInfo = () => {
    if (currentRole === UserRole.DRIVER) return agentProfile?.name || 'Agent';
    if (isLoggedIn) return userPhone || 'Member';
    return 'Guest';
  };

  const renderUserStatus = () => {
    if (currentRole === UserRole.DRIVER) return 'Active Agent';
    if (isLoggedIn) return 'Verified';
    return 'Ready to Ride';
  };

  const renderLoginForm = () => (
    <div className="animate-in slide-in-from-right duration-300 space-y-6">
      <button onClick={() => setIsLoginFlow(false)} className="text-slate-400 font-bold text-[10px] uppercase flex items-center hover:text-slate-900">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        Back to Menu
      </button>
      <h3 className="text-2xl font-black text-slate-900 uppercase">Sign In</h3>
      {criticalError && (
        <p className="p-3 bg-red-50 text-red-500 text-xs font-bold rounded-xl animate-in fade-in">
          {criticalError.message}
        </p>
      )}
      {loginStep === 'PHONE' ? (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="login-phone" className="text-[9px] font-black uppercase text-slate-400 ml-2">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm" aria-hidden="true">+91</span>
              <input id="login-phone" required type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replaceAll(/\D/g, ''))} className="w-full bg-white border border-slate-200 rounded-2xl p-4 pl-14 font-black" placeholder="9876543210" />
            </div>
          </div>
          <button disabled={isLoading} type="submit" className="w-full bg-slate-900 text-yellow-400 font-black py-4 rounded-2xl shadow-xl uppercase text-[11px] tracking-widest">
            {isLoading ? '...' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <input id="login-otp" required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-center text-3xl font-black tracking-[0.5em]" placeholder="••••••" aria-label="Enter 6-digit OTP" />
          <button type="submit" disabled={isLoading} className="w-full bg-yellow-400 text-slate-900 font-black py-4 rounded-2xl shadow-xl uppercase text-[11px] tracking-widest">
            {isLoading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </form>
      )}
      <button onClick={handleDemoBypass} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Try Demo Mode</button>
    </div>
  );

  const renderAgentSignupForm = () => (
    <div className="animate-in slide-in-from-right duration-300">
      <button onClick={() => setIsRegisteringAgent(false)} className="text-slate-400 font-bold text-[10px] uppercase mb-6 flex items-center">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        Back to Menu
      </button>
      <h3 className="text-xl font-black text-slate-900 uppercase mb-6">Agent Signup</h3>
      <form onSubmit={handleAgentSubmit} className="space-y-4">
        <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black" placeholder="Full Name" />
        <input required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black" placeholder="Mobile" />
        <input required value={formData.vNum} onChange={e => setFormData({ ...formData, vNum: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black" placeholder="Vehicle No (TN 01 AT 1234)" />
        <input required value={formData.vModel} onChange={e => setFormData({ ...formData, vModel: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-black" placeholder="Vehicle Model" />
        <button type="submit" className="w-full bg-slate-900 text-yellow-400 font-black py-4 rounded-2xl shadow-xl uppercase text-[11px] tracking-widest mt-4">Start Earning</button>
      </form>
    </div>
  );

  const renderMenuItems = () => (
    <>
      {currentRole === UserRole.DRIVER && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Finance</h3>
          <div className="bg-white rounded-[2rem] p-2 shadow-sm border border-slate-100">
            <button onClick={onOpenWallet} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-yellow-50 transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center" aria-hidden="true">👛</div>
                <span className="font-bold text-slate-800 text-sm">My Wallet & Payouts</span>
              </div>
              <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Account</h3>
        <div className="bg-white rounded-[2rem] p-2 space-y-1 shadow-sm border border-slate-100">
          {isLoggedIn ? (
            <button onClick={() => supabaseService.signOut()} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-red-50 transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center" aria-hidden="true">🔓</div>
                <span className="font-bold text-red-600 text-sm">Sign Out</span>
              </div>
            </button>
          ) : (
            <button onClick={() => setIsLoginFlow(true)} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-yellow-100 transition-colors text-lg" aria-hidden="true">📱</div>
                <span className="font-bold text-slate-800 text-sm">Sign In via SMS</span>
              </div>
            </button>
          )}

          {!agentProfile && (
            <button onClick={() => setIsRegisteringAgent(true)} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors" aria-hidden="true">🚕</div>
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
  );

  const renderContent = () => {
    if (isLoginFlow) return renderLoginForm();
    if (isRegisteringAgent) return renderAgentSignupForm();
    return renderMenuItems();
  };

  return (
    <div className="fixed inset-0 z-[5000] flex">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 w-full h-full cursor-default"
        onClick={onClose}
        aria-label="Close menu"
      />

      <div className="relative w-[90%] max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-500 ease-out">
        <div className="p-8 pb-10 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-400/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>

          <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white z-10" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          <div className="flex items-center space-x-5 mb-8 relative z-10">
            <div className="w-20 h-20 rounded-[2rem] bg-yellow-400 flex items-center justify-center text-slate-900 shadow-2xl border-4 border-slate-800 rotate-3">
              <AppLogoIcon className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter truncate max-w-[180px]">
                {renderUserInfo()}
              </h2>
              <p className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.2em]">
                {renderUserStatus()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-3xl backdrop-blur-sm relative z-10">
            <div className="text-center">
              <p className="text-sm font-black">{currentRole === UserRole.DRIVER ? `₹${(agentProfile?.balance || 0)}` : '8'}</p>
              <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">{currentRole === UserRole.DRIVER ? 'Wallet' : 'Trips'}</p>
            </div>
            <div className="text-center border-x border-white/10">
              <p className="text-sm font-black">5.0</p>
              <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black">Lite</p>
              <p className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Plan</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto bg-slate-50">
          {renderContent()}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-yellow-400">
              <AppLogoIcon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-900">{BRAND_NAME}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDrawer;
