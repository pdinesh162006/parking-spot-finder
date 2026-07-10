import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { privateKey, publicKey } from '../config/jwt';

interface QRPayload {
  reservationId: string;
  userId: string;
  spotId: string;
  lotId: string;
}

export class QRService {
  /**
   * Generates a signed token representing the reservation and encodes it in a QR code.
   * Returns a base64 Data URL for the QR code image.
   */
  static async generateQRCode(payload: QRPayload): Promise<{ token: string; qrCodeDataUrl: string }> {
    try {
      // Sign with RS256, no expiration since reservations might be checked in late/early, 
      // but validation logic can perform date bounds checks.
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      
      // Generate QR Code image (base64 Data URL)
      const qrCodeDataUrl = await QRCode.toDataURL(token);
      
      return { token, qrCodeDataUrl };
    } catch (error) {
      console.error('Failed to generate QR Code:', error);
      throw new Error('QR Code generation failed');
    }
  }

  /**
   * Verifies the RS256 token from a scanned QR Code
   */
  static verifyQRToken(token: string): QRPayload {
    try {
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as QRPayload;
      return decoded;
    } catch (error) {
      console.error('Failed to verify QR Code token:', error);
      throw new Error('Invalid or expired QR code token');
    }
  }
}
