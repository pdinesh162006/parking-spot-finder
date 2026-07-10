import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';

// In-Memory Database Arrays populated with same Seed data
let users = [
  {
    id: 'user-admin-uuid',
    email: 'admin@parkease.com',
    name: 'System Admin',
    phone: '+15550100',
    role: 'ADMIN',
  },
  {
    id: 'user-owner1-uuid',
    email: 'owner1@parkease.com',
    name: 'John Owner',
    phone: '+15550201',
    role: 'OWNER',
  },
  {
    id: 'user-owner2-uuid',
    email: 'owner2@parkease.com',
    name: 'Jane Owner',
    phone: '+15550202',
    role: 'OWNER',
  },
  ...Array.from({ length: 5 }).map((_, i) => ({
    id: `user-driver${i + 1}-uuid`,
    email: `driver${i + 1}@parkease.com`,
    name: `Driver User ${i + 1}`,
    phone: `+1555030${i + 1}`,
    role: 'DRIVER',
  })),
];

let lots: any[] = [
  {
    id: 'lot-tnagar-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'T. Nagar Smart Parking',
    description: 'Multi-level smart parking facility in the heart of T. Nagar shopping district. Close to Ranganathan Street and Pondy Bazaar with 24/7 CCTV and covered parking.',
    address: '15 Ranganathan St, T. Nagar',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600017',
    latitude: 13.0418,
    longitude: 80.2341,
    totalSpots: 20,
    pricePerHour: 40.00,
    amenities: ['CCTV', 'COVERED', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-annanagar-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Anna Nagar Tower Parking',
    description: 'Spacious multi-story parking near Anna Nagar Tower Park. EV charging available. Easy access to shopping malls and restaurants along 2nd Avenue.',
    address: '2nd Avenue, Anna Nagar',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600040',
    latitude: 13.0850,
    longitude: 80.2101,
    totalSpots: 20,
    pricePerHour: 30.00,
    amenities: ['CCTV', 'EV_CHARGING', 'COVERED'],
    imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
    isActive: true,
  },
  {
    id: 'lot-adyar-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Adyar Gate Parking Plaza',
    description: 'Open-air and covered parking near Adyar Signal junction. Walking distance to Adyar Ananda Bhavan, banks, and IIT Madras campus entrance.',
    address: 'LB Road, Adyar',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600020',
    latitude: 13.0067,
    longitude: 80.2565,
    totalSpots: 20,
    pricePerHour: 25.00,
    amenities: ['CCTV', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
    isActive: true,
  },
  {
    id: 'lot-omr-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'OMR IT Park Parking Hub',
    description: 'Premium parking facility on Old Mahabalipuram Road (IT Corridor). Valet service, EV charging stations, and underground covered spots near Tidel Park & Elcot SEZ.',
    address: 'Rajiv Gandhi Salai, Sholinganallur',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600119',
    latitude: 12.9010,
    longitude: 80.2279,
    totalSpots: 20,
    pricePerHour: 35.00,
    amenities: ['COVERED', 'CCTV', 'VALET', 'EV_CHARGING'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-mountroad-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Mount Road Central Parking',
    description: 'Centrally located parking on Anna Salai (Mount Road) near Express Avenue Mall and Spencer Plaza. Ideal for shoppers and office commuters.',
    address: 'Anna Salai, Mount Road',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600002',
    latitude: 13.0604,
    longitude: 80.2640,
    totalSpots: 20,
    pricePerHour: 45.00,
    amenities: ['COVERED', 'CCTV', 'VALET', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
    isActive: true,
  },
  {
    id: 'lot-mylapore-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Mylapore Temple Gate Parking',
    description: 'Secure parking facility near Kapaleeshwarar Temple. Walk to traditional markets, temples, and Luz corner. Covered spots and CCTV security.',
    address: 'Luz Church Rd, Mylapore',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600004',
    latitude: 13.0330,
    longitude: 80.2690,
    totalSpots: 20,
    pricePerHour: 35.00,
    amenities: ['CCTV', 'COVERED'],
    imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
    isActive: true,
  },
  {
    id: 'lot-velachery-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Velachery Junction Hub',
    description: 'Spacious open-air and covered parking near Phoenix Marketcity mall. Perfect for weekend shoppers and commuters to Velachery bypass.',
    address: '100 Feet Bypass Rd, Velachery',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600042',
    latitude: 12.9915,
    longitude: 80.2170,
    totalSpots: 20,
    pricePerHour: 50.00,
    amenities: ['COVERED', 'CCTV', 'VALET', 'EV_CHARGING'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-guindy-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Guindy Metro Smart Park',
    description: 'Convenient transit parking facility directly adjacent to Guindy Metro and Railway station. Quick access to GST Road and Guindy industrial area.',
    address: 'GST Road, Guindy',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600032',
    latitude: 13.0090,
    longitude: 80.2131,
    totalSpots: 20,
    pricePerHour: 30.00,
    amenities: ['CCTV', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
    isActive: true,
  },
  {
    id: 'lot-tambaram-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Tambaram Station Plaza',
    description: 'Covered multi-level parking located at Tambaram West. Dedicated spot attendants, security cameras, and handicap-accessible paths.',
    address: 'West Tambaram Bypass, Tambaram',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600045',
    latitude: 12.9249,
    longitude: 80.1166,
    totalSpots: 20,
    pricePerHour: 25.00,
    amenities: ['COVERED', 'CCTV', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
    isActive: true,
  },
  {
    id: 'lot-porur-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Porur DLF IT Corridor Parking',
    description: 'Underground parking facility right next to DLF Cybercity IT Park. Perfect for IT professionals and daily commuters. EV charging available.',
    address: 'Mount Poonamallee Rd, Porur',
    city: 'Chennai',
    state: 'TN',
    zipCode: '600116',
    latitude: 13.0245,
    longitude: 80.1650,
    totalSpots: 20,
    pricePerHour: 40.00,
    amenities: ['COVERED', 'CCTV', 'EV_CHARGING'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-gandhipuram-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Gandhipuram Smart Parking Plaza',
    description: 'Multi-level smart parking facility in the heart of Gandhipuram commercial district, next to Cross Cut Road shopping area and Central Bus Stand.',
    address: 'Cross Cut Road, Gandhipuram',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641012',
    latitude: 11.0168,
    longitude: 76.9688,
    totalSpots: 20,
    pricePerHour: 40.00,
    amenities: ['CCTV', 'COVERED', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-rspuram-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'RS Puram Multi-Level Parking',
    description: 'Modern multi-story automated parking plaza on D.B. Road, R.S. Puram. Easy access to premium shopping brands, restaurants, and parks.',
    address: 'D.B. Road, R.S. Puram',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641002',
    latitude: 11.0115,
    longitude: 76.9502,
    totalSpots: 20,
    pricePerHour: 35.00,
    amenities: ['CCTV', 'EV_CHARGING', 'COVERED'],
    imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-peelamedu-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Peelamedu IT Hub Parking',
    description: 'Spacious parking plaza on Avinashi Road near Peelamedu. Ideally located for PSG Tech, local business complexes, and IT parks.',
    address: 'Avinashi Road, Peelamedu',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641004',
    latitude: 11.0264,
    longitude: 77.0105,
    totalSpots: 20,
    pricePerHour: 30.00,
    amenities: ['CCTV', 'HANDICAP_ACCESS', 'VALET'],
    imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-junction-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Coimbatore Junction Transit Park',
    description: 'High-capacity secure parking directly opposite Coimbatore Railway Station. 24/7 access control, valet services, and luggage storage support.',
    address: 'State Bank Road, Railway Station Area',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641018',
    latitude: 10.9964,
    longitude: 76.9680,
    totalSpots: 20,
    pricePerHour: 30.00,
    amenities: ['COVERED', 'CCTV', 'VALET', 'EV_CHARGING'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-singanallur-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Singanallur Bus Stand Plaza',
    description: 'Safe, guarded parking facility situated adjacent to Singanallur Bus Stand on Trichy Road. CCTV-monitored with designated handicap-accessible spots.',
    address: 'Trichy Road, Singanallur',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641005',
    latitude: 11.0022,
    longitude: 77.0258,
    totalSpots: 20,
    pricePerHour: 25.00,
    amenities: ['COVERED', 'CCTV', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-saravanampatti-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Saravanampatti SEZ Parking Hub',
    description: 'Premium parking facility serving CHIL IT SEZ and colleges on Keeranatham Road. Includes EV fast-charging stations and valet parking.',
    address: 'Keeranatham Road, Saravanampatti',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641035',
    latitude: 11.0805,
    longitude: 77.0012,
    totalSpots: 20,
    pricePerHour: 35.00,
    amenities: ['COVERED', 'CCTV', 'VALET', 'EV_CHARGING'],
    imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-saibaba-uuid',
    ownerId: 'user-owner1-uuid',
    name: 'Saibaba Colony Parking Zone',
    description: 'Open and covered parking plaza on NSR Road, Saibaba Colony. Surrounded by commercial shops and residential areas, featuring full security cameras.',
    address: 'NSR Road, Saibaba Colony',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641011',
    latitude: 11.0285,
    longitude: 76.9436,
    totalSpots: 20,
    pricePerHour: 30.00,
    amenities: ['CCTV', 'COVERED', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
    isActive: true,
  },
  {
    id: 'lot-cbe-ukkadam-uuid',
    ownerId: 'user-owner2-uuid',
    name: 'Ukkadam Periyakulam Lake Parking',
    description: 'Scenic parking spots near Ukkadam Bypass Road and Periyakulam Lake. Perfect for park visitors and bus commuters.',
    address: 'Ukkadam Bypass Road',
    city: 'Coimbatore',
    state: 'TN',
    zipCode: '641001',
    latitude: 10.9870,
    longitude: 76.9620,
    totalSpots: 20,
    pricePerHour: 20.00,
    amenities: ['CCTV', 'HANDICAP_ACCESS'],
    imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
    isActive: true,
  }
];

let spots: any[] = [];
lots.forEach((lot) => {
  const spotTypes = [
    'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD',
    'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD',
    'COMPACT', 'COMPACT', 'COMPACT', 'COMPACT',
    'LARGE', 'LARGE',
    'HANDICAP', 'HANDICAP',
    'EV', 'EV'
  ];
  for (let i = 0; i < 20; i++) {
    const floor = Math.floor(i / 10) + 1;
    const spotNumber = `${String.fromCharCode(65 + floor - 1)}-${i % 10 + 1}`;
    spots.push({
      id: `spot-${lot.id}-${i}`,
      lotId: lot.id,
      spotNumber,
      type: spotTypes[i],
      floor,
      isActive: true,
    });
  }
});

let reviews = [
  { id: 'rev-1', userId: 'user-driver1-uuid', lotId: 'lot-tnagar-uuid', rating: 5, comment: 'Excellent location near Pondy Bazaar, very clean.', createdAt: new Date().toISOString() },
  { id: 'rev-2', userId: 'user-driver2-uuid', lotId: 'lot-tnagar-uuid', rating: 4, comment: 'A bit crowded on weekends, but great CCTV security.', createdAt: new Date().toISOString() },
  { id: 'rev-3', userId: 'user-driver3-uuid', lotId: 'lot-tnagar-uuid', rating: 5, comment: 'Best parking spot in T. Nagar, highly recommend!', createdAt: new Date().toISOString() },
  { id: 'rev-4', userId: 'user-driver1-uuid', lotId: 'lot-annanagar-uuid', rating: 4, comment: 'Good EV charging facility, spacious slots.', createdAt: new Date().toISOString() },
  { id: 'rev-5', userId: 'user-driver4-uuid', lotId: 'lot-omr-uuid', rating: 5, comment: 'Valet service was super quick. Love the IT corridor location!', createdAt: new Date().toISOString() },
  { id: 'rev-6', userId: 'user-driver5-uuid', lotId: 'lot-mountroad-uuid', rating: 4, comment: 'Very convenient for Express Avenue Mall shopping.', createdAt: new Date().toISOString() },
  { id: 'rev-7', userId: 'user-driver2-uuid', lotId: 'lot-adyar-uuid', rating: 5, comment: 'Walking distance to all Adyar shops. Great value!', createdAt: new Date().toISOString() },
];

let reservations: any[] = [
  {
    id: 'res-upcoming-1',
    userId: 'user-driver1-uuid',
    lotId: 'lot-tnagar-uuid',
    spotId: 'spot-lot-tnagar-uuid-0',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    status: 'CONFIRMED',
    totalPrice: '120.00',
    stripePaymentIntentId: 'pi_mock_1',
    qrCode: 'qrcode_mock_1',
    createdAt: new Date().toISOString(),
  }
];

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_access_secret_key_123_456_789';

const generateToken = (payload: any) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

const verifyRequestToken = (req: Request): any | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch {
    return null;
  }
};

export const mockMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.MOCK_MODE !== 'true' || process.env.NODE_ENV === 'test') {
    return next();
  }

  const { method, path } = req;
  console.log(`[MOCK API REQUEST] ${method} ${path}`);

  // Helpers
  const sendJson = (status: number, body: any) => {
    res.status(status).json(body);
  };

  // Auth: Register
  if (method === 'POST' && path === '/api/auth/register') {
    const { email, password, name, phone, role } = req.body;
    if (users.find(u => u.email === email)) {
      return sendJson(400, { message: 'User email already exists.' });
    }
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      name,
      phone,
      role: role || 'DRIVER',
      password: password || 'password123',
    };
    users.push(newUser);
    const token = generateToken({ id: newUser.id, role: newUser.role });
    const { password: _, ...userWithoutPassword } = newUser;
    return sendJson(201, {
      message: 'Registration successful.',
      accessToken: token,
      user: userWithoutPassword,
    });
  }

  // Auth: Login
  if (method === 'POST' && path === '/api/auth/login') {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    const expectedPassword = (user as any)?.password || 'password123';
    if (!user || password !== expectedPassword) {
      return sendJson(401, { message: 'Invalid credentials.' });
    }
    const token = generateToken({ id: user.id, role: user.role });
    res.cookie('refreshToken', 'mock-refresh-token', { httpOnly: true });
    const { password: _, ...userWithoutPassword } = user as any;
    return sendJson(200, {
      message: 'Login successful.',
      accessToken: token,
      user: userWithoutPassword,
    });
  }

  // Auth: Google Login
  if (method === 'POST' && path === '/api/auth/google-login') {
    const { email, name, role } = req.body;
    let user = users.find(u => u.email === email);
    if (!user) {
      user = {
        id: `user-${Date.now()}`,
        email,
        name,
        phone: '',
        role: role || 'DRIVER',
      };
      users.push(user);
    }
    const token = generateToken({ id: user.id, role: user.role });
    res.cookie('refreshToken', 'mock-refresh-token', { httpOnly: true });
    const { password: _, ...userWithoutPassword } = user as any;
    return sendJson(200, {
      message: 'Google login successful.',
      accessToken: token,
      user: userWithoutPassword,
    });
  }

  // Auth: Refresh
  if (method === 'POST' && path === '/api/auth/refresh') {
    // Return a dummy access token using the first driver user
    const defaultUser = users[3]; // driver1
    const token = generateToken({ id: defaultUser.id, role: defaultUser.role });
    return sendJson(200, { accessToken: token });
  }

  // Auth: Logout
  if (method === 'POST' && path === '/api/auth/logout') {
    res.clearCookie('refreshToken');
    return sendJson(200, { message: 'Logout successful.' });
  }

  // Users: Get Profile
  if (method === 'GET' && path === '/api/users/me') {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    const user = users.find(u => u.id === payload.id);
    if (!user) return sendJson(404, { message: 'User not found' });
    const { password: _, ...userWithoutPassword } = user as any;
    return sendJson(200, userWithoutPassword);
  }

  // Users: Update Profile
  if (method === 'PUT' && path === '/api/users/me') {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    const userIdx = users.findIndex(u => u.id === payload.id);
    if (userIdx === -1) return sendJson(404, { message: 'User not found' });
    const { name, phone } = req.body;
    users[userIdx].name = name;
    users[userIdx].phone = phone;
    const { password: _, ...userWithoutPassword } = users[userIdx] as any;
    return sendJson(200, userWithoutPassword);
  }

  // Users: Change Password
  if (method === 'PUT' && path === '/api/users/me/password') {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    const userIdx = users.findIndex(u => u.id === payload.id);
    if (userIdx === -1) return sendJson(404, { message: 'User not found' });
    const { currentPassword, newPassword } = req.body;
    const user = users[userIdx];
    const expectedPassword = (user as any).password || 'password123';
    if (currentPassword !== expectedPassword) {
      return sendJson(400, { message: 'Current password is incorrect' });
    }
    (users[userIdx] as any).password = newPassword;
    return sendJson(200, { message: 'Password updated successfully' });
  }

  // Lots: Search
  if (method === 'GET' && path === '/api/lots') {
    const searchLat = parseFloat(req.query.lat as string);
    const searchLng = parseFloat(req.query.lng as string);
    const addressName = req.query.address as string || 'Search Location';

    if (!isNaN(searchLat) && !isNaN(searchLng)) {
      const nearbyLots = lots.filter(lot => {
        const distance = Math.sqrt(
          Math.pow(lot.latitude - searchLat, 2) + Math.pow(lot.longitude - searchLng, 2)
        ) * 111;
        return distance < 3;
      });

      if (nearbyLots.length === 0) {
        const shortName = addressName.split(',')[0].trim() || 'Local';
        const cleanName = shortName.toLowerCase().replace(/[^a-z0-9]/g, '');

        const dynamicLots = [
          {
            id: `lot-dynamic-1-${cleanName}`,
            ownerId: 'user-owner1-uuid',
            name: `${shortName} Central Parking`,
            description: `Convenient smart parking facility located in the central area of ${shortName}. Safe, secure, and monitored 24/7.`,
            address: `${shortName} Main Road`,
            city: shortName,
            state: 'TN',
            zipCode: '600000',
            latitude: searchLat + 0.0035,
            longitude: searchLng - 0.0021,
            totalSpots: 20,
            pricePerHour: 30.00,
            amenities: ['CCTV', 'COVERED', 'HANDICAP_ACCESS'],
            imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
            isActive: true,
          },
          {
            id: `lot-dynamic-2-${cleanName}`,
            ownerId: 'user-owner1-uuid',
            name: `${shortName} Express Spot`,
            description: `Quick and easy parking hub near major transit lines and markets in ${shortName}. EV charging available.`,
            address: `${shortName} Market Area`,
            city: shortName,
            state: 'TN',
            zipCode: '600000',
            latitude: searchLat - 0.0042,
            longitude: searchLng + 0.0038,
            totalSpots: 20,
            pricePerHour: 25.00,
            amenities: ['CCTV', 'EV_CHARGING', 'COVERED'],
            imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
            isActive: true,
          },
          {
            id: `lot-dynamic-3-${cleanName}`,
            ownerId: 'user-owner2-uuid',
            name: `${shortName} Safe Park Plaza`,
            description: `Premium secure parking with valet options and EV charging stations, serving visitors of ${shortName}.`,
            address: `${shortName} Bypass Junction`,
            city: shortName,
            state: 'TN',
            zipCode: '600000',
            latitude: searchLat + 0.0012,
            longitude: searchLng + 0.0045,
            totalSpots: 20,
            pricePerHour: 35.00,
            amenities: ['CCTV', 'VALET', 'EV_CHARGING'],
            imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
            isActive: true,
          }
        ];

        dynamicLots.forEach(dl => {
          if (!lots.some(l => l.id === dl.id)) {
            lots.push(dl);
            
            const spotTypes = [
              'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD',
              'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD',
              'COMPACT', 'COMPACT', 'COMPACT', 'COMPACT',
              'LARGE', 'LARGE',
              'HANDICAP', 'HANDICAP',
              'EV', 'EV'
            ];
            for (let i = 0; i < 20; i++) {
              const floor = Math.floor(i / 10) + 1;
              const spotNumber = `${String.fromCharCode(65 + floor - 1)}-${i % 10 + 1}`;
              spots.push({
                id: `spot-${dl.id}-${i}`,
                lotId: dl.id,
                spotNumber,
                type: spotTypes[i],
                floor,
                isActive: true,
              });
            }
          }
        });
      }
    }

    const mappedLots = lots.map(lot => {
      let distance = null;
      if (!isNaN(searchLat) && !isNaN(searchLng)) {
        distance = Math.sqrt(
          Math.pow(lot.latitude - searchLat, 2) + Math.pow(lot.longitude - searchLng, 2)
        ) * 111;
      }
      const lotReviews = reviews.filter(r => r.lotId === lot.id);
      const avgRating = lotReviews.length > 0 ? lotReviews.reduce((sum, r) => sum + r.rating, 0) / lotReviews.length : null;

      return {
        ...lot,
        avgRating,
        distance,
      };
    });

    // Filter lots that are within reasonable distance if a search occurred to keep search local
    const finalLots = (!isNaN(searchLat) && !isNaN(searchLng))
      ? mappedLots.filter(l => l.distance !== null && l.distance < 100)
      : mappedLots;

    return sendJson(200, { lots: finalLots });
  }

  // Lots: Get Details
  if (method === 'GET' && path.startsWith('/api/lots/')) {
    const lotId = path.split('/')[3];
    // Check if it's the spots query
    if (path.endsWith('/spots')) {
      const parentLotId = path.split('/')[3];
      // Get spots for lot
      const lotSpots = spots.filter(s => s.lotId === parentLotId).map(spot => {
        // Randomly assign states for demonstration
        const hash = spot.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        let status = 'free';
        if (hash % 5 === 0) status = 'taken';
        else if (hash % 7 === 0) status = 'locked';

        return {
          ...spot,
          status,
        };
      });
      return sendJson(200, lotSpots);
    }

    const lot = lots.find(l => l.id === lotId);
    if (!lot) return sendJson(404, { message: 'Lot not found' });
    const lotReviews = reviews.filter(r => r.lotId === lotId).map(r => {
      const user = users.find(u => u.id === r.userId);
      return {
        ...r,
        user: { name: user ? user.name : 'Unknown User' },
      };
    });
    const avgRating = lotReviews.length > 0 ? lotReviews.reduce((sum, r) => sum + r.rating, 0) / lotReviews.length : null;
    return sendJson(200, {
      ...lot,
      avgRating,
      reviews: lotReviews,
    });
  }

  // Reservations: List
  if (method === 'GET' && path === '/api/reservations') {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    
    const filtered = reservations.filter(r => r.userId === payload.id || payload.role === 'ADMIN');
    const mappedPromises = filtered.map(async (r) => {
      const lot = lots.find(l => l.id === r.lotId);
      const spotObj = spots.find(s => s.id === r.spotId);
      let qrCodeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      try {
        qrCodeImage = await QRCode.toDataURL(JSON.stringify({
          reservationId: r.id,
          userId: r.userId,
          lotId: r.lotId,
          spotId: r.spotId
        }));
      } catch (err) {
        // ignore
      }
      return {
        ...r,
        lot: lot ? { name: lot.name, address: lot.address, city: lot.city, state: lot.state } : null,
        spot: spotObj ? { spotNumber: spotObj.spotNumber } : { spotNumber: 'Unknown' },
        qrCodeImage,
      };
    });

    Promise.all(mappedPromises)
      .then((mappedReservations) => {
        return sendJson(200, { reservations: mappedReservations });
      })
      .catch((err) => {
        console.error('Failed mapping reservations:', err);
        return sendJson(500, { message: 'Internal server error' });
      });
    return;
  }

  // Reservations: Get Single (Details for BookingSuccess / Dashboard modal)
  if (method === 'GET' && path.startsWith('/api/reservations/')) {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    const resId = path.split('/')[3];
    if (resId && !resId.endsWith('cancel') && !resId.endsWith('extend')) {
      const r = reservations.find(res => res.id === resId);
      if (!r) return sendJson(404, { message: 'Reservation not found' });
      
      const lot = lots.find(l => l.id === r.lotId);
      const spotObj = spots.find(s => s.id === r.spotId);

      QRCode.toDataURL(JSON.stringify({
        reservationId: r.id,
        userId: r.userId,
        lotId: r.lotId,
        spotId: r.spotId
      })).then((qrCodeDataUrl) => {
        return sendJson(200, {
          ...r,
          lot: lot ? { name: lot.name, address: lot.address, city: lot.city, state: lot.state } : null,
          spot: spotObj ? { spotNumber: spotObj.spotNumber } : { spotNumber: 'Unknown' },
          qrCodeImage: qrCodeDataUrl,
        });
      }).catch((err) => {
        console.error('Mock QR generation failed:', err);
        return sendJson(200, {
          ...r,
          lot: lot ? { name: lot.name, address: lot.address, city: lot.city, state: lot.state } : null,
          spot: spotObj ? { spotNumber: spotObj.spotNumber } : { spotNumber: 'Unknown' },
          qrCodeImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        });
      });
      return;
    }
  }

  // Reservations: Create
  if (method === 'POST' && path === '/api/reservations') {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    const { lotId, spotId, startTime, endTime } = req.body;
    const lotObj = lots.find(l => l.id === lotId);
    if (!lotObj) return sendJson(404, { message: 'Lot not found' });

    const newResId = `res-${Date.now()}`;
    const durationHours = Math.ceil((new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60));
    const totalPrice = (lotObj.pricePerHour * durationHours).toFixed(2);

    const newReservation = {
      id: newResId,
      userId: payload.id,
      lotId,
      spotId,
      startTime,
      endTime,
      status: 'CONFIRMED',
      totalPrice,
      stripePaymentIntentId: `pi_mock_${Date.now()}`,
      qrCode: `qrcode_mock_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    reservations.push(newReservation);

    // Return Stripe Checkout URL redirecting directly to frontend BookingSuccess page
    const checkoutSuccessUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking/success?reservationId=${newResId}`;
    return sendJson(201, {
      message: 'Reservation created. Redirecting to checkout...',
      paymentUrl: checkoutSuccessUrl,
      reservationId: newResId,
    });
  }

  // Reservations: Cancel
  if (method === 'POST' && path.startsWith('/api/reservations/') && path.endsWith('/cancel')) {
    const resId = path.split('/')[3];
    const resIdx = reservations.findIndex(r => r.id === resId);
    if (resIdx === -1) return sendJson(404, { message: 'Reservation not found' });
    reservations[resIdx].status = 'CANCELLED';
    return sendJson(200, { message: 'Reservation cancelled successfully and refund issued.' });
  }

  // Reservations: Extend
  if (method === 'POST' && path.startsWith('/api/reservations/') && path.endsWith('/extend')) {
    const resId = path.split('/')[3];
    const resIdx = reservations.findIndex(r => r.id === resId);
    if (resIdx === -1) return sendJson(404, { message: 'Reservation not found' });
    const { newEndTime } = req.body;
    reservations[resIdx].endTime = newEndTime;
    const checkoutSuccessUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/booking/success?reservationId=${resId}`;
    return sendJson(200, { checkoutUrl: checkoutSuccessUrl });
  }

  // Reviews: Create
  if (method === 'POST' && path === '/api/reviews') {
    const payload = verifyRequestToken(req);
    if (!payload) return sendJson(401, { message: 'Unauthorized' });
    const { lotId, rating, comment } = req.body;
    const user = users.find(u => u.id === payload.id);
    
    // Check if user already reviewed
    const existingIdx = reviews.findIndex(r => r.userId === payload.id && r.lotId === lotId);
    if (existingIdx !== -1) {
      return sendJson(400, { message: 'You have already reviewed this parking lot.' });
    }

    const newReview = {
      id: `rev-${Date.now()}`,
      userId: payload.id,
      lotId,
      rating: Number(rating) || 5,
      comment: comment || '',
      createdAt: new Date().toISOString(),
      user: { name: user ? user.name : 'Unknown User' }
    };
    reviews.push(newReview);

    // Recalculate average rating for the lot
    const lotReviews = reviews.filter(r => r.lotId === lotId);
    const avgRating = lotReviews.reduce((sum, r) => sum + r.rating, 0) / lotReviews.length;
    const lotIdx = lots.findIndex(l => l.id === lotId);
    if (lotIdx !== -1) {
      lots[lotIdx].avgRating = avgRating;
    }

    return sendJson(201, {
      message: 'Review submitted successfully',
      review: newReview
    });
  }

  // Admin: Stats
  if (method === 'GET' && path === '/api/admin/stats') {
    return sendJson(200, {
      metrics: {
        totalUsers: users.length,
        totalLots: lots.length,
        totalSpots: spots.length,
        totalReservations: reservations.length,
        activeReservations: reservations.filter(r => r.status === 'CONFIRMED' || r.status === 'ACTIVE').length,
      },
      revenue: {
        total: '1080.00',
        today: '120.00',
        week: '450.00',
        month: '1080.00',
      },
    });
  }

  // Admin: Users
  if (method === 'GET' && path === '/api/admin/users') {
    const cleanedUsers = users.map(u => {
      const { password: _, ...userWithoutPassword } = u as any;
      return userWithoutPassword;
    });
    return sendJson(200, cleanedUsers);
  }

  // Admin: Lots
  if (method === 'GET' && path === '/api/admin/lots') {
    const mapped = lots.map(l => {
      const owner = users.find(u => u.id === l.ownerId);
      return {
        ...l,
        owner: owner ? { name: owner.name, email: owner.email } : { name: 'Unknown', email: 'unknown@example.com' },
      };
    });
    return sendJson(200, mapped);
  }

  // Fallback / pass-through
  next();
};
