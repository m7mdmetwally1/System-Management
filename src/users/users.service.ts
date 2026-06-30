import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUsers(tenantId: number) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: { tenant: true },
    });

    // Remove passwords from response
    return users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  async getUser(id: number, tenantId: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        tenantId,
      },
      include: { tenant: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
