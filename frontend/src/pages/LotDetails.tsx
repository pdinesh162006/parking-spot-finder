import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import SpotGrid from '../components/SpotGrid';
import { API_URL, useAuthStore } from '../store/authStore';
import { MapPin, Star, Zap, Calendar, Clock, Loader2, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    name: string;
  };
}

interface LotDetail {
  id: string;
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  pricePerHour: number;
  isSurge: boolean;
  amenities: string[];
  imageUrls: string[];
  avgRating: number | null;
  reviews: Review[];
}

export default function LotDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated } = useAuthStore();

  const [lot, setLot] = useState<LotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time selections
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = searchParams.get('startTime')?.split('T')[0] || tomorrow.toISOString().split('T')[0];
  const defaultStart = searchParams.get('startTime')?.split('T')[1]?.slice(0, 5) || '09:00';
  const defaultEnd = searchParams.get('endTime')?.split('T')[1]?.slice(0, 5) || '11:00';

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);

  const [selectedSpot, setSelectedSpot] = useState<any>(null);

  // Fetch lot details
  useEffect(() => {
    const fetchLotDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/lots/${id}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setLot(data);
        } else {
          setError('Failed to fetch parking lot details.');
        }
      } catch (err) {
        console.error('Fetch lot details error:', err);
        setError('Network error fetching lot details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLotDetail();
  }, [id, accessToken]);

  const handleSpotSelect = (spot: any) => {
    setSelectedSpot(spot);
  };

  const handleBookingRedirect = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/lots/${id}` } } });
      return;
    }

    if (!selectedSpot) return;

    const startISO = `${date}T${startTime}:00.000Z`;
    const endISO = `${date}T${endTime}:00.000Z`;

    navigate(
      `/reserve/${id}/${selectedSpot.id}?startTime=${encodeURIComponent(startISO)}&endTime=${encodeURIComponent(endISO)}`
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Retrieving parking details...</p>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 border border-dashed border-red-200 bg-red-50 text-red-600 rounded-3xl text-center">
        <p className="font-extrabold text-lg">{error || 'Parking lot not found.'}</p>
      </div>
    );
  }

  const startISOString = `${date}T${startTime}:00.000Z`;
  const endISOString = `${date}T${endTime}:00.000Z`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-10 text-slate-100">
      
      {/* Upper grid: Image carousel & Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* S3 / Unsplash Image display */}
        <div className="h-96 rounded-3xl overflow-hidden bg-slate-950 relative shadow-premium border border-slate-800">
          {lot.imageUrls && lot.imageUrls.length > 0 ? (
            <img src={lot.imageUrls[0]} alt={lot.name} className="w-full h-full object-cover opacity-90" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 font-semibold text-lg">No Images Available</div>
          )}
          
          {lot.isSurge && (
            <span className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full shadow flex items-center space-x-1 uppercase tracking-wider">
              <Zap className="h-3 w-3 fill-current animate-pulse" />
              <span>Surge Price Active</span>
            </span>
          )}
        </div>

        {/* Detailed text */}
        <div className="space-y-6 flex flex-col justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-200 tracking-tight">{lot.name}</h1>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-0.5 text-amber-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-sm font-bold text-slate-200">{lot.avgRating ? lot.avgRating.toFixed(1) : 'New'}</span>
              </div>
              <span className="text-slate-800">•</span>
              <div className="flex items-center text-slate-400 text-sm font-medium space-x-1">
                <MapPin className="h-4 w-4 text-slate-500" />
                <span>{lot.address}, {lot.city}, {lot.state} {lot.zipCode}</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed font-semibold">{lot.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Rate Per Hour</span>
              <span className="text-2xl font-black text-indigo-400">₹{Number(lot.pricePerHour).toFixed(2)}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-1 items-center">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block w-full">Amenities</span>
              {lot.amenities.slice(0, 3).map((am) => (
                <span key={am} className="text-[9px] font-bold bg-slate-950 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-800">
                  {am.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Spot Selection widget & Booking Configurator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Grid Selection): Span 2 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h2 className="text-xl font-extrabold text-slate-200">Select a Spot</h2>
            <p className="text-xs text-slate-500 font-semibold">Choose an available green spot from the layout below. Locked spots are currently in checkout.</p>
          </div>

          <SpotGrid
            lotId={lot.id}
            startTime={startISOString}
            endTime={endISOString}
            selectedSpotId={selectedSpot ? selectedSpot.id : null}
            onSelectSpot={handleSpotSelect}
          />
        </div>

        {/* Right Column: Time range details & Checkout trigger */}
        <div className="space-y-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-premium h-fit">
          <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Booking Configurator</h3>
          
          <div className="space-y-4">
            {/* Date */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSelectedSpot(null); // Reset selection when date shifts
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 text-slate-100"
              />
            </div>

            {/* Time Window */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Arrival</span>
                </label>
                <select
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setSelectedSpot(null);
                  }}
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer bg-slate-950 text-slate-100"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return (
                      <option key={`${hour}:00`} value={`${hour}:00`} className="bg-slate-900 text-slate-100">
                        {hour}:00
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1 flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Departure</span>
                </label>
                <select
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setSelectedSpot(null);
                  }}
                  className="w-full bg-slate-955 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer bg-slate-950 text-slate-100"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const hour = i.toString().padStart(2, '0');
                    return (
                      <option key={`${hour}:00`} value={`${hour}:00`} disabled={i <= parseInt(startTime.split(':')[0])} className="bg-slate-900 text-slate-100">
                        {hour}:00
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Summary */}
            {selectedSpot && (
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-2xl p-4 text-xs font-semibold text-slate-400 space-y-2">
                <p className="flex justify-between">
                  <span>Selected Spot:</span>
                  <span className="text-indigo-400 font-extrabold">{selectedSpot.spotNumber} ({selectedSpot.type})</span>
                </p>
                <p className="flex justify-between">
                  <span>Duration:</span>
                  <span>{Math.ceil((new Date(endISOString).getTime() - new Date(startISOString).getTime()) / (1000 * 60 * 60))} hours</span>
                </p>
                <hr className="border-indigo-900/50" />
                <p className="flex justify-between text-sm font-black text-slate-200">
                  <span>Total Amount:</span>
                  <span className="text-indigo-400">
                    ₹{Number(
                      lot.pricePerHour *
                        Math.ceil((new Date(endISOString).getTime() - new Date(startISOString).getTime()) / (1000 * 60 * 60))
                    ).toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            <button
              onClick={handleBookingRedirect}
              disabled={!selectedSpot}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl shadow transition hover-lift disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {selectedSpot ? 'Proceed to Reservation' : 'Select a Spot First'}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6">
        <div className="space-y-1 border-b border-slate-800 pb-3 flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-indigo-400" />
          <h2 className="text-xl font-extrabold text-slate-200">User Reviews</h2>
        </div>

        {lot.reviews.length === 0 ? (
          <p className="text-sm font-medium text-slate-500">No reviews yet for this parking lot.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lot.reviews.map((rev) => (
              <div key={rev.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-premium space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200">{rev.user.name}</span>
                  <div className="flex items-center text-amber-400 text-xs font-bold space-x-0.5">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{rev.rating}</span>
                  </div>
                </div>
                {rev.comment && <p className="text-xs text-slate-400 font-semibold leading-relaxed">{rev.comment}</p>}
                <span className="text-[10px] text-slate-500 block font-bold">{new Date(rev.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
