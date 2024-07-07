// src/token/token.module.ts
import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokenController } from './token.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NatsModule } from '../nats/nats.module';

@Module({
  imports: [PrismaModule, NatsModule],
  providers: [TokenService],
  controllers: [TokenController],
})
export class TokenModule {}
