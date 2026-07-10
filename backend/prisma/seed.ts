import { PrismaClient, Role, SpotType, ReservationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean database
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.parkingSpot.deleteMany();
  await prisma.parkingLot.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 12;
  const commonPasswordHash = await bcrypt.hash('password123', saltRounds);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@parkease.com',
      passwordHash: commonPasswordHash,
      name: 'System Admin',
      phone: '+15550100',
      role: Role.ADMIN,
    },
  });

  const owner1 = await prisma.user.create({
    data: {
      email: 'owner1@parkease.com',
      passwordHash: commonPasswordHash,
      name: 'John Owner',
      phone: '+15550201',
      role: Role.OWNER,
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      email: 'owner2@parkease.com',
      passwordHash: commonPasswordHash,
      name: 'Jane Owner',
      phone: '+15550202',
      role: Role.OWNER,
    },
  });

  const drivers = [];
  for (let i = 1; i <= 5; i++) {
    const driver = await prisma.user.create({
      data: {
        email: `driver${i}@parkease.com`,
        passwordHash: commonPasswordHash,
        name: `Driver User ${i}`,
        phone: `+1555030${i}`,
        role: Role.DRIVER,
      },
    });
    drivers.push(driver);
  }

  console.log(`Created ${1 + 2 + drivers.length} users.`);

  // 2. Create Parking Lots
  const lotsData = [
    {
      ownerId: owner1.id,
      name: 'Trichy Pettavaithalai Smart Parking',
      description: 'Smart parking facility near Pettavaithalai bus stand with 24/7 access, CCTV, and covered spots.',
      address: 'Pettavaithalai Bus Stand, Trichy',
      city: 'Tiruchirappalli',
      state: 'TN',
      zipCode: '639112',
      latitude: 10.8994891,
      longitude: 78.4929164,
      totalSpots: 20,
      pricePerHour: 30.00,
      amenities: ['CCTV', 'COVERED'],
      imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
      isActive: true,
    },
    {
      ownerId: owner1.id,
      name: 'Trichy Kaveri River Lot',
      description: 'Open-air parking space near the Kaveri river banks. Clean, spacious, and safe.',
      address: 'Kaveri River Road, Trichy',
      city: 'Tiruchirappalli',
      state: 'TN',
      zipCode: '639112',
      latitude: 10.9021,
      longitude: 78.4895,
      totalSpots: 15,
      pricePerHour: 20.00,
      amenities: ['CCTV'],
      imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
      isActive: true,
    },
    {
      ownerId: owner2.id,
      name: 'Trichy Pettavaithalai West Plaza',
      description: 'Secure, paved parking garage with handicap access and CCTV security monitoring.',
      address: 'West Pettavaithalai St, Trichy',
      city: 'Tiruchirappalli',
      state: 'TN',
      zipCode: '639112',
      latitude: 10.8975,
      longitude: 78.4950,
      totalSpots: 25,
      pricePerHour: 25.00,
      amenities: ['CCTV', 'HANDICAP_ACCESS'],
      imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
      isActive: true,
    },
    {
      ownerId: owner2.id,
      name: 'Pettavaithalai Market Space',
      description: 'Premium parking right next to the local market area. Includes EV charging stations.',
      address: 'Main Market Road, Pettavaithalai',
      city: 'Tiruchirappalli',
      state: 'TN',
      zipCode: '639112',
      latitude: 10.8988,
      longitude: 78.4912,
      totalSpots: 30,
      pricePerHour: 35.00,
      amenities: ['CCTV', 'EV_CHARGING', 'COVERED'],
      imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
      isActive: true,
    },
    {
      ownerId: owner1.id,
      name: 'T. Nagar Smart Parking',
      description: 'Multi-level smart parking facility in the heart of T. Nagar shopping district. Close to Ranganathan Street with 24/7 CCTV and covered parking.',
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
      ownerId: owner2.id,
      name: 'Anna Nagar Tower Parking',
      description: 'Spacious multi-story parking near Anna Nagar Tower Park. EV charging available.',
      address: '2nd Avenue, Anna Nagar',
      city: 'Chennai',
      state: 'TN',
      zipCode: '600040',
      latitude: 13.0850,
      longitude: 80.2101,
      totalSpots: 20,
      pricePerHour: 35.00,
      amenities: ['CCTV', 'EV_CHARGING', 'COVERED'],
      imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
      isActive: true,
    },
    {
      ownerId: owner1.id,
      name: 'Chennai Express Hub',
      description: 'Central express parking plaza with prompt valet support and full CCTV coverage.',
      address: 'Anna Salai, Chennai',
      city: 'Chennai',
      state: 'TN',
      zipCode: '600002',
      latitude: 13.0610,
      longitude: 80.2612,
      totalSpots: 40,
      pricePerHour: 45.00,
      amenities: ['CCTV', 'VALET', 'COVERED'],
      imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
      isActive: true,
    },
    {
      ownerId: owner2.id,
      name: 'Adyar Plaza Plaza',
      description: 'Modern parking plaza near IT park entrances. EV charging and accessibility ramps available.',
      address: 'Adyar Signal, Chennai',
      city: 'Chennai',
      state: 'TN',
      zipCode: '600020',
      latitude: 13.0075,
      longitude: 80.2520,
      totalSpots: 22,
      pricePerHour: 30.00,
      amenities: ['CCTV', 'EV_CHARGING', 'HANDICAP_ACCESS'],
      imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
      isActive: true,
    },
    {
      ownerId: owner1.id,
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
      ownerId: owner1.id,
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
      ownerId: owner2.id,
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
      ownerId: owner2.id,
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
      ownerId: owner1.id,
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
      ownerId: owner2.id,
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
      ownerId: owner1.id,
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
      ownerId: owner2.id,
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
    },
    {
      ownerId: owner1.id,
      name: 'Manhattan Central Parking',
      description: 'Secure multi-story parking garage located right in midtown. Features EV charging and 24/7 CCTV surveillance.',
      address: '152 W 45th St',
      city: 'New York',
      state: 'NY',
      zipCode: '10036',
      latitude: 40.7578,
      longitude: -73.9857,
      totalSpots: 20,
      pricePerHour: 15.00,
      amenities: ['CCTV', 'COVERED', 'EV_CHARGING'],
      imageUrls: ['https://images.unsplash.com/photo-1506521788723-858111656a3c?w=600'],
      isActive: true,
    },
    {
      ownerId: owner1.id,
      name: 'SOMA Parking Plaza',
      description: 'Convenient open-air and covered lot in San Francisco South of Market. Easy access to local tech hubs and restaurants.',
      address: '450 Mission St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      latitude: 37.7897,
      longitude: -122.3998,
      totalSpots: 20,
      pricePerHour: 12.50,
      amenities: ['CCTV', 'HANDICAP_ACCESS'],
      imageUrls: ['https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600'],
      isActive: true,
    },
    {
      ownerId: owner2.id,
      name: 'Chicago Loop Express Parking',
      description: 'Fully automated underground parking system near Millennium Park. Quick check-in/out and premier spot sizing.',
      address: '201 E Randolph St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      latitude: 41.8827,
      longitude: -87.6227,
      totalSpots: 20,
      pricePerHour: 18.00,
      amenities: ['COVERED', 'CCTV', 'VALET'],
      imageUrls: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600'],
      isActive: true,
    },
  ];

  const lots = [];
  for (const lotDataObj of lotsData) {
    const lot = await prisma.parkingLot.create({
      data: lotDataObj,
    });
    lots.push(lot);
  }
  console.log(`Created ${lots.length} parking lots.`);

  // 3. Create 20 spots per lot (mix of types)
  const spotTypes = [
    SpotType.STANDARD, SpotType.STANDARD, SpotType.STANDARD, SpotType.STANDARD, SpotType.STANDARD,
    SpotType.STANDARD, SpotType.STANDARD, SpotType.STANDARD, SpotType.STANDARD, SpotType.STANDARD,
    SpotType.COMPACT, SpotType.COMPACT, SpotType.COMPACT, SpotType.COMPACT,
    SpotType.LARGE, SpotType.LARGE,
    SpotType.HANDICAP, SpotType.HANDICAP,
    SpotType.EV, SpotType.EV
  ];

  const allSpots = [];
  for (const lot of lots) {
    for (let i = 0; i < 20; i++) {
      const floor = Math.floor(i / 10) + 1;
      const spotNumber = `${String.fromCharCode(65 + floor - 1)}-${i % 10 + 1}`; // e.g. A-1 to A-10, B-1 to B-10
      const spot = await prisma.parkingSpot.create({
        data: {
          lotId: lot.id,
          spotNumber,
          type: spotTypes[i],
          floor,
          isActive: true,
        },
      });
      allSpots.push(spot);
    }
  }
  console.log(`Created ${allSpots.length} parking spots.`);

  // 4. Create 10 past completed reservations with reviews
  const pastReservations = [
    { offsetDaysStart: -5, durationHours: 3, driverIdx: 0, lotIdx: 0, rating: 5, comment: 'Excellent location, very clean.' },
    { offsetDaysStart: -4, durationHours: 2, driverIdx: 1, lotIdx: 0, rating: 4, comment: 'A bit tight on spaces, but great CCTV security.' },
    { offsetDaysStart: -3, durationHours: 4, driverIdx: 2, lotIdx: 0, rating: 5, comment: 'Loved the EV charging speed!' },
    { offsetDaysStart: -5, durationHours: 5, driverIdx: 3, lotIdx: 1, rating: 4, comment: 'Convenient to SOMA offices.' },
    { offsetDaysStart: -4, durationHours: 1, driverIdx: 4, lotIdx: 1, rating: 3, comment: 'Slightly overpriced for open space, but good service.' },
    { offsetDaysStart: -3, durationHours: 6, driverIdx: 0, lotIdx: 1, rating: 5, comment: 'Fantastic service and helpful staff.' },
    { offsetDaysStart: -2, durationHours: 2, driverIdx: 1, lotIdx: 2, rating: 5, comment: 'Extremely quick automated parking!' },
    { offsetDaysStart: -1, durationHours: 3, driverIdx: 2, lotIdx: 2, rating: 4, comment: 'Nice and cool underground garage.' },
    { offsetDaysStart: -2, durationHours: 4, driverIdx: 3, lotIdx: 2, rating: 5, comment: 'Perfect location for Millennium Park visit.' },
    { offsetDaysStart: -1, durationHours: 2, driverIdx: 4, lotIdx: 0, rating: 4, comment: 'Safe and secure, recommended.' },
  ];

  for (let i = 0; i < pastReservations.length; i++) {
    const resInfo = pastReservations[i];
    const driver = drivers[resInfo.driverIdx];
    const lot = lots[resInfo.lotIdx];
    // Find a spot in that lot
    const lotSpots = allSpots.filter(s => s.lotId === lot.id);
    const spot = lotSpots[i % lotSpots.length]; // cycle spots

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + resInfo.offsetDaysStart);
    const endTime = new Date(startTime.getTime() + resInfo.durationHours * 60 * 60 * 1000);

    const priceDecimal = Number(lot.pricePerHour) * resInfo.durationHours;

    const reservation = await prisma.reservation.create({
      data: {
        userId: driver.id,
        lotId: lot.id,
        spotId: spot.id,
        startTime,
        endTime,
        status: ReservationStatus.COMPLETED,
        totalPrice: priceDecimal,
        stripePaymentIntentId: `pi_mock_past_${i}`,
        qrCode: `qrcode_mock_past_${i}`,
      },
    });

    // Create review
    await prisma.review.create({
      data: {
        userId: driver.id,
        lotId: lot.id,
        rating: resInfo.rating,
        comment: resInfo.comment,
        createdAt: new Date(endTime.getTime() + 10 * 60 * 1000), // reviewed 10 min after end
      },
    });
  }
  console.log('Created 10 past completed reservations and reviews.');

  // 5. Create 3 upcoming reservations
  const upcomingReservations = [
    { offsetHoursStart: 2, durationHours: 3, driverIdx: 0, lotIdx: 0 },
    { offsetHoursStart: 24, durationHours: 4, driverIdx: 1, lotIdx: 1 },
    { offsetHoursStart: 48, durationHours: 2, driverIdx: 2, lotIdx: 2 },
  ];

  for (let i = 0; i < upcomingReservations.length; i++) {
    const resInfo = upcomingReservations[i];
    const driver = drivers[resInfo.driverIdx];
    const lot = lots[resInfo.lotIdx];
    const lotSpots = allSpots.filter(s => s.lotId === lot.id);
    // Use the last spot to avoid overlaps with past test data
    const spot = lotSpots[lotSpots.length - 1 - i];

    const startTime = new Date();
    startTime.setHours(startTime.getHours() + resInfo.offsetHoursStart);
    const endTime = new Date(startTime.getTime() + resInfo.durationHours * 60 * 60 * 1000);

    const priceDecimal = Number(lot.pricePerHour) * resInfo.durationHours;

    await prisma.reservation.create({
      data: {
        userId: driver.id,
        lotId: lot.id,
        spotId: spot.id,
        startTime,
        endTime,
        status: ReservationStatus.CONFIRMED,
        totalPrice: priceDecimal,
        stripePaymentIntentId: `pi_mock_upc_${i}`,
        qrCode: `qrcode_mock_upc_${i}`,
      },
    });
  }
  console.log('Created 3 upcoming reservations.');

  console.log('Database seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
