import { useState } from 'react';
import { X, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string, name: string) => void;
}

const mockAccounts = [
  { name: 'Driver User 1', email: 'driver1@parkease.com', initials: 'D1', bg: 'bg-indigo-500' },
  { name: 'Driver User 2', email: 'driver2@parkease.com', initials: 'D2', bg: 'bg-emerald-500' },
  { name: 'John Owner', email: 'owner1@parkease.com', initials: 'JO', bg: 'bg-amber-500' },
  { name: 'Jane Owner', email: 'owner2@parkease.com', initials: 'JA', bg: 'bg-rose-500' },
];

export default function GoogleSignInModal({ isOpen, onClose, onSuccess }: GoogleSignInModalProps) {
  const [customMode, setCustomMode] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loadingAccount, setLoadingAccount] = useState<string | null>(null);
  const [loadingCustom, setLoadingCustom] = useState(false);

  if (!isOpen) return null;

  const handleSelectAccount = (acc: typeof mockAccounts[0]) => {
    setLoadingAccount(acc.email);
    setTimeout(() => {
      setLoadingAccount(null);
      onSuccess(acc.email, acc.name);
    }, 800);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setLoadingCustom(true);
    setTimeout(() => {
      setLoadingCustom(false);
      onSuccess(email, name);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glassmorphic Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-bold text-slate-700 tracking-wide font-sans">Sign in with Google</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">
              {customMode ? 'Enter Account Details' : 'Choose an account'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              to continue to <span className="font-bold text-indigo-600">ParkEase</span>
            </p>
          </div>

          {!customMode ? (
            <div className="space-y-3">
              {mockAccounts.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => handleSelectAccount(acc)}
                  disabled={loadingAccount !== null}
                  className="w-full flex items-center justify-between p-3.5 border border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-slate-200 transition text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${acc.bg} text-white flex items-center justify-center font-extrabold text-sm shadow-sm group-hover:scale-105 transition duration-200`}>
                      {acc.initials}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{acc.name}</h4>
                      <p className="text-xs text-slate-400 font-medium">{acc.email}</p>
                    </div>
                  </div>
                  {loadingAccount === acc.email ? (
                    <Loader2 className="h-4 w-4 text-indigo-500 animate-spin mr-1" />
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition duration-200">
                      Select
                    </span>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className="w-full flex items-center justify-center space-x-2 py-3.5 border border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 text-slate-500 hover:text-slate-700 text-xs font-bold transition"
              >
                <UserPlus className="h-4 w-4" />
                <span>Use another account</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane.doe@gmail.com"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomMode(false)}
                  className="w-1/2 flex items-center justify-center space-x-1 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 text-xs font-bold transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loadingCustom}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1 shadow-sm"
                >
                  {loadingCustom ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Continue</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer disclaimer */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100 text-[10px] text-slate-400 font-semibold leading-relaxed">
          To continue, Google will share your name, email address, language preference, and profile picture with ParkEase. Before using this app, you can review ParkEase's <span className="text-indigo-500 hover:underline cursor-pointer">Privacy Policy</span> and <span className="text-indigo-500 hover:underline cursor-pointer">Terms of Service</span>.
        </div>
      </div>
    </div>
  );
}
