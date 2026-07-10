import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { API_URL, useAuthStore } from '../store/authStore';
import { CheckCircle2, QrCode, Loader2, ArrowRight } from 'lucide-react';

interface BookingDetail {
  id: string;
  startTime: string;
  endTime: string;
  totalPrice: string;
  qrCodeImage?: string;
  lot: {
    name: string;
    address: string;
  };
  spot: {
    spotNumber: string;
  };
}

export default function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuthStore();
  const reservationId = searchParams.get('reservationId');

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reservation details to retrieve the generated base64 QR code image
  useEffect(() => {
    const fetchBookingDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/reservations/${reservationId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        } else {
          setError('Failed to fetch ticket info. Please check your Dashboard.');
        }
      } catch (err) {
        console.error('Fetch booking details error:', err);
        setError('Network error loading details.');
      } finally {
        setLoading(false);
      }
    };

    if (reservationId && accessToken) {
      fetchBookingDetails();
    }
  }, [reservationId, accessToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500">Generating gate ticketing credentials...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto mt-16 bg-white p-8 rounded-3xl border border-slate-100 shadow-premium text-center space-y-4">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-full w-fit mx-auto">
          <QrCode className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">Checkout Success</h2>
        <p className="text-xs font-semibold text-slate-400">Payment succeeded! However, we could not fetch ticket details immediately. Please check your dashboard.</p>
        <Link to="/dashboard" className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      
      {/* Visual Header Success */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-premium text-center flex flex-col items-center space-y-4">
        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-full text-emerald-500 animate-bounce">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Reservation Confirmed</h1>
          <p className="text-xs font-semibold text-slate-400 mt-1">Your parking spot has been secured.</p>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-center items-center w-full max-w-[240px] shadow-inner">
          {booking.qrCodeImage ? (
            <img src={booking.qrCodeImage} alt="Entry Gate Ticket" className="h-44 w-44" />
          ) : (
            <div className="h-44 w-44 flex items-center justify-center text-slate-400 text-xs font-bold">QR Token Pending</div>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center space-x-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
          <QrCode className="h-3.5 w-3.5" />
          <span>Gate Ticket</span>
        </span>
      </div>

      {/* Booking Details Summary */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-50 pb-2">Booking Summary</h3>
        
        <div className="space-y-3 text-xs text-slate-600 font-semibold">
          <div className="flex items-start justify-between">
            <span className="text-slate-400">Location:</span>
            <div className="text-right">
              <p className="text-slate-800 font-extrabold">{booking.lot.name}</p>
              <p className="text-[10px] text-slate-400">{booking.lot.address}</p>
            </div>
          </div>
          
          <div className="flex justify-between">
            <span className="text-slate-400">Spot Number:</span>
            <span className="text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{booking.spot.spotNumber}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Total Price:</span>
            <span className="text-slate-800 font-extrabold">₹{Number(booking.totalPrice).toFixed(2)}</span>
          </div>

          <hr className="border-slate-50" />

          <div className="flex justify-between">
            <span className="text-slate-400">Arrival:</span>
            <span className="text-slate-700">{new Date(booking.startTime).toLocaleString()}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">Departure:</span>
            <span className="text-slate-700">{new Date(booking.endTime).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Button Navigate */}
      <Link
        to="/dashboard"
        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-4 rounded-2xl shadow transition hover-lift text-sm tracking-wide flex items-center justify-center space-x-1"
      >
        <span>Go to Dashboard</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
