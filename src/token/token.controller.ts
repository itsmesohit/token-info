// src/token/token.controller.ts
import { Controller, Get, Query, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { TokenService } from './token.service';

@Controller('token')
export class TokenController {
  private readonly logger = new Logger(TokenController.name);

  constructor(private readonly tokenService: TokenService) {}

  @EventPattern('key_created')
  async handleKeyCreated(@Payload() data: any, @Ctx() context: NatsContext) {
    this.logger.log(`Received key_created event with data: ${JSON.stringify(data)}`);
    await this.tokenService.upsertAccessKey({
      key: data.key,
      rateLimit: data.rateLimit,
      expiresAt: data.expiresAt,
    });
    this.logger.log(`Handled key creation: ${data.key}`);
  }

  @EventPattern('key_updated')
  async handleKeyUpdated(@Payload() data: any, @Ctx() context: NatsContext) {
    this.logger.log(`Received key_updated event with data: ${JSON.stringify(data)}`);
    await this.tokenService.updateAccessKey({
      key: data.key,
      rateLimit: data.rateLimit,
      expiresAt: data.expiresAt,
    });
    this.logger.log(`Handled key update: ${data.key}`);
  }

  @EventPattern('key_deleted')
  async handleKeyDeleted(@Payload() data: any, @Ctx() context: NatsContext) {
    this.logger.log(`Received key_deleted event with data: ${JSON.stringify(data)}`);
    await this.tokenService.deleteAccessKey(data.key);
    this.logger.log(`Handled key deletion: ${data.key}`);
  }

  @Get('hello')
  async getHello() {
    return 'Hello from token service!';
  }

  @Get('info')
  async getTokenInfo(@Query('key') key: string, @Query('symbol') symbol: string) {
    this.logger.log(`Received request for token info: key=${key}, symbol=${symbol}`);
    const tokenInfo = await this.tokenService.fetchTokenInfo(key, symbol);
    this.logger.log(`Fetched token info: ${JSON.stringify(tokenInfo)}`);
    return tokenInfo;
  }
}
