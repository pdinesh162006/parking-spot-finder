import { useState } from 'react';
import { Calendar, Clock, MapPin, QrCode, XCircle, ArrowUpRight, Loader2 } from 'lucide-react';

export interface ReservationItem {
  id: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  totalPrice: string;
  qrCode: string;
  qrCodeImage?: string;
  lot: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  spot: {
    spotNumber: string;
  };
}

interface ReservationCardProps {
  reservation: ReservationItem;
  onCancel: (id: string) => Promise<void>;
  onExtend: (id: string, newEndTime: string) => Promise<void>;
}

export default function ReservationCard({ reservation, onCancel, onExtend }: ReservationCardProps) {
  const [showQrModal, setShowQrModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [newEndTime, setNewEndTime] = useState('');
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingExtend, setLoadingExtend] = useState(false);

  // Status Badge configurations
  const statusConfig = {
    PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
    CONFIRMED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  const handleCancelClick = async () => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      setLoadingCancel(true);
      try {
        await onCancel(reservation.id);
      } finally {
        setLoadingCancel(false);
      }
    }
  };

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEndTime) return;
    
    setLoadingExtend(true);
    try {
      await onExtend(reservation.id, newEndTime);
      setShowExtendModal(false);
    } finally {
      setLoadingExtend(false);
    }
  };

  const isConfirmed = reservation.status === 'CONFIRMED';
  const isActive = reservation.status === 'ACTIVE';

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-premium transition duration-200 p-6 flex flex-col md:flex-row justify-between md:items-center space-y-4 md:space-y-0">
      
      {/* Left Column: Details */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2.5">
          <span className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${statusConfig[reservation.status]}`}>
            {reservation.status}
          </span>
          <span className="text-xs font-bold text-slate-400">ID: {reservation.id.slice(0, 8)}...</span>
        </div>

        <h3 className="text-lg font-bold text-slate-800 tracking-tight">{reservation.lot.name}</h3>

        <div className="flex items-center text-xs text-slate-500 font-medium space-x-1">
          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
          <span>{reservation.lot.address}, {reservation.lot.city}, {reservation.lot.state}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs pt-1">
          <div className="flex items-center space-x-2 text-slate-600 font-semibold bg-slate-50 px-3 py-2 rounded-xl">
            <Calendar className="h-4 w-4 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Start</span>
              <span>{new Date(reservation.startTime).toLocaleDateString()} {new Date(reservation.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-600 font-semibold bg-slate-50 px-3 py-2 rounded-xl">
            <Clock className="h-4 w-4 text-indigo-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">End</span>
              <span>{new Date(reservation.endTime).toLocaleDateString()} {new Date(reservation.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Spot, Price & Actions */}
      <div className="flex flex-col md:items-end space-y-4 md:pl-6 shrink-0 justify-between">
        <div className="flex justify-between md:flex-col md:items-end w-full">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spot Number</span>
            <span className="text-xl font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">{reservation.spot.spotNumber}</span>
          </div>
          <div className="md:mt-2 md:text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paid Amount</span>
            <span className="text-xl font-extrabold text-slate-800">₹{Number(reservation.totalPrice).toFixed(2)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {/* QR Code Action */}
          {(isConfirmed || isActive) && (
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center space-x-1 bg-slate-950 hover:bg-slate-900 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow transition hover-lift"
            >
              <QrCode className="h-4 w-4" />
              <span>Gate Ticket</span>
            </button>
          )}

          {/* Extend Booking Action */}
          {(isConfirmed || isActive) && (
            <button
              onClick={() => {
                // Set default extension end time to 1 hour after current end
                const currentEnd = new Date(reservation.endTime);
                currentEnd.setHours(currentEnd.getHours() + 1);
                setNewEndTime(currentEnd.toISOString().slice(0, 16));
                setShowExtendModal(true);
              }}
              className="flex items-center space-x-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition hover-lift"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Extend</span>
            </button>
          )}

          {/* Cancel Booking Action */}
          {isConfirmed && (
            <button
              onClick={handleCancelClick}
              disabled={loadingCancel}
              className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition hover-lift disabled:opacity-50"
            >
              {loadingCancel ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* QR Ticket Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-slate-100 flex flex-col items-center">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Your Gate Ticket</h3>
            <p className="text-xs text-slate-400 font-medium mb-6 text-center">Scan at the parking entrance gate to check in.</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-6 flex justify-center items-center">
              {reservation.qrCodeImage ? (
                <img src={reservation.qrCodeImage} alt="QR Code Ticket" className="h-48 w-48" />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-slate-400">Loading QR...</div>
              )}
            </div>

            <div className="w-full text-center space-y-1 mb-6 text-xs text-slate-500 font-semibold bg-indigo-50/50 p-4 rounded-xl">
              <p>Lot: {reservation.lot.name}</p>
              <p>Spot Number: {reservation.spot.spotNumber}</p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Extend Booking Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Extend Reservation</h3>
            <p className="text-xs text-slate-400 font-medium mb-4">Choose a new departure time. You will pay the price difference.</p>
            
            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Current End Time</label>
                <input
                  type="text"
                  value={new Date(reservation.endTime).toLocaleString()}
                  disabled
                  className="w-full bg-slate-50 border border-slate-100 text-slate-500 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">New End Time</label>
                <input
                  type="datetime-local"
                  value={newEndTime}
                  min={new Date(reservation.endTime).toISOString().slice(0, 16)}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExtendModal(false)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingExtend}
                  className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow transition flex items-center justify-center space-x-1"
                >
                  {loadingExtend && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Proceed to Pay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
