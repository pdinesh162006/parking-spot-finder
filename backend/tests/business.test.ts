import { getLotPricing } from '../src/routes/lots';
import { RedisService } from '../src/services/redisService';
import { QRService } from '../src/services/qrService';
import { prisma } from '../src/config/db';
import { redis } from '../src/config/redis';

// Mock DB and Redis
jest.mock('../src/config/db', () => ({
  prisma: {
    parkingSpot: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
    reservation: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../src/config/redis', () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
  },
}));

describe('ParkEase Business Logic Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dynamic Surge Pricing Logic', () => {
    it('should calculate standard price if occupancy is below 80%', async () => {
      const basePrice = 10.0;
      (prisma.parkingSpot.count as jest.Mock).mockResolvedValue(10); // 10 spots
      (prisma.reservation.count as jest.Mock).mockResolvedValue(5);  // 5 active bookings (50% occupancy)

      const pricing = await getLotPricing('mock-lot-id', basePrice);
      expect(pricing.pricePerHour).toBe(10.0);
      expect(pricing.isSurge).toBe(false);
      expect(pricing.occupancy).toBe(0.5);
    });

    it('should multiply pricePerHour by 1.2 if occupancy exceeds 80%', async () => {
      const basePrice = 10.0;
      (prisma.parkingSpot.count as jest.Mock).mockResolvedValue(10); // 10 spots
      (prisma.reservation.count as jest.Mock).mockResolvedValue(9);  // 9 active bookings (90% occupancy)

      const pricing = await getLotPricing('mock-lot-id', basePrice);
      expect(pricing.pricePerHour).toBe(12.0); // 10 * 1.2
      expect(pricing.isSurge).toBe(true);
      expect(pricing.occupancy).toBe(0.9);
    });

    it('should fallback to standard price if total spots is 0', async () => {
      const basePrice = 10.0;
      (prisma.parkingSpot.count as jest.Mock).mockResolvedValue(0);

      const pricing = await getLotPricing('mock-lot-id', basePrice);
      expect(pricing.pricePerHour).toBe(basePrice);
      expect(pricing.isSurge).toBe(false);
    });
  });

  describe('Spot Locking Logic via Redis', () => {
    it('should return true if lock is successfully acquired', async () => {
      (redis.set as jest.Mock).mockResolvedValue('OK');

      const result = await RedisService.lockSpot('spot-123', 'user-456');
      expect(result).toBe(true);
      expect(redis.set).toHaveBeenCalledWith('lock:spot:spot-123', 'user-456', 'EX', 600, 'NX');
    });

    it('should return false if lock acquisition fails', async () => {
      (redis.set as jest.Mock).mockResolvedValue(null);

      const result = await RedisService.lockSpot('spot-123', 'user-456');
      expect(result).toBe(false);
    });

    it('should release spot lock successfully', async () => {
      (redis.del as jest.Mock).mockResolvedValue(1);

      const result = await RedisService.releaseSpotLock('spot-123');
      expect(result).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('lock:spot:spot-123');
    });
  });

  describe('QR Code Generation and JWT Token Verification', () => {
    it('should sign a payload using RS256 and decode it correctly', async () => {
      const payload = {
        reservationId: 'res-id-111',
        userId: 'user-id-222',
        spotId: 'spot-id-333',
        lotId: 'lot-id-444',
      };

      const { token, qrCodeDataUrl } = await QRService.generateQRCode(payload);
      expect(token).toBeDefined();
      expect(qrCodeDataUrl).toContain('data:image/png;base64');

      const decoded = QRService.verifyQRToken(token);
      expect(decoded.reservationId).toBe(payload.reservationId);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.spotId).toBe(payload.spotId);
      expect(decoded.lotId).toBe(payload.lotId);
    });

    it('should throw an error for malformed JWT tokens', () => {
      expect(() => {
        QRService.verifyQRToken('invalid-mock-token');
      }).toThrow('Invalid or expired QR code token');
    });
  });
});
