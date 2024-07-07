// src/token/token.service.ts
import { Injectable, Logger, OnModuleInit, Inject, HttpException, HttpStatus, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClientProxy, EventPattern, Payload, NatsContext, Ctx } from '@nestjs/microservices';
import axios from 'axios';

@Injectable()
export class TokenService implements OnModuleInit {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('NATS_SERVICE') private natsClient: ClientProxy
  ) {}

  onModuleInit() {
    this.natsClient.connect().catch((err) => this.logger.error(`NATS connection error: ${err}`));
  }

  async upsertAccessKey(key: { key: string, rateLimit: number, expiresAt: Date }) {
    await this.prisma.accessKey.upsert({
      where: { key: key.key },
      update: { rateLimit: key.rateLimit, expiresAt: key.expiresAt },
      create: { key: key.key, rateLimit: key.rateLimit, expiresAt: key.expiresAt },
    });
    this.logger.log(`Upserted key: ${key.key}`);
  }

  async updateAccessKey(key: { key: string, rateLimit: number, expiresAt: Date }) {
    const existingKey = await this.prisma.accessKey.findUnique({ where: { key: key.key } });

    if (!existingKey) {
      this.logger.error(`Access key not found: ${key.key}`);
      throw new HttpException('Access key not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.accessKey.update({
      where: { key: key.key },
      data: { rateLimit: key.rateLimit, expiresAt: key.expiresAt },
    });
    this.logger.log(`Updated key: ${key.key}`);
  }

  async deleteAccessKey(key: string) {
    const existingKey = await this.prisma.accessKey.findUnique({ where: { key } });

    if (!existingKey) {
      this.logger.error(`Access key not found: ${key}`);
      throw new HttpException('Access key not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.accessKey.delete({
      where: { key },
    });
    this.logger.log(`Deleted key: ${key}`);
  }


  async validateKey(key: string): Promise<{ valid: boolean, reason?: string }> {
    const accessKey = await this.prisma.accessKey.findUnique({ where: { key } });

    if (!accessKey) {
      this.logger.warn(`Invalid key: ${key}`);
      return { valid: false, reason: 'Invalid key' };
    }

    if (new Date() > accessKey.expiresAt) {
      this.logger.warn(`Expired key: ${key}`);
      return { valid: false, reason: 'Expired key' };
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const requestCount = await this.prisma.requestLog.count({
      where: {
        accessKeyId: accessKey.id,
        timestamp: { gte: oneMinuteAgo },
      },
    });

    if (requestCount >= accessKey.rateLimit) {
      this.logger.warn(`Rate limit exceeded for key: ${key}`);
      return { valid: false, reason: 'Rate limit exceeded' };
    }

    this.logger.log(`Validated key: ${key}`);
    return { valid: true };
  }

  async logRequest(key: string, symbol: string, successful: boolean, message: string) {
    const accessKey = await this.prisma.accessKey.findUnique({ where: { key } });

    if (accessKey) {
      await this.prisma.requestLog.create({
        data: {
          accessKeyId: accessKey.id,
          successful,
          symbol,
          message,
        },
      });
      this.logger.log(`Logged request for key: ${key}, symbol: ${symbol}, successful: ${successful}, message: ${message}`);
    }
  }

  async fetchTokenInfo(key: string, symbol: string): Promise<any> {
    const { valid, reason } = await this.validateKey(key);
    if (!valid) {
      this.logger.error(`Invalid request with key: ${key}, reason: ${reason}`);
      const message = `Request failed: ${reason}`;
      await this.logRequest(key, symbol, false, message);
      switch(reason) {
        case 'Invalid key':
          throw new HttpException('Invalid key', HttpStatus.UNAUTHORIZED);
        case 'Expired key':
          throw new HttpException('Key has expired', HttpStatus.FORBIDDEN);
        case 'Rate limit exceeded':
          throw new HttpException('Rate limit has been exhausted', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    try {
      // Fetch detailed token info from CoinGecko
      const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${symbol}`);
      const data = response.data;

      if (!data) {
        const message = 'Token not found';
        await this.logRequest(key, symbol, false, message);
        throw new HttpException('Token not found', HttpStatus.NOT_FOUND);
      }

      // Extract the necessary fields from the response data
      const tokenInfo = {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        description: data.description.en,
        links: {
          homepage: data.links.homepage,
          blockchain_site: data.links.blockchain_site,
          twitter_screen_name: data.links.twitter_screen_name,
        },
        market_data: {
          current_price: data.market_data.current_price,
          market_cap: data.market_data.market_cap,
          total_volume: data.market_data.total_volume,
        },
        last_updated: data.last_updated,
      };

      const message = 'Request successfully completed';
      await this.logRequest(key, symbol, true, message);
      this.logger.log(`Fetched token info for symbol: ${symbol}`);
      return tokenInfo;
    } catch (error) {
      this.logger.error(`Error fetching token info: ${error.message}`);
      const message = 'Error fetching token info';
      await this.logRequest(key, symbol, false, message);
      if (error.response && error.response.status === 404) {
        throw new HttpException('Token not found', HttpStatus.NOT_FOUND);
      } else {
        throw new HttpException('Error fetching token info', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }

  async getLogs(key: string): Promise<any> {
    try {
      // Fetch logs related to the provided access key
      const logs = await this.prisma.requestLog.findMany({
        where: {
          accessKeyId: key,  // Filter by the access key ID
        },
        include: {
          AccessKey: true,  // Include related AccessKey data if needed
        },
      });

      if (!logs || logs.length === 0) {
        this.logger.error(`No logs found for key: ${key}`);
        throw new NotFoundException(`No logs found for key: ${key}`);
      }

      this.logger.log(`Fetched ${logs.length} logs for key: ${key}`);
      return logs;
    } catch (error) {
      // Log and throw an HTTP exception with a message
      this.logger.error(`Error fetching logs: ${error.message}`);
      throw new HttpException('Error fetching logs', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
