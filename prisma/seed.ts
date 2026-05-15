import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const units = [
  {
    code: '1A',
    type: '1BR',
    rooms: 1,
    areaSqm: 37.85,
    priceMin: 13_749_400,
    status: 'available',
    view: 'Courtyard',
    floor: '2-5',
    features: JSON.stringify(['Балкон', 'Кухня-гостиная', 'Санузел']),
    floorPlan: 'https://static.tildacdn.pro/tild6563-3766-4836-a662-636634613066/1.png',
  },
  {
    code: '1B',
    type: '1BR',
    rooms: 1,
    areaSqm: 29.89,
    priceMin: 12_000_000,
    status: 'available',
    view: 'Courtyard',
    floor: '2-5',
    features: JSON.stringify(['Компактная планировка', 'Санузел', 'Кухня-гостиная']),
    floorPlan: 'https://static.tildacdn.pro/tild6662-6130-4161-a332-393036383035/1.png',
  },
  {
    code: '1V',
    type: '1BR',
    rooms: 1,
    areaSqm: 45.66,
    priceMin: 15_500_000,
    status: 'available',
    view: 'Mountain',
    floor: '3-6',
    features: JSON.stringify(['Панорамный вид', 'Балкон', 'Просторная кухня']),
    floorPlan: 'https://static.tildacdn.pro/tild3833-3635-4038-b331-346132346161/1.png',
  },
  {
    code: '2A',
    type: '2BR',
    rooms: 2,
    areaSqm: 51.33,
    priceMin: 20_300_000,
    status: 'available',
    view: 'Mountain',
    floor: '2-6',
    features: JSON.stringify(['2 спальни', 'Балкон', 'Раздельный санузел', 'Кухня-гостиная']),
    floorPlan: 'https://static.tildacdn.pro/tild3939-3761-4666-a239-646366333532/2.png',
  },
  {
    code: '2B',
    type: '2BR',
    rooms: 2,
    areaSqm: 45.73,
    priceMin: 19_500_000,
    status: 'available',
    view: 'Courtyard',
    floor: '2-5',
    features: JSON.stringify(['2 спальни', 'Компактная планировка', 'Санузел']),
    floorPlan: 'https://static.tildacdn.pro/tild6365-3630-4234-b566-613630363036/2.png',
  },
  {
    code: '2V',
    type: '2BR',
    rooms: 2,
    areaSqm: 45.42,
    priceMin: 19_200_000,
    status: 'reserved',
    view: 'Mountain',
    floor: '4-6',
    features: JSON.stringify(['2 спальни', 'Горный вид', 'Балкон']),
    floorPlan: 'https://static.tildacdn.pro/tild3462-3031-4839-b638-626631316438/2.png',
  },
  {
    code: '3A',
    type: '3BR',
    rooms: 3,
    areaSqm: 77.60,
    priceMin: 32_500_000,
    status: 'available',
    view: 'Mountain',
    floor: '2-5',
    features: JSON.stringify(['3 спальни', 'Просторная гостиная', '2 балкона', 'Раздельный санузел']),
    floorPlan: 'https://static.tildacdn.pro/tild3435-3261-4134-a563-656136323962/3.png',
  },
  {
    code: '3B',
    type: '3BR',
    rooms: 3,
    areaSqm: 78.75,
    priceMin: 33_000_000,
    status: 'sold',
    view: 'Courtyard',
    floor: '2-4',
    features: JSON.stringify(['3 спальни', 'Максимальная площадь', '2 балкона', 'Кладовая']),
    floorPlan: 'https://static.tildacdn.pro/tild3032-3766-4262-b930-383663653632/3.png',
  },
];

async function main() {
  console.log('🌱 Seeding KERUEN units...');

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { code: unit.code },
      update: unit,
      create: unit,
    });
    console.log(`  ✅ Unit ${unit.code} (${unit.type}) — ${unit.priceMin.toLocaleString()} ₸`);
  }

  console.log('\n🎉 Seed complete! 8 KERUEN units loaded.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
