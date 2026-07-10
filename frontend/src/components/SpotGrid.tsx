import { useState, useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';
import { useAuthStore } from '../store/authStore';
import { API_URL } from '../store/authStore';

interface Spot {
  id: string;
  spotNumber: string;
  type: 'STANDARD' | 'HANDICAP' | 'EV' | 'COMPACT' | 'LARGE';
  floor: number;
  isActive: boolean;
  status: 'free' | 'taken' | 'locked';
}

interface SpotGridProps {
  lotId: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  selectedSpotId: string | null;
  onSelectSpot: (spot: Spot) => void;
}

export default function SpotGrid({ lotId, startTime, endTime, selectedSpotId, onSelectSpot }: SpotGridProps) {
  const { socket, joinLot, leaveLot } = useSocketStore();
  const { accessToken } = useAuthStore();
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch spots on mount or when time range/lot changes
  useEffect(() => {
    const fetchSpots = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/lots/${lotId}/spots?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSpots(data);
        } else {
          setError('Failed to load parking spot layout.');
        }
      } catch (err) {
        console.error('Fetch spots error:', err);
        setError('Network error loading spots.');
      } finally {
        setLoading(false);
      }
    };

    fetchSpots();
  }, [lotId, startTime, endTime, accessToken]);

  // Join Socket.io room for live updates
  useEffect(() => {
    if (!socket) return;

    joinLot(lotId);

    // Listen to real-time updates
    const handleSpotsUpdated = (updatedSpots: Spot[]) => {
      console.log('[SOCKET EVENT] Received live spots update:', updatedSpots);
      setSpots(updatedSpots);
    };

    socket.on('spots-updated', handleSpotsUpdated);

    return () => {
      leaveLot(lotId);
      socket.off('spots-updated', handleSpotsUpdated);
    };
  }, [socket, lotId, joinLot, leaveLot]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
        <p className="text-sm text-slate-500 font-medium">Loading live spot layout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center border border-dashed border-red-200 bg-red-50 text-red-600 rounded-xl">
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  // Group spots by floor
  const floors = [...new Set(spots.map((s) => s.floor))].sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Legend indicator */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-100 justify-center">
        <div className="flex items-center space-x-1.5">
          <span className="h-4 w-4 bg-emerald-500 rounded border border-emerald-600"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-4 w-4 bg-amber-500 rounded border border-amber-600"></span>
          <span>Locking (10m)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-4 w-4 bg-rose-500 rounded border border-rose-600"></span>
          <span>Reserved</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-4 w-4 bg-white rounded border-2 border-indigo-600 border-dashed"></span>
          <span>Selected</span>
        </div>
      </div>

      {spots.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">No spots defined in this lot.</p>
      ) : (
        floors.map((floor) => {
          const floorSpots = spots.filter((s) => s.floor === floor);
          return (
            <div key={floor} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm">
              <h3 className="text-sm font-bold text-slate-600 mb-3 flex items-center space-x-1">
                <span>Floor {floor}</span>
              </h3>
              
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 gap-3">
                {floorSpots.map((spot) => {
                  const isSelected = selectedSpotId === spot.id;
                  const isTaken = spot.status === 'taken';
                  const isLocked = spot.status === 'locked';
                  
                  let bgClass = 'bg-emerald-50 border-emerald-500 text-emerald-800 hover:bg-emerald-100';
                  if (isTaken) {
                    bgClass = 'bg-rose-50 border-rose-300 text-rose-800 cursor-not-allowed';
                  } else if (isLocked) {
                    bgClass = 'bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed';
                  }
                  
                  if (isSelected) {
                    bgClass = 'bg-indigo-50 border-indigo-600 text-indigo-900 border-2 ring-2 ring-indigo-200 border-dashed';
                  }

                  return (
                    <button
                      key={spot.id}
                      type="button"
                      disabled={isTaken || isLocked}
                      onClick={() => onSelectSpot(spot)}
                      className={`h-14 border rounded-xl flex flex-col items-center justify-center transition font-semibold hover-lift text-xs ${bgClass}`}
                    >
                      <span className="font-extrabold text-sm">{spot.spotNumber}</span>
                      <span className="text-[9px] uppercase opacity-75">{spot.type}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
