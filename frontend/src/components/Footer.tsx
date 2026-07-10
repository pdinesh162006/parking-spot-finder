import { Car, Mail, Phone, MapPin, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Value Props */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-extrabold text-2xl">
              <Car className="h-6 w-6 text-indigo-400" />
              <span>ParkEase</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time parking spot reservations with dynamic pricing and contact-free QR ticket scanning. Helping drivers find space quickly and efficiently.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/search" className="hover:text-indigo-400 transition">Search Parking</a></li>
              <li><a href="/dashboard" className="hover:text-indigo-400 transition">My Reservations</a></li>
              <li><a href="/profile" className="hover:text-indigo-400 transition">Account Profile</a></li>
            </ul>
          </div>

          {/* Company Info */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-indigo-400 transition">About Us</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Careers</a></li>
              <li><a href="#" className="hover:text-indigo-400 transition">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Support Contacts */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact & Support</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-indigo-400" />
                <span>support@parkease.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-indigo-400" />
                <span>+1 (555) PARKEASE</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-indigo-400" />
                <span>15 Anna Salai, Chennai, TN 600002</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p>© {new Date().getFullYear()} ParkEase Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="text-slate-500 hover:text-slate-400 transition">
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
