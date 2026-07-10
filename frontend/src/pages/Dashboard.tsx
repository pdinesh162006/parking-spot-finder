import { useState, useEffect } from 'react';
import ReservationCard, { ReservationItem } from '../components/ReservationCard';
import { API_URL, useAuthStore } from '../store/authStore';
import { Layers, Calendar, Clock, CheckSquare, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { accessToken } = useAuthStore();
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'ACTIVE' | 'PAST'>('UPCOMING');

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/reservations?limit=100`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations);
      } else {
        setError('Failed to fetch reservations list.');
      }
    } catch (err) {
      console.error('Fetch reservations error:', err);
      setError('Network error loading reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchReservations();
  }, [accessToken]);

  // Handle Cancellation
  const handleCancelBooking = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/reservations/${id}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        // Refresh local reservations
        fetchReservations();
      } else {
        alert(data.message || 'Failed to cancel reservation.');
      }
    } catch (err) {
      console.error('Cancel booking error:', err);
      alert('Error cancelling reservation.');
    }
  };

  // Handle Extension (Stripe Checkout redirect)
  const handleExtendBooking = async (id: string, newEndTime: string) => {
    try {
      const res = await fetch(`${API_URL}/reservations/${id}/extend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newEndTime }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect to new Stripe checkout session URL for difference
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.message || 'Failed to extend booking.');
      }
    } catch (err) {
      console.error('Extend booking error:', err);
      alert('Error extending booking.');
    }
  };

  // Filter reservations depending on tab selection
  const filteredReservations = reservations.filter((r) => {
    if (activeTab === 'UPCOMING') {
      return r.status === 'CONFIRMED';
    } else if (activeTab === 'ACTIVE') {
      return r.status === 'ACTIVE' || r.status === 'PENDING';
    } else {
      return r.status === 'COMPLETED' || r.status === 'CANCELLED';
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Driver Dashboard</h1>
        <p className="text-xs font-semibold text-slate-400">Manage your active tickets, review upcoming slots, and view histories.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 space-x-6 text-sm font-bold text-slate-400 shrink-0 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => setActiveTab('UPCOMING')}
          className={`flex items-center space-x-1.5 pb-1 transition ${
            activeTab === 'UPCOMING' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'hover:text-slate-600'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Upcoming</span>
        </button>
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex items-center space-x-1.5 pb-1 transition ${
            activeTab === 'ACTIVE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'hover:text-slate-600'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Active / Locked</span>
        </button>
        <button
          onClick={() => setActiveTab('PAST')}
          className={`flex items-center space-x-1.5 pb-1 transition ${
            activeTab === 'PAST' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'hover:text-slate-600'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Past / History</span>
        </button>
      </div>

      {/* List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
            <p className="text-sm font-semibold text-slate-500">Retrieving reservations...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center border border-dashed border-red-200 bg-red-50 text-red-600 rounded-3xl">
            {error}
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl space-y-4">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-500">No reservations found in this section.</p>
            <Link
              to="/search"
              className="inline-flex bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow transition hover-lift"
            >
              <span>Search Available Parking</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        ) : (
          filteredReservations.map((res) => (
            <ReservationCard
              key={res.id}
              reservation={res}
              onCancel={handleCancelBooking}
              onExtend={handleExtendBooking}
            />
          ))
        )}
      </div>

    </div>
  );
}
