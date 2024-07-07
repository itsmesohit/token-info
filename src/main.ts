
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure and connect the microservice
  app.connectMicroservice({
    transport: Transport.NATS,
    options: {
      url: 'nats://localhost:4222',
    },
  });

  // Start all microservices and handle errors
  try {
    await app.startAllMicroservices();
    console.log('Microservices started successfully');
  } catch (err) {
    console.error('Error starting microservices', err);
  }

  // Start the main application
  try {
    await app.listen(3003);
    console.log('Application is running on port 3003');
  } catch (err) {
    console.error('Error starting application', err);
  }
}

bootstrap();
