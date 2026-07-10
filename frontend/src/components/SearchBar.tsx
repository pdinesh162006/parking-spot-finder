import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Clock, Loader2, Mic, MicOff } from 'lucide-react';

interface SearchBarProps {
  initialValues?: {
    lat?: string;
    lng?: string;
    address?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  };
}

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function SearchBar({ initialValues }: SearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialValues?.address || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: string; lng: string } | null>(
    initialValues?.lat && initialValues?.lng
      ? { lat: initialValues.lat, lng: initialValues.lng }
      : null
  );

  // Set default times (e.g. today, now + 1h, now + 2h)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(initialValues?.date || tomorrowStr);
  const [startTime, setStartTime] = useState(initialValues?.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialValues?.endTime || '11:00');
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<any>(null);

  // Voice Typing state & references
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-IN'; // optimized for Indian accents & Chennai place names

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
          setShowDropdown(true);
        }
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleVoiceSearch = () => {
    if (!recognitionRef.current) {
      alert('Voice typing is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Debounced search for Nominatim OpenStreetMap autocomplete
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&limit=5&addressdetails=1`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error('Nominatim query error:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 450);

    return () => clearTimeout(debounceTimer.current);
  }, [query]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: Suggestion) => {
    setQuery(item.display_name);
    setSelectedCoords({ lat: item.lat, lng: item.lon });
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCoords) {
      // If user typed something but didn't select, default to a fallback (or search name directly)
      // For a great UX, we'll redirect to search but search by text query.
      navigate(`/search?address=${encodeURIComponent(query)}&date=${date}&startTime=${startTime}&endTime=${endTime}`);
      return;
    }

    navigate(
      `/search?lat=${selectedCoords.lat}&lng=${selectedCoords.lng}&address=${encodeURIComponent(
        query
      )}&date=${date}&startTime=${startTime}&endTime=${endTime}`
    );
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="w-full max-w-4xl bg-slate-900 rounded-2xl shadow-premium p-4 md:p-6 grid grid-cols-1 md:grid-cols-4 gap-4 border border-slate-800"
    >
      {/* Location Input */}
      <div className="relative md:col-span-2 flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:pr-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
          <MapPin className="h-3 w-3 text-indigo-400" />
          <span>Destination</span>
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedCoords(null);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Where are you going?"
            className="w-full pr-14 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none bg-transparent"
            required
          />
          <div className="absolute right-0 flex items-center space-x-1.5">
            {loadingSuggestions && (
              <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
            )}
            
            {/* Voice Input Button */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              title="Voice Typing"
              className={`p-1.5 rounded-full transition duration-200 ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse shadow-md' 
                  : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-850'
              }`}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Nominatim Suggestions dropdown */}
        {showDropdown && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-3 bg-slate-900 rounded-xl shadow-xl z-50 border border-slate-800 divide-y divide-slate-800 overflow-hidden"
          >
            {suggestions.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-4 py-3 text-xs font-medium hover:bg-slate-800 text-slate-300 flex items-start space-x-2 transition"
              >
                <MapPin className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                <span>{item.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Picker */}
      <div className="flex flex-col justify-center border-b md:border-b-0 md:border-r border-slate-800 pb-3 md:pb-0 md:px-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
          <Calendar className="h-3 w-3 text-indigo-400" />
          <span>Date</span>
        </label>
        <input
          type="date"
          value={date}
          min={new Date().toISOString().split('T')[0]}
          onChange={(e) => setDate(e.target.value)}
          className="w-full text-sm font-semibold text-slate-100 focus:outline-none bg-transparent"
        />
      </div>

      {/* Time Picker & Submit Button */}
      <div className="flex items-center justify-between md:pl-4">
        <div className="flex flex-col justify-center w-2/3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Clock className="h-3 w-3 text-indigo-400" />
            <span>Time Window</span>
          </label>
          <div className="flex items-center space-x-2">
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="text-xs font-semibold text-slate-100 bg-slate-900 focus:outline-none cursor-pointer border-none"
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
            <span className="text-slate-500 text-xs font-medium">to</span>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="text-xs font-semibold text-slate-100 bg-slate-900 focus:outline-none cursor-pointer border-none"
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

        {/* Find Parking Submit Button */}
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-xl shadow-premium transition hover-lift flex items-center justify-center shrink-0"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
