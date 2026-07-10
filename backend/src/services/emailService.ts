import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const fromEmail = process.env.FROM_EMAIL || 'no-reply@parkease.local';
const sendgridApiKey = process.env.SENDGRID_API_KEY;

// Create transporter
let transporter: nodemailer.Transporter;

if (sendgridApiKey && sendgridApiKey !== 'mock_sendgrid_key') {
  transporter = nodemailer.createTransport({
    host: 'smtp.sendgrid.net',
    port: 587,
    auth: {
      user: 'apikey',
      pass: sendgridApiKey,
    },
  });
} else {
  // Mock transporter or console log logger
  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
    buffer: true
  });
}

export class EmailService {
  /**
   * Helper to send emails
   */
  static async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"ParkEase Support" <${fromEmail}>`,
        to,
        subject,
        html,
      };

      const info = await transporter.sendMail(mailOptions);
      
      // If we are using the stream/mock transporter, log the output
      if (info.message) {
        console.log(`[EMAIL LOG] To: ${to} | Subject: ${subject}`);
      }
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendConfirmation(email: string, name: string, reservationDetails: any): Promise<boolean> {
    const subject = 'Your Parking Spot Reservation is Confirmed!';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Hello ${name},</h2>
        <p>Thank you for choosing ParkEase. Your booking has been successfully confirmed.</p>
        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Reservation Details:</h4>
          <p><strong>Reservation ID:</strong> ${reservationDetails.id}</p>
          <p><strong>Parking Lot:</strong> ${reservationDetails.lotName}</p>
          <p><strong>Spot Number:</strong> ${reservationDetails.spotNumber}</p>
          <p><strong>Start Time:</strong> ${new Date(reservationDetails.startTime).toLocaleString()}</p>
          <p><strong>End Time:</strong> ${new Date(reservationDetails.endTime).toLocaleString()}</p>
          <p><strong>Total Paid:</strong> $${Number(reservationDetails.totalPrice).toFixed(2)}</p>
        </div>
        <p>You can find your QR code check-in ticket directly on your dashboard.</p>
        <p>Drive safe!</p>
        <p>Best regards,<br/>The ParkEase Team</p>
      </div>
    `;
    return this.sendMail(email, subject, html);
  }

  static async sendCancellation(email: string, name: string, reservationId: string): Promise<boolean> {
    const subject = 'Parking Reservation Cancelled';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Hello ${name},</h2>
        <p>Your parking reservation <strong>${reservationId}</strong> has been cancelled. A refund has been issued if eligible.</p>
        <p>Hope to serve you again soon!</p>
        <p>Best regards,<br/>The ParkEase Team</p>
      </div>
    `;
    return this.sendMail(email, subject, html);
  }

  static async sendStartWarning(email: string, name: string, lotName: string, spotNumber: string): Promise<boolean> {
    const subject = 'Reminder: Your Parking Spot Reservation Starts in 15 Minutes!';
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Hello ${name},</h2>
        <p>This is a quick friendly reminder that your booking at <strong>${lotName}</strong> (Spot: <strong>${spotNumber}</strong>) begins in 15 minutes.</p>
        <p>Please have your QR code ready at the entrance gate for check-in.</p>
        <p>Have a great day!</p>
      </div>
    `;
    return this.sendMail(email, subject, html);
  }
}
