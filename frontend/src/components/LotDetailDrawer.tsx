import { useNavigate } from 'react-router-dom';
import { X, Star, MapPin, ShieldCheck, Zap, Video, Warehouse, Accessibility, Key } from 'lucide-react';

interface Lot {
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
  latitude: string | number;
  longitude: string | number;
}

interface LotDetailDrawerProps {
  lot: Lot | null;
  onClose: () => void;
  startTime?: string;
  endTime?: string;
  onGetDirections?: (lat: number, lng: number) => void;
}

export default function LotDetailDrawer({ lot, onClose, startTime, endTime, onGetDirections }: LotDetailDrawerProps) {
  const navigate = useNavigate();
  if (!lot) return null;

  let durationHours = 0;
  let totalPrice = 0;
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
      totalPrice = lot.pricePerHour * durationHours;
    }
  }

  const handleBookClick = () => {
    let url = `/lots/${lot.id}`;
    if (startTime && endTime) {
      url += `?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;
    }
    navigate(url);
  };

  const getAmenityIcon = (amenity: string) => {
    switch (amenity) {
      case 'CCTV':
        return <Video className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
      case 'EV_CHARGING':
        return <Zap className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 shrink-0 animate-pulse" />;
      case 'COVERED':
        return <Warehouse className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
      case 'HANDICAP_ACCESS':
        return <Accessibility className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
      case 'VALET':
        return <Key className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
      default:
        return <ShieldCheck className="h-3.5 w-3.5 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose}></div>

      {/* Drawer Container */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-100 animate-slide-left">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">Lot Details</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Image */}
          <div className="h-52 w-full rounded-2xl overflow-hidden bg-slate-100 relative shadow-sm border border-slate-50">
            {lot.imageUrls && lot.imageUrls.length > 0 ? (
              <img src={lot.imageUrls[0]} alt={lot.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-semibold">No Image Available</div>
            )}
            
            {/* Surge Price Badge */}
            {lot.isSurge && (
              <span className="absolute top-4 right-4 bg-amber-500 text-white text-[10px] font-extrabold px-2 py-1 rounded-full shadow flex items-center space-x-0.5 uppercase tracking-wider">
                <Zap className="h-3 w-3 fill-current animate-pulse" />
                <span>Surge Price Active</span>
              </span>
            )}
          </div>

          {/* Title & Rating */}
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{lot.name}</h2>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-0.5 text-amber-400">
                <Star className="h-5 w-5 fill-current" />
                <span className="text-sm font-bold text-slate-800">
                  {lot.avgRating ? lot.avgRating.toFixed(1) : 'New'}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center text-slate-500 text-sm font-medium space-x-1">
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <span>{lot.address}, {lot.city}</span>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Price details */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/80 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase block tracking-wider">Hourly Rate</span>
                <div className="flex items-baseline space-x-0.5">
                  <span className="text-2xl font-black text-indigo-600">₹{Number(lot.pricePerHour).toFixed(2)}</span>
                  <span className="text-xs font-semibold text-slate-400">/hr</span>
                </div>
              </div>
              {lot.isSurge && (
                <div className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200/50 px-2.5 py-1 rounded-xl">
                  Surge Active (+20%)
                </div>
              )}
            </div>

            {durationHours > 0 && (
              <>
                <hr className="border-slate-200/50" />
                <div className="space-y-2.5 text-sm text-slate-600 font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Selected Duration</span>
                    <span className="text-slate-800 font-extrabold">{durationHours} hrs</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-black text-slate-800 pt-1">
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Estimated Total</span>
                    <span className="text-indigo-600 text-lg">₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">About this Lot</h4>
            <p className="text-sm text-slate-600 leading-relaxed font-medium">{lot.description}</p>
          </div>

          {/* Amenities */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {lot.amenities && lot.amenities.length > 0 ? (
                lot.amenities.map((am) => (
                  <span
                    key={am}
                    className="flex items-center space-x-1.5 bg-white text-slate-700 text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-150 shadow-sm"
                  >
                    {getAmenityIcon(am)}
                    <span>{am.replace('_', ' ')}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 font-medium">Standard Parking Facilities</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-6 border-t border-slate-100 shrink-0 bg-slate-50 flex flex-col space-y-3.5">
          {onGetDirections && (
            <button
              onClick={() => {
                onGetDirections(Number(lot.latitude), Number(lot.longitude));
                onClose();
              }}
              className="w-full bg-white hover:bg-slate-50 text-indigo-600 border-2 border-indigo-600/20 hover:border-indigo-600 font-extrabold py-3.5 rounded-2xl transition hover-lift text-sm tracking-wide flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <span>🧭 Get Directions</span>
            </button>
          )}
          <button
            onClick={handleBookClick}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-4 rounded-2xl shadow-premium transition hover-lift text-sm tracking-wide"
          >
            Choose Spot & Book
          </button>
        </div>
      </div>
    </div>
  );
}
