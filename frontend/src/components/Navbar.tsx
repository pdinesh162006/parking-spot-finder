import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { Car, Bell, User, LogOut, Menu, X, Shield, Calendar, Layers } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { notifications, clearNotifications } = useSocketStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 border-b border-slate-800/80 shadow-premium text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-indigo-400 font-extrabold text-2xl tracking-tight">
              <Car className="h-8 w-8 text-indigo-500 animate-bounce" />
              <span>ParkEase</span>
            </Link>
            <div className="hidden md:block ml-10 flex items-baseline space-x-4">
              <Link to="/search" className="text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition">Find Parking</Link>
              {user?.role === 'DRIVER' && (
                <Link to="/dashboard" className="text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>My Bookings</span>
                </Link>
              )}
              {user?.role === 'OWNER' && (
                <Link to="/owner" className="text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-1">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span>Manage Lots</span>
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link to="/admin" className="text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition flex items-center space-x-1">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span>Admin Panel</span>
                </Link>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* Real-time Notifications Bell */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotif(!showNotif)}
                  className="relative p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-full transition focus:outline-none"
                >
                  <Bell className="h-6 w-6" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {showNotif && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 rounded-2xl shadow-premium py-2 z-50 border border-slate-800 max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
                      <span className="font-semibold text-slate-200">Notifications</span>
                      {notifications.length > 0 && (
                        <button onClick={clearNotifications} className="text-xs text-indigo-400 hover:text-indigo-300">Clear all</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">No new notifications</div>
                    ) : (
                      notifications.map((notif, idx) => (
                        <div key={idx} className="px-4 py-3 hover:bg-slate-850 border-b border-slate-850 text-sm">
                          <p className="text-slate-300 font-medium">{notif.message}</p>
                          <span className="text-xs text-slate-500">{new Date(notif.createdAt).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className="flex items-center space-x-4">
                <Link to="/profile" className="flex items-center space-x-2 text-slate-200 hover:text-indigo-400 font-medium transition">
                  <User className="h-5 w-5 text-slate-400" />
                  <span>{user.name}</span>
                  <span className="text-xs bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-full font-bold border border-indigo-900">
                    {user.role}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-slate-400 hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="text-slate-300 hover:text-indigo-400 px-3 py-2 text-sm font-medium transition">Log in</Link>
                <Link to="/register" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow transition hover-lift">Sign up</Link>
              </div>
            )}
          </div>

          <div className="flex md:hidden items-center">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-300 hover:bg-slate-900 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-slate-950 border-t border-slate-800 px-2 pt-2 pb-3 space-y-1">
          <Link to="/search" className="block text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium">Find Parking</Link>
          {user?.role === 'DRIVER' && (
            <Link to="/dashboard" className="block text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium">My Bookings</Link>
          )}
          {user?.role === 'OWNER' && (
            <Link to="/owner" className="block text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium">Manage Lots</Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="block text-slate-300 hover:text-indigo-400 px-3 py-2 rounded-md text-base font-medium">Admin Panel</Link>
          )}
          
          {user ? (
            <div className="pt-4 pb-1 border-t border-slate-800">
              <Link to="/profile" className="block text-slate-200 font-semibold px-3 py-2">{user.name} ({user.role})</Link>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center space-x-2 text-red-400 px-3 py-2 rounded-md text-base font-medium"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="pt-4 pb-2 border-t border-slate-800 space-y-2">
              <Link to="/login" className="block text-center text-slate-300 hover:text-indigo-400 px-3 py-2 text-base font-medium">Log in</Link>
              <Link to="/register" className="block text-center bg-indigo-600 text-white px-4 py-2 rounded-lg text-base font-medium">Sign up</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
