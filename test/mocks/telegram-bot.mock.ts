import { Context, Telegraf } from 'telegraf';

/**
 * Mock implementation of Telegram Bot for testing
 */
export class MockTelegramBot {
  public sentMessages: any[] = [];
  public editedMessages: any[] = [];
  public deletedMessages: any[] = [];
  public callbacks: Map<string, Function> = new Map();

  // Mock Telegraf methods
  command = jest.fn((command: string, handler: Function) => {
    this.callbacks.set(`command:${command}`, handler);
    return this;
  });

  action = jest.fn((action: string, handler: Function) => {
    this.callbacks.set(`action:${action}`, handler);
    return this;
  });

  on = jest.fn((event: string, handler: Function) => {
    this.callbacks.set(`on:${event}`, handler);
    return this;
  });

  launch = jest.fn().mockResolvedValue(undefined);
  stop = jest.fn().mockResolvedValue(undefined);

  telegram = {
    sendMessage: jest.fn(async (chatId: number, text: string, options?: any) => {
      const message = {
        message_id: Math.floor(Math.random() * 1000000),
        chat: { id: chatId },
        text,
        date: Math.floor(Date.now() / 1000),
        ...options,
      };
      this.sentMessages.push(message);
      return message;
    }),

    editMessageText: jest.fn(async (chatId: number, messageId: number, inlineMessageId: undefined, text: string, options?: any) => {
      const editedMessage = {
        message_id: messageId,
        chat: { id: chatId },
        text,
        date: Math.floor(Date.now() / 1000),
        ...options,
      };
      this.editedMessages.push(editedMessage);
      return editedMessage;
    }),

    deleteMessage: jest.fn(async (chatId: number, messageId: number) => {
      const deletedMessage = { chat_id: chatId, message_id: messageId };
      this.deletedMessages.push(deletedMessage);
      return true;
    }),

    answerCallbackQuery: jest.fn(async (callbackQueryId: string, text?: string) => {
      return { callback_query_id: callbackQueryId, text };
    }),

    getMe: jest.fn().mockResolvedValue({
      id: 123456789,
      is_bot: true,
      first_name: 'Test Bot',
      username: 'testbot',
    }),

    setMyCommands: jest.fn().mockResolvedValue(true),
    getMyCommands: jest.fn().mockResolvedValue([]),
  };

  /**
   * Helper method to simulate incoming messages
   */
  simulateMessage(text: string, options: any = {}): Context {
    const message = {
      message_id: Math.floor(Math.random() * 1000000),
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test User',
        username: 'testuser',
        ...options.from,
      },
      chat: {
        id: 123456789,
        type: 'private',
        ...options.chat,
      },
      date: Math.floor(Date.now() / 1000),
      text,
      ...options.message,
    };

    const context = {
      message,
      from: message.from,
      chat: message.chat,
      reply: jest.fn(async (text: string, extra?: any) => {
        return this.telegram.sendMessage(message.chat.id, text, extra);
      }),
      replyWithMarkdown: jest.fn(async (text: string, extra?: any) => {
        return this.telegram.sendMessage(message.chat.id, text, { parse_mode: 'Markdown', ...extra });
      }),
      replyWithHTML: jest.fn(async (text: string, extra?: any) => {
        return this.telegram.sendMessage(message.chat.id, text, { parse_mode: 'HTML', ...extra });
      }),
      editMessageText: jest.fn(async (text: string, extra?: any) => {
        return this.telegram.editMessageText(message.chat.id, message.message_id, undefined, text, extra);
      }),
      deleteMessage: jest.fn(async (messageId?: number) => {
        return this.telegram.deleteMessage(message.chat.id, messageId || message.message_id);
      }),
      telegram: this.telegram,
      ...options.context,
    } as any;

