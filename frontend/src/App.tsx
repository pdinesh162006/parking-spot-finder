import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Search from './pages/Search';
import LotDetails from './pages/LotDetails';
import Reserve from './pages/Reserve';
import BookingSuccess from './pages/BookingSuccess';
import BookingCancel from './pages/BookingCancel';
import Dashboard from './pages/Dashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  const { checkAuth, isAuthenticated, accessToken, isLoading } = useAuthStore();
  const { connectSocket, disconnectSocket } = useSocketStore();

  // Check authentication on mount (attempt refresh token)
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Connect Socket.io when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connectSocket(accessToken);
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, accessToken, connectSocket, disconnectSocket]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center select-none animate-fade-in">
          {/* Logo Container */}
          <div className="relative flex flex-col items-center mb-6">
            {/* PSF green label tag */}
            <div className="bg-[#22c55e] text-white font-extrabold text-[11px] px-3.5 py-1 rounded-md tracking-wider mb-2 shadow-sm font-sans">
              PSF
            </div>
            {/* Blue Car Icon */}
            <div className="text-indigo-600">
              <svg className="h-20 w-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                <circle cx="7" cy="17" r="2" fill="currentColor" />
                <path d="M9 17h6" />
                <circle cx="17" cy="17" r="2" fill="currentColor" />
              </svg>
            </div>
          </div>
          
          {/* PARKING SPOT FINDER TEXT */}
          <h1 className="text-xl font-bold text-slate-800 tracking-widest font-sans uppercase">
            Parking Spot Finder
          </h1>
          
          {/* Progress bar */}
          <div className="w-40 h-1 bg-slate-100 rounded-full mt-8 overflow-hidden">
            <div className="w-full h-full bg-indigo-600 rounded-full animate-loading-bar" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />

        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/lots/:id" element={<LotDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Routes — any logged-in user */}
            <Route element={<ProtectedRoute />}>
              <Route path="/reserve/:lotId/:spotId" element={<Reserve />} />
              <Route path="/booking/success" element={<BookingSuccess />} />
              <Route path="/booking/cancel" element={<BookingCancel />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Driver-only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* Owner-only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
              <Route path="/owner" element={<OwnerDashboard />} />
            </Route>

            {/* Admin-only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Catch-all 404 */}
            <Route
              path="*"
              element={
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                  <h1 className="text-6xl font-black text-slate-200">404</h1>
                  <p className="text-sm font-bold text-slate-500">Page not found.</p>
                  <a href="/" className="text-indigo-600 hover:text-indigo-700 text-xs font-extrabold underline">
                    Return Home
                  </a>
                </div>
              }
            />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
