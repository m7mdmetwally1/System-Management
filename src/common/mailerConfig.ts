import { ConfigService } from '@nestjs/config';

export const mailerConfig = (configService: ConfigService) => ({
  transport: {
    host: configService.get('SMTP_HOST') || 'smtp.gmail.com',
    port: parseInt(configService.get('SMTP_PORT') || '587'),
    secure: false,
    auth: {
      user: configService.get('SMTP_USER'),
      pass: configService.get('SMTP_PASSWORD'),
    },
  },
  defaults: {
    from: configService.get('SMTP_FROM') || 'noreply@yourapp.com',
  },
});
