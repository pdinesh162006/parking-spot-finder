import { useState, useEffect } from 'react';
import { useAuthStore, API_URL } from '../store/authStore';
import { Shield, Users, IndianRupee, Activity, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface UserItem {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'DRIVER' | 'OWNER' | 'ADMIN';
  createdAt: string;
}

interface LotItem {
  id: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  owner: {
    name: string;
    email: string;
  };
}

interface StatsData {
  metrics: {
    totalUsers: number;
    totalLots: number;
    totalSpots: number;
    totalReservations: number;
    activeReservations: number;
  };
  revenue: {
    total: string;
    today: string;
    week: string;
    month: string;
  };
}

export default function AdminDashboard() {
  const { accessToken } = useAuthStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [lots, setLots] = useState<LotItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const lotsRes = await fetch(`${API_URL}/admin/lots`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const statsRes = await fetch(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (usersRes.ok && lotsRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const lotsData = await lotsRes.json();
        const statsData = await statsRes.json();

        setUsers(usersData);
        setLots(lotsData);
        setStats(statsData);
      } else {
        setError('Failed to retrieve admin control panel records.');
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
      setError('Network error loading administrative records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) fetchAdminData();
  }, [accessToken]);

  // Modify user role
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        alert('User role updated successfully.');
        fetchAdminData(); // Refresh records
      } else {
        alert('Failed to update user role.');
      }
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  // Toggle parking lot status
  const handleToggleLotStatus = async (lotId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_URL}/lots/${lotId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        alert('Parking lot status toggled successfully.');
        fetchAdminData();
      } else {
        alert('Failed to update lot status.');
      }
    } catch (err) {
      console.error('Toggle lot status error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500 font-sans">Booting administration systems...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 border border-dashed border-red-200 bg-red-50 text-red-600 rounded-3xl text-center">
        <p className="font-extrabold text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      
      {/* Title */}
      <div className="space-y-1 shrink-0">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-2">
          <Shield className="h-8 w-8 text-indigo-500" />
          <span>Admin Controls</span>
        </h1>
        <p className="text-xs font-semibold text-slate-400">Manage user roles, toggle lot activations, and monitor platform KPIs.</p>
      </div>

      {/* Stats Cards grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Total Users</span>
              <span className="text-2xl font-black text-slate-800">{stats.metrics.totalUsers}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Active Bookings</span>
              <span className="text-2xl font-black text-slate-800">{stats.metrics.activeReservations}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Revenue Today</span>
              <span className="text-2xl font-black text-slate-800">₹{stats.revenue.today}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-rose-50 rounded-2xl text-rose-600">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Revenue Month</span>
              <span className="text-2xl font-black text-slate-800">₹{stats.revenue.month}</span>
            </div>
          </div>
        </div>
      )}

      {/* User administration table */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
        <h2 className="text-lg font-bold text-slate-800">User Catalog</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Registered</th>
                <th className="p-4">Active Role</th>
                <th className="p-4 text-center">Modify</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-4 text-slate-800 font-bold">{u.name}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-indigo-700 font-extrabold uppercase">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none cursor-pointer bg-white"
                    >
                      <option value="DRIVER">Driver</option>
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lots approval / activation queue */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm space-y-4 p-6">
        <h2 className="text-lg font-bold text-slate-800">Parking Lots Queue</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                <th className="p-4">Lot Name</th>
                <th className="p-4">Owner Name</th>
                <th className="p-4">Owner Email</th>
                <th className="p-4">Location</th>
                <th className="p-4 text-center">Toggle State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
              {lots.map((l) => (
                <tr key={l.id}>
                  <td className="p-4 text-slate-800 font-bold">{l.name}</td>
                  <td className="p-4">{l.owner.name}</td>
                  <td className="p-4 text-slate-400">{l.owner.email}</td>
                  <td className="p-4">{l.address}, {l.city}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleToggleLotStatus(l.id, l.isActive)}
                      className={`text-2xl transition focus:outline-none ${l.isActive ? 'text-indigo-600' : 'text-slate-300'}`}
                    >
                      {l.isActive ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
