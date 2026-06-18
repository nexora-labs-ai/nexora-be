import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed default categories
  const categories = [
    { name: 'Food & Drinks', icon: '🍔', color: '#FF6B6B', isDefault: true },
    { name: 'Transport', icon: '🚗', color: '#4ECDC4', isDefault: true },
    { name: 'Accommodation', icon: '🏨', color: '#45B7D1', isDefault: true },
    { name: 'Activities', icon: '🎯', color: '#96CEB4', isDefault: true },
    { name: 'Shopping', icon: '🛍️', color: '#FFEAA7', isDefault: true },
    { name: 'Entertainment', icon: '🎬', color: '#DDA0DD', isDefault: true },
    { name: 'Healthcare', icon: '🏥', color: '#98FB98', isDefault: true },
    { name: 'Utilities', icon: '💡', color: '#F0E68C', isDefault: true },
    { name: 'Other', icon: '📌', color: '#D3D3D3', isDefault: true },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: category.name }
    });
    if (!existing) {
      await prisma.category.create({
        data: category,
      });
    }
  }

  console.log('✅ Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
