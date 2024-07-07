// src/app.module.ts
import { Module } from '@nestjs/common';
import { TokenModule } from './token/token.module';
import { PrismaModule } from './prisma/prisma.module';
import { NatsService } from './nats/nats.service';
import { NatsModule } from './nats/nats.module';

@Module({
  imports: [TokenModule, PrismaModule, NatsModule],
  providers: [NatsService],
})
export class AppModule {}
