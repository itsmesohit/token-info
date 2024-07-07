// src/nats/nats.module.ts
import { Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { NatsService } from './nats.service';

@Module({
  providers: [
    {
      provide: 'NATS_SERVICE',
      useFactory: () => {
        return ClientProxyFactory.create({
          transport: Transport.NATS,
          options: {
            url: 'nats://localhost:4222',
          },
        });
      },
    },
    NatsService,
  ],
  exports: ['NATS_SERVICE', NatsService],
})
export class NatsModule {}
