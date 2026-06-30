import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../src/app.module';

async function generateSwaggerSpec() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('System Management API')
    .setDescription('API documentation for System Management SaaS platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Write the spec to a JSON file
  writeFileSync('./swagger-spec.json', JSON.stringify(document, null, 2));
  
  console.log('Swagger spec generated successfully: swagger-spec.json');
  
  await app.close();
}

generateSwaggerSpec();
