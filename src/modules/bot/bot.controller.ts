import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { MockBotService } from './mock-bot.service';

/**
 * Bot Controller for testing bot commands via HTTP
 * Useful when Telegram API is not accessible
 */
@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly mockBotService: MockBotService) {}

  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'MockBotService',
      message: 'Bot commands can be tested through these endpoints',
    };
  }

  @Post('command')
  async processCommand(
    @Body() body: {
      telegramId: number;
      username: string;
      command: string;
      args?: string[];
    },
  ) {
    const { telegramId, username, command, args } = body;
    
    this.logger.log(`Processing command: ${command} from user ${username}`);
    
    const response = await this.mockBotService.processCommand(
      telegramId,
      username,
      command,
      args,
    );

    return {
      success: true,
      response,
      command,
      user: { telegramId, username },
    };
  }

  @Post('test/:command')
  async testCommand(
    @Param('command') command: string,
    @Body() body: {
      telegramId?: number;
      username?: string;
      args?: string[];
    },
  ) {
    // Use default test user if not provided
    const telegramId = body.telegramId || 123456789;
    const username = body.username || 'testuser';
    
    const response = await this.mockBotService.processCommand(
      telegramId,
      username,
      `/${command}`,
      body.args,
    );

    return {
      success: true,
      response,
      command: `/${command}`,
      user: { telegramId, username },
    };
  }
}