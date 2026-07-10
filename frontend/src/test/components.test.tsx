import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock the stores
vi.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
  }),
  API_URL: 'http://localhost:5000/api',
}));

vi.mock('../store/socketStore', () => ({
  useSocketStore: () => ({
    socket: null,
    notifications: [],
    connectSocket: vi.fn(),
    disconnectSocket: vi.fn(),
    joinLot: vi.fn(),
    leaveLot: vi.fn(),
    addNotification: vi.fn(),
    clearNotifications: vi.fn(),
  }),
}));

// Import after mocks
import SearchBar from '../components/SearchBar';
import SpotGrid from '../components/SpotGrid';
import ReservationCard from '../components/ReservationCard';

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
}

describe('SearchBar Component', () => {
  it('renders the destination input field', () => {
    renderWithRouter(<SearchBar />);
    const input = screen.getByPlaceholderText('Where are you going?');
    expect(input).toBeInTheDocument();
  });

  it('renders a date input', () => {
    renderWithRouter(<SearchBar />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('allows typing into the destination field', () => {
    renderWithRouter(<SearchBar />);
    const input = screen.getByPlaceholderText('Where are you going?') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Times Square' } });
    expect(input.value).toBe('Times Square');
  });

  it('renders the submit search button', () => {
    renderWithRouter(<SearchBar />);
    const buttons = document.querySelectorAll('button[type="submit"]');
    expect(buttons.length).toBe(1);
  });
});

describe('SpotGrid Component', () => {
  it('renders loading state initially', () => {
    renderWithRouter(
      <SpotGrid
        lotId="mock-lot-id"
        startTime="2026-06-10T09:00:00.000Z"
        endTime="2026-06-10T11:00:00.000Z"
        selectedSpotId={null}
        onSelectSpot={vi.fn()}
      />
    );
    expect(screen.getByText('Loading live spot layout...')).toBeInTheDocument();
  });
});

describe('ReservationCard Component', () => {
  const mockReservation = {
    id: 'res-001',
    startTime: '2026-06-15T09:00:00.000Z',
    endTime: '2026-06-15T12:00:00.000Z',
    status: 'CONFIRMED' as const,
    totalPrice: '45.00',
    qrCode: 'mock-jwt-token-string',
    lot: {
      name: 'Manhattan Central Parking',
      address: '152 W 45th St',
      city: 'New York',
      state: 'NY',
    },
    spot: {
      spotNumber: 'A-5',
    },
  };

  it('renders the lot name', () => {
    renderWithRouter(
      <ReservationCard
        reservation={mockReservation}
        onCancel={vi.fn()}
        onExtend={vi.fn()}
      />
    );
    expect(screen.getByText('Manhattan Central Parking')).toBeInTheDocument();
  });

  it('renders the spot number badge', () => {
    renderWithRouter(
      <ReservationCard
        reservation={mockReservation}
        onCancel={vi.fn()}
        onExtend={vi.fn()}
      />
    );
    expect(screen.getByText('A-5')).toBeInTheDocument();
  });

  it('renders the CONFIRMED status badge', () => {
    renderWithRouter(
      <ReservationCard
        reservation={mockReservation}
        onCancel={vi.fn()}
        onExtend={vi.fn()}
      />
    );
    expect(screen.getByText('CONFIRMED')).toBeInTheDocument();
  });

  it('renders the total price', () => {
    renderWithRouter(
      <ReservationCard
        reservation={mockReservation}
        onCancel={vi.fn()}
        onExtend={vi.fn()}
      />
    );
    expect(screen.getByText('₹45.00')).toBeInTheDocument();
  });

  it('renders Gate Ticket, Extend, and Cancel buttons for CONFIRMED status', () => {
    renderWithRouter(
      <ReservationCard
        reservation={mockReservation}
        onCancel={vi.fn()}
        onExtend={vi.fn()}
      />
    );
    expect(screen.getByText('Gate Ticket')).toBeInTheDocument();
    expect(screen.getByText('Extend')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does NOT render action buttons for COMPLETED status', () => {
    const completed = { ...mockReservation, status: 'COMPLETED' as const };
    renderWithRouter(
      <ReservationCard
        reservation={completed}
        onCancel={vi.fn()}
        onExtend={vi.fn()}
      />
    );
    expect(screen.queryByText('Gate Ticket')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });
});
