import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { SendInviteDto } from './dto/send-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Inject } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { addHours, addDays, addMinutes } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    @Inject(MailerService) private mailer: MailerService,
    private jwtService: JwtService,
  ) {}

  async sendInvite(sendInviteDto: SendInviteDto) {
    const { email, tenantId } = sendInviteDto;

    // 1. Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // 2. Generate secure token
    const token = randomBytes(32).toString('hex');

    // 3. Set expiration (24 hours from now)
    const expiresAt = addHours(new Date(), 24);

    // 4. Save invite to database
    await this.prisma.invite.create({
      data: {
        email,
        tenantId,
        token,
        expiresAt,
      },
    });

    // 5. Send email with invite link
    const inviteLink = `https://your-frontend-app.com/accept-invite?token=${token}`;

    await this.mailer.sendMail({
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

    return { message: 'Invite sent successfully' };
  }

  async acceptInvite(acceptInviteDto: AcceptInviteDto) {
    const { token, password } = acceptInviteDto;

    // 1. Find valid invite
    const invite = await this.prisma.invite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite token');
    }

    if (invite.used) {
      throw new ConflictException('Invite already used');
    }

    if (invite.expiresAt < new Date()) {
      throw new ConflictException('Invite has expired');
    }

    // 2. Check if user already exists in this tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email_tenantId: {
          email: invite.email,
          tenantId: invite.tenantId,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists in this tenant');
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user
    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        password: hashedPassword,
        tenantId: invite.tenantId,
        role: 'ADMIN', // First user from invite is admin
      },
    });

    // 5. Mark invite as used
    await this.prisma.invite.update({
      where: { id: invite.id },
      data: { used: true },
    });

    // 6. Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    const { email, password, tenantId } = loginDto;

    // 1. Find user by email and tenantId
    const user = await this.prisma.user.findUnique({
      where: {
        email_tenantId: {
          email,
          tenantId,
        },
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is locked. Please try again later.',
      );
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;

      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
            lockedUntil: addMinutes(new Date(), 15), // Lock for 15 minutes
          },
        });
        throw new UnauthorizedException(
          'Too many failed login attempts. Account locked for 15 minutes.',
        );
      } else {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: newFailedAttempts,
          },
        });
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    // 4. Reset failed login attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 5. Generate JWT token
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    // 6. Generate refresh token
    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenExpiresAt = addDays(new Date(), 7);

    // 7. Store refresh token in user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken,
        refreshTokenExpiresAt,
      },
    });

    // 8. Return tokens and user info
    const { password: _, ...userWithoutPassword } = user;

    return {
      access_token: token,
      refresh_token: refreshToken,
      user: userWithoutPassword,
    };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async refresh(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    // 1. Find user with this refresh token
    const user = await this.prisma.user.findFirst({
      where: {
        refreshToken,
        refreshTokenExpiresAt: { gt: new Date() },
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Generate new access token
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const newAccessToken = this.jwtService.sign(payload);

    // 3. Return new access token
    return {
      access_token: newAccessToken,
    };
  }

  async logout(userId: number) {
    // 1. Clear refresh token
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });

    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email, tenantId } = forgotPasswordDto;

    // 1. Find user by email and tenantId
    const user = await this.prisma.user.findUnique({
      where: {
        email_tenantId: {
          email,
          tenantId,
        },
      },
    });

    if (!user) {
      // For security, don't reveal if user exists
      return { message: 'If user exists, password reset email sent' };
    }

    // 2. Generate secure reset token
    const resetToken = randomBytes(32).toString('hex');

    // 3. Set expiration (1 hour from now)
    const resetTokenExpiresAt = addHours(new Date(), 1);

    // 4. Store token and expiration in user record
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiresAt,
      },
    });

    // 5. Send email with reset link
    const resetLink = `https://your-frontend-app.com/reset-password?token=${resetToken}`;

    await this.mailer.sendMail({
      to: email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}. This link will expire in 1 hour.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return { message: 'Password reset email sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    // 1. Find user by reset token
    const user = await this.prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid reset token');
    }

    // 2. Verify token is not expired
    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Reset token has expired');
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
  }
}
