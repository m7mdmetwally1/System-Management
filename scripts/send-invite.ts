import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes } from 'crypto';
import { addHours } from 'date-fns';
import * as nodemailer from 'nodemailer';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function sendInvite(email: string, tenantId: number, role: string = 'ADMIN') {
  try {
    // 1. Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      console.error('❌ Error: Tenant not found');
      console.log(`Tenant ID: ${tenantId}`);
      process.exit(1);
    }

    // 2. Generate secure token
    const token = randomBytes(32).toString('hex');

    // 3. Set expiration (24 hours from now)
    const expiresAt = addHours(new Date(), 24);

    // 4. Save invite to database
    const invite = await prisma.invite.create({
      data: {
        email,
        tenantId,
        token,
        expiresAt,
        role: role as any,
      },
    });

    // 5. Send email with invite link
    const inviteLink = `https://your-frontend-app.com/accept-invite?token=${token}`;

    // Configure mailer (use environment variables or defaults)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'your-email@example.com',
        pass: process.env.SMTP_PASSWORD || 'your-password',
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@yourapp.com',
      to: email,
      subject: 'You are invited to join',
      text: `You have been invited to join ${tenant.name}. Click the link to set your password: ${inviteLink}`,
      html: `
        <h2>You are invited to join ${tenant.name}</h2>
        <p>Click the link below to set your password and complete your registration:</p>
        <a href="${inviteLink}">Set Password</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    console.log('✅ Invitation sent successfully!');
    console.log(`Email: ${email}`);
    console.log(`Tenant: ${tenant.name} (ID: ${tenantId})`);
    console.log(`Role: ${role}`);
    console.log(`Invite Token: ${token}`);
    console.log(`Expires At: ${expiresAt}`);
    
  } catch (error) {
    console.error('❌ Error sending invitation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments from command line
const email = process.argv[2];
const tenantId = parseInt(process.argv[3]);
const role = process.argv[4] || 'ADMIN';

if (!email || !tenantId) {
  console.error('❌ Error: Email and tenant ID are required');
  console.log('Usage: node scripts/send-invite.ts "user@company.com" <tenantId> [role]');
  console.log('Example: node scripts/send-invite.ts "user@company.com" 1 "ADMIN"');
  console.log('Roles: USER, ADMIN, SUPER_ADMIN (default: ADMIN)');
  process.exit(1);
}

// Validate role
const validRoles = ['USER', 'ADMIN', 'SUPER_ADMIN'];
if (!validRoles.includes(role)) {
  console.error('❌ Error: Invalid role');
  console.log(`Valid roles: ${validRoles.join(', ')}`);
  process.exit(1);
}

sendInvite(email, tenantId, role);