    return context;
  }

  /**
   * Helper method to simulate callback queries
   */
  simulateCallbackQuery(data: string, options: any = {}): Context {
    const callbackQuery = {
      id: `callback_${Date.now()}`,
      from: {
        id: 123456789,
        is_bot: false,
        first_name: 'Test User',
        username: 'testuser',
        ...options.from,
      },
      message: {
        message_id: Math.floor(Math.random() * 1000000),
        chat: {
          id: 123456789,
          type: 'private',
          ...options.chat,
        },
        date: Math.floor(Date.now() / 1000),
        text: 'Original message',
        ...options.message,
      },
      data,
      ...options.callbackQuery,
    };

    const context = {
      callbackQuery,
      from: callbackQuery.from,
      chat: callbackQuery.message.chat,
      message: callbackQuery.message,
      answerCbQuery: jest.fn(async (text?: string, showAlert?: boolean) => {
        return this.telegram.answerCallbackQuery(callbackQuery.id, text);
      }),
      editMessageText: jest.fn(async (text: string, extra?: any) => {
        return this.telegram.editMessageText(
          callbackQuery.message.chat.id,
          callbackQuery.message.message_id,
          undefined,
          text,
          extra
        );
      }),
      reply: jest.fn(async (text: string, extra?: any) => {
        return this.telegram.sendMessage(callbackQuery.message.chat.id, text, extra);
      }),
      telegram: this.telegram,
      ...options.context,
    } as any;

    return context;
  }

  /**
   * Helper method to trigger registered handlers
   */
  async triggerCommand(command: string, context: Context): Promise<void> {
    const handler = this.callbacks.get(`command:${command}`);
    if (handler) {
      await handler(context);
    }
  }

  async triggerAction(action: string, context: Context): Promise<void> {
    const handler = this.callbacks.get(`action:${action}`);
    if (handler) {
      await handler(context);
    }
  }

  /**
   * Reset all mocks and state
   */
  reset(): void {
    this.sentMessages = [];
    this.editedMessages = [];
    this.deletedMessages = [];
    this.callbacks.clear();
    
    // Reset all jest mocks
    Object.values(this.telegram).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockClear();
      }
    });
    
    this.command.mockClear();
    this.action.mockClear();
    this.on.mockClear();
    this.launch.mockClear();
    this.stop.mockClear();
  }

  /**
   * Get the last sent message
   */
  getLastSentMessage(): any {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  /**
   * Get all messages sent to a specific chat
   */
  getMessagesByChat(chatId: number): any[] {
    return this.sentMessages.filter(msg => msg.chat.id === chatId);
  }

  /**
   * Check if a specific message was sent
   */
  wasMessageSent(text: string, chatId?: number): boolean {
    return this.sentMessages.some(msg => 
      msg.text.includes(text) && (!chatId || msg.chat.id === chatId)
    );
  }

  /**
   * Get message count
   */
  getMessageCount(): number {
    return this.sentMessages.length;
  }
}

/**
 * Create a mock Telegraf instance
 */
export function createMockTelegraf(): MockTelegramBot {
  return new MockTelegramBot();
}

/**
 * Mock Telegram service provider for NestJS testing
 */
export const MOCK_TELEGRAM_SERVICE = {
  provide: 'TelegramService',
  useFactory: () => ({
    getBot: () => new MockTelegramBot(),
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessage: jest.fn(),
    answerCallbackQuery: jest.fn(),
  }),
};

/**
 * Test utilities for Telegram integration
 */
export class TelegramTestUtils {
  /**
   * Create a realistic test context
   */
  static createTestContext(overrides: any = {}): Context {
    const bot = new MockTelegramBot();
    return bot.simulateMessage('/start', overrides);
  }

  /**
   * Create a test callback query context
   */
  static createCallbackContext(data: string, overrides: any = {}): Context {
    const bot = new MockTelegramBot();
    return bot.simulateCallbackQuery(data, overrides);
  }

  /**
   * Assert that a message was sent with specific content
   */
  static assertMessageSent(bot: MockTelegramBot, expectedText: string, chatId?: number): void {
    expect(bot.wasMessageSent(expectedText, chatId)).toBe(true);
  }

  /**
   * Assert that specific number of messages were sent
   */
  static assertMessageCount(bot: MockTelegramBot, expectedCount: number): void {
    expect(bot.getMessageCount()).toBe(expectedCount);
  }

  /**
   * Get the text of the last sent message
   */
  static getLastMessageText(bot: MockTelegramBot): string {
    const lastMessage = bot.getLastSentMessage();
    return lastMessage ? lastMessage.text : '';
  }
}

/**
 * Example usage in tests:
 * 
 * describe('TelegramBotService', () => {
 *   let service: TelegramBotService;
 *   let mockBot: MockTelegramBot;
 * 
 *   beforeEach(() => {
 *     mockBot = createMockTelegraf();
 *     service = new TelegramBotService(mockBot);
 *   });
 * 
 *   it('should handle /start command', async () => {
 *     const context = TelegramTestUtils.createTestContext();
 *     
 *     await service.handleStart(context);
 *     
 *     TelegramTestUtils.assertMessageSent(mockBot, 'Welcome to RPS Tournament Bot!');
 *   });
 * });
 */