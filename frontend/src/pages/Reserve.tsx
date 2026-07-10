import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { API_URL, useAuthStore } from '../store/authStore';
import { MapPin, Calendar, Clock, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';

interface LotSummary {
  name: string;
  address: string;
  city: string;
  pricePerHour: number;
}

export default function Reserve() {
  const { lotId, spotId } = useParams<{ lotId: string; spotId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();

  const startTime = searchParams.get('startTime') || '';
  const endTime = searchParams.get('endTime') || '';

  const [lot, setLot] = useState<LotSummary | null>(null);
  const [spotNumber, setSpotNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch lot details & spot number
  useEffect(() => {
    const fetchCheckoutInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const lotRes = await fetch(`${API_URL}/lots/${lotId}`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        
        // Fetch spots to get the spotNumber
        const spotsRes = await fetch(
          `${API_URL}/lots/${lotId}/spots?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          }
        );

        if (lotRes.ok && spotsRes.ok) {
          const lotData = await lotRes.json();
          const spotsData = await spotsRes.json();
          const selectedSpot = spotsData.find((s: any) => s.id === spotId);

          setLot(lotData);
          if (selectedSpot) {
            setSpotNumber(selectedSpot.spotNumber);
          } else {
            setError('Chosen spot is no longer available or was not found.');
          }
        } else {
          setError('Failed to fetch checkout details.');
        }
      } catch (err) {
        console.error('Checkout fetch error:', err);
        setError('Network error fetching checkout details.');
      } finally {
        setLoading(false);
      }
    };

    if (lotId && spotId) fetchCheckoutInfo();
  }, [lotId, spotId, startTime, endTime, accessToken]);

  const handlePayClick = async () => {
    setBookingLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          lotId,
          spotId,
          startTime,
          endTime,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect user to Stripe Checkout url
        console.log('Redirecting to payment URL:', data.paymentUrl);
        window.location.href = data.paymentUrl;
      } else {
        setError(data.message || 'Failed to initiate reservation checkout.');
      }
    } catch (err) {
      console.error('Create booking error:', err);
      setError('A network error occurred. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500 font-sans">Preparing checkout billing receipt...</p>
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 border border-dashed border-red-200 bg-red-50 text-red-600 rounded-3xl text-center">
        <p className="font-extrabold text-lg">{error || 'Checkout details not found.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-semibold"
        >
          Go Back
        </button>
      </div>
    );
  }

  const durationHours = Math.ceil((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60));
  const totalPrice = lot.pricePerHour * durationHours;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-extrabold text-slate-200 tracking-tight">Review Reservation</h1>
        <p className="text-xs font-semibold text-slate-500">Please review your reservation parameters before paying.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-premium overflow-hidden text-slate-100">
        {/* Upper Banner: Lot Summary */}
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">{lot.name}</h2>
            <p className="text-xs text-indigo-200 flex items-center space-x-0.5">
              <MapPin className="h-3.5 w-3.5" />
              <span>{lot.address}, {lot.city}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-indigo-200 font-extrabold uppercase block">Spot</span>
            <span className="text-2xl font-black bg-indigo-500 border border-indigo-400 px-3 py-1 rounded-xl">
              {spotNumber}
            </span>
          </div>
        </div>

        {/* Schedule Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <Calendar className="h-5 w-5 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Arrival Time</span>
              <span className="text-sm font-bold text-slate-200">{new Date(startTime).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
            <Clock className="h-5 w-5 text-indigo-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Departure Time</span>
              <span className="text-sm font-bold text-slate-200">{new Date(endTime).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Billing details */}
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Billing Summary</h3>
          <div className="space-y-2 text-sm text-slate-300 font-semibold">
            <div className="flex justify-between">
              <span>Hourly Rate</span>
              <span>₹{Number(lot.pricePerHour).toFixed(2)}/hr</span>
            </div>
            <div className="flex justify-between">
              <span>Total Hours Reserved</span>
              <span>{durationHours} hrs</span>
            </div>
            <hr className="border-slate-800" />
            <div className="flex justify-between text-base font-black text-slate-200">
              <span>Total Price</span>
              <span className="text-indigo-400 text-lg">₹{totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Security & Checkout CTA */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-1 text-slate-500 text-xs font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Secure Demo Payment. No real credit card or funds required.</span>
          </div>

          <button
            onClick={handlePayClick}
            disabled={bookingLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl shadow-premium transition hover-lift flex items-center justify-center space-x-1"
          >
            {bookingLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                <span>Confirm & Pay ₹{totalPrice.toFixed(2)} (Demo)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
