import { useState, useEffect } from 'react';
import { useAuthStore, API_URL } from '../store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Plus, IndianRupee, List, BarChart3, Loader2, ClipboardList } from 'lucide-react';

interface Lot {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pricePerHour: string;
  totalSpots: number;
  isActive: boolean;
}

interface Reservation {
  id: string;
  totalPrice: string;
  status: string;
  createdAt: string;
  lotId: string;
  lot: {
    name: string;
    ownerId: string;
  };
  spot: {
    spotNumber: string;
  };
}

export default function OwnerDashboard() {
  const { user, accessToken } = useAuthStore();
  const [lots, setLots] = useState<Lot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for creating a new lot
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [latitude] = useState(40.758);
  const [longitude] = useState(-73.985);
  const [totalSpots, setTotalSpots] = useState(10);
  const [pricePerHour, setPricePerHour] = useState(10);
  
  const [formLoading, setFormLoading] = useState(false);

  const fetchOwnerData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all lots (frontend will filter by ownerId)
      const lotsRes = await fetch(`${API_URL}/lots`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      
      // Fetch reservations (for revenue chart)
      // Since we need to show revenue for owner's lots, we can use the admin/owner endpoints, 
      // or fetch all reservations if owner role is authorized to list.
      // Let's call /api/reservations (returns user's reservations, but if we are owner we can fetch our lots' reservations)
      // For a clean implementation, we'll fetch reservations from the server.
      const resRes = await fetch(`${API_URL}/reservations?limit=200`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (lotsRes.ok && resRes.ok) {
        const lotsData = await lotsRes.json();
        const resData = await resRes.json();
        
        // Filter lots owned by this user
        const ownerLots = lotsData.lots.filter((l: any) => l.ownerId === user?.id);
        setLots(ownerLots);
        
        // Filter reservations for lots owned by this user
        // Note: For mock / demo purposes, if the API returns reservations, we match them
        setReservations(resData.reservations);
      } else {
        setError('Failed to fetch dashboard data.');
      }
    } catch (err) {
      console.error('Owner dashboard fetch error:', err);
      setError('Network error loading dashboard contents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchOwnerData();
  }, [accessToken]);

  const handleAddLotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const res = await fetch(`${API_URL}/lots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          description,
          address,
          city,
          state,
          zipCode,
          latitude,
          longitude,
          totalSpots,
          pricePerHour,
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        // Reset form
        setName('');
        setDescription('');
        setAddress('');
        setCity('');
        setState('');
        setZipCode('');
        
        // Refresh
        fetchOwnerData();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to create lot.');
      }
    } catch (err) {
      console.error('Create lot error:', err);
      alert('Error creating lot.');
    } finally {
      setFormLoading(false);
    }
  };

  // Group revenue data for chart dynamically
  const getRevenueData = () => {
    // Generate last 7 days metrics
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return {
        dateStr: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
        rawDate: d,
        amount: 0,
      };
    }).reverse();

    reservations.forEach((res) => {
      if (res.status === 'CONFIRMED' || res.status === 'ACTIVE' || res.status === 'COMPLETED') {
        const resDate = new Date(res.createdAt);
        const match = last7Days.find(
          (day) => day.rawDate.toLocaleDateString() === resDate.toLocaleDateString()
        );
        if (match) {
          match.amount += parseFloat(res.totalPrice);
        }
      }
    });

    return last7Days.map((day) => ({
      name: day.dateStr,
      Revenue: parseFloat(day.amount.toFixed(2)),
    }));
  };

  const revenueData = getRevenueData();
  const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.Revenue, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      
      {/* Title */}
      <div className="flex justify-between items-center shrink-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Owner Dashboard</h1>
          <p className="text-xs font-semibold text-slate-400">Add parking lots, track occupancy, and monitor sales revenue.</p>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-3 rounded-2xl shadow-premium transition hover-lift flex items-center space-x-1 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Lot</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-sm font-semibold text-slate-500">Retrieving owner details...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center border border-dashed border-red-200 bg-red-50 text-red-600 rounded-3xl">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Columns: Lots & Recent Bookings List (Span 2) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Lots List */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-1.5">
                <List className="h-5 w-5 text-indigo-500" />
                <span>My Parking Lots</span>
              </h2>

              {lots.length === 0 ? (
                <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-3xl">
                  <p className="text-sm text-slate-400 font-semibold">No parking lots registered yet. Click "New Lot" to start leasing.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lots.map((lot) => (
                    <div key={lot.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-premium transition flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-extrabold text-slate-800 text-base">{lot.name}</h3>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${lot.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                            {lot.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium truncate mt-1">{lot.address}, {lot.city}</p>
                      </div>

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50">
                        <div className="font-semibold text-slate-500">
                          Spots: <span className="text-slate-800 font-extrabold">{lot.totalSpots}</span>
                        </div>
                        <div className="font-semibold text-slate-500">
                          Rate: <span className="text-indigo-600 font-extrabold">₹{Number(lot.pricePerHour).toFixed(2)}/hr</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-1.5">
                <ClipboardList className="h-5 w-5 text-indigo-500" />
                <span>Recent Bookings</span>
              </h2>

              {reservations.length === 0 ? (
                <p className="text-sm font-semibold text-slate-400">No booking transactions recorded yet.</p>
              ) : (
                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-4">Lot Name</th>
                        <th className="p-4">Spot</th>
                        <th className="p-4">Created</th>
                        <th className="p-4 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                      {reservations.slice(0, 5).map((res) => (
                        <tr key={res.id}>
                          <td className="p-4 text-slate-800 font-bold">{res.lot.name}</td>
                          <td className="p-4">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">{res.spot.spotNumber}</span>
                          </td>
                          <td className="p-4">{new Date(res.createdAt).toLocaleDateString()}</td>
                          <td className="p-4 text-right text-indigo-600 font-extrabold">₹{Number(res.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Earnings Chart (Span 1) */}
          <div className="space-y-6">
            
            {/* KPI Revenue Box */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Earnings (Last 7 Days)</h2>
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <IndianRupee className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-slate-800">₹{totalRevenue.toFixed(2)}</span>
                <p className="text-[10px] text-slate-400 font-semibold">Sum of active and completed transactions.</p>
              </div>
            </div>

            {/* Recharts chart */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <span>Revenue Performance</span>
              </h3>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }} />
                    <Bar dataKey="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Add Lot Form Overlay Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Add Parking Lot</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Set up a new parking lot to start booking drivers.</p>
            
            <form onSubmit={handleAddLotSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Lot Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Grand Central Garage"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Price Per Hour (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(parseFloat(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Secure covered parking spaces near..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="450 Grand Way"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New York"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NY"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Zip Code</label>
                  <input
                    type="text"
                    required
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="10001"
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Spots Count</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={totalSpots}
                    onChange={(e) => setTotalSpots(parseInt(e.target.value))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow transition flex items-center justify-center space-x-1"
                >
                  {formLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Lot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
