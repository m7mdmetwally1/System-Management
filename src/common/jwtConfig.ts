export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  signOptions: { expiresIn: '1m' as const },
};
