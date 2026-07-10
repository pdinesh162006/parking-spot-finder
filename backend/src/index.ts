import http from 'http';
import app from './app';
import { initSocket } from './socket';
import { initCronJobs } from './jobs/cron';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start background cron jobs
initCronJobs();

server.listen(port, () => {
  console.log(`========================================`);
  console.log(`🚀 ParkEase Server running on port ${port}`);
  console.log(`🖥️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});
