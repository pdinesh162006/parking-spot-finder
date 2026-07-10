import SearchBar from '../components/SearchBar';
import { Shield, Zap, QrCode, Star, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="space-y-20 pb-20">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        
        {/* Visual elements */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center relative z-10 space-y-8">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-400/20 px-4 py-2 rounded-full text-xs font-bold text-indigo-300 uppercase tracking-widest animate-pulse">
            <Star className="h-4 w-4 fill-indigo-400 text-indigo-400" />
            <span>Premium Chennai Parking Network</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-tight">
            Find & Reserve Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-200">Parking Spot</span> Instantly
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl font-medium leading-relaxed">
            Skip the circling. ParkEase helps you find, reserve, and secure parking spots across Chennai in real-time with dynamic rates and contact-free QR check-ins.
          </p>

          {/* SearchBar Widget overlay */}
          <div className="w-full pt-4 flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Value Propositions / Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">Why Choose ParkEase?</h2>
          <p className="text-slate-400 font-semibold max-w-xl mx-auto">Providing drivers with stress-free urban parking solutions through modern technologies.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Real-time */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-premium transition hover-lift space-y-4">
            <div className="p-3.5 bg-indigo-50 rounded-2xl w-fit">
              <Zap className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Live Space Sync</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              View live space layouts before arriving. Our Socket.io real-time engine ensures spot statuses are synchronized the split-second locks change.
            </p>
          </div>

          {/* Card 2: Cashless */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-premium transition hover-lift space-y-4">
            <div className="p-3.5 bg-emerald-50 rounded-2xl w-fit">
              <Shield className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Guaranteed Bookings</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Book in advance or lock the spot for 10 minutes while checking out. Pay securely via Stripe checkout and protect your spot.
            </p>
          </div>

          {/* Card 3: QR Code */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-premium transition hover-lift space-y-4">
            <div className="p-3.5 bg-slate-950 rounded-2xl w-fit">
              <QrCode className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Contact-Free Scanning</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
              Check-in seamlessly. Scanners verify reservation signatures (RS256 JWT) on entry, automatically updating your booking state.
            </p>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-8 md:p-12 text-white shadow-xl flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Own a Parking Lot?</h3>
            <p className="text-indigo-100 font-semibold text-sm sm:text-base">
              Partner with ParkEase to lease your vacant spots, manage pricing dynamically, and track revenue graphs on your customized dashboard.
            </p>
          </div>
          <Link
            to="/register"
            className="bg-white text-indigo-700 hover:bg-slate-50 px-6 py-4 rounded-2xl font-extrabold text-sm flex items-center space-x-1 transition shadow hover-lift shrink-0"
          >
            <span>Register as Owner</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}
