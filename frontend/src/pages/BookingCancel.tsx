import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCcw, ArrowLeft } from 'lucide-react';

export default function BookingCancel() {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto py-20 px-4">
      <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-premium text-center space-y-6">
        <div className="bg-amber-50 border border-amber-100 text-amber-500 p-4 rounded-full w-fit mx-auto">
          <AlertTriangle className="h-10 w-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Checkout Cancelled</h1>
          <p className="text-xs font-semibold text-slate-400 max-w-xs mx-auto leading-relaxed">
            Your transaction was not completed. The reservation has been suspended and spot locks will release in a few minutes.
          </p>
        </div>

        <div className="space-y-3 pt-4">
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3.5 rounded-2xl shadow transition hover-lift flex items-center justify-center space-x-1 text-sm"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          
          <Link
            to="/search"
            className="w-full bg-slate-550 border border-slate-100 text-slate-700 hover:bg-slate-50 font-semibold py-3.5 rounded-2xl transition flex items-center justify-center space-x-1 text-xs"
          >
            <ArrowLeft className="h-4 w-4 text-slate-400" />
            <span>Back to Search</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
