import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function createTenant(tenantName: string) {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
      },
    });

    console.log('✅ Tenant created successfully!');
    console.log(`Tenant ID: ${tenant.id}`);
    console.log(`Tenant Name: ${tenant.name}`);
    console.log(`Created At: ${tenant.createdAt}`);
    
    return tenant;
  } catch (error) {
    console.error('❌ Error creating tenant:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get tenant name from command line argument
const tenantName = process.argv[2];

if (!tenantName) {
  console.error('❌ Error: Tenant name is required');
  console.log('Usage: node scripts/create-tenant.ts "Company Name"');
  process.exit(1);
}

createTenant(tenantName);
