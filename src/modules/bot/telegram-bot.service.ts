import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Bot, Context, session, SessionFlavor, webhookCallback } from "grammy";
import { UserService } from "../user/user.service";
import { GameEngineService } from "../../services/game-engine.service";
import { GameMove, GameStatus } from "../../entities/game.entity";
import * as https from "https";
import * as dns from "dns";

// Force IPv4 for DNS resolution
dns.setDefaultResultOrder("ipv4first");

interface SessionData {
  activeGameId?: string;
  waitingForMove?: boolean;
}

type BotContext = Context & SessionFlavor<SessionData>;

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Bot<BotContext>;
  private activeGames: Map<number, string> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly gameEngineService: GameEngineService,
  ) {}

  async onModuleInit() {
    const botToken = this.configService.get<string>("BOT_TOKEN");
    const nodeEnv = this.configService.get<string>("NODE_ENV");
    const skipBot = this.configService.get<boolean>("SKIP_BOT", false);

    if (!botToken || botToken === "your_bot_token_here" || skipBot) {
      this.logger.warn(
        "Bot token not configured or SKIP_BOT=true. Bot will not start.",
      );
      this.logger.warn(
        "Use SKIP_BOT=true for local development without Telegram access.",
      );
      return;
    }

    try {
      // Try different connection methods
      this.logger.log(
        `Attempting to initialize Telegram bot in ${nodeEnv} mode...`,
      );

      // Check for proxy configuration
      const proxyUrl =
        this.configService.get<string>("HTTPS_PROXY") ||
        this.configService.get<string>("HTTP_PROXY") ||
        process.env.HTTPS_PROXY ||
        process.env.HTTP_PROXY;

      // Create custom HTTPS agent that forces IPv4
      const httpsAgent = new https.Agent({
        family: 4, // Force IPv4
        rejectUnauthorized: true,
        keepAlive: false,
        timeout: 60000,
      });

      const botConfig: any = {
        client: {
          timeoutSeconds: 120, // Increase timeout for slow connections
          retryLimit: 3,
          baseFetchConfig: {
            compress: true,
            agent: httpsAgent, // Use IPv4 agent
          },
        },
      };

      // Add proxy if configured (overrides the IPv4 agent)
      if (proxyUrl) {
        this.logger.log(`Using proxy: ${proxyUrl}`);
        try {
          const { HttpsProxyAgent } = require("https-proxy-agent");
          botConfig.client.baseFetchConfig.agent = new HttpsProxyAgent(
            proxyUrl,
          );
        } catch (error) {
          this.logger.warn("https-proxy-agent not available, using IPv4 agent");
        }
      } else {
        this.logger.log("Using IPv4-only connection (IPv6 disabled)");
      }

      // Create bot with custom fetch options
      this.bot = new Bot<BotContext>(botToken, botConfig);

      // Add session middleware
      this.bot.use(session({ initial: (): SessionData => ({}) }));

      // Setup commands
      this.setupCommands();

      // Add error handling
      this.bot.catch((err) => {
        this.logger.error("Bot error:", err);
      });

      // Try to connect with different methods
      try {
        // First, delete any existing webhook
        await this.bot.api.deleteWebhook();
        this.logger.log("Cleared any existing webhooks");

        // Get bot info to verify connection
        const botInfo = await this.bot.api.getMe();
        this.logger.log(
          `Bot connected: @${botInfo.username} (${botInfo.first_name})`,
        );

        // Start with long polling (non-blocking)
        this.bot
          .start({
            drop_pending_updates: true,
            allowed_updates: ["message", "callback_query"],
            onStart: (botInfo) => {
              this.logger.log(
                `✅ Telegram bot started successfully as @${botInfo.username}`,
              );
            },
          })
          .catch((err) => {
            this.logger.error("Bot polling error:", err);
          });
      } catch (connectError) {
        this.logger.error("Failed to connect to Telegram:", connectError);

        // Try alternative connection method
        if (connectError.message.includes("ETIMEDOUT")) {
          this.logger.warn("Connection timeout. Possible solutions:");
          this.logger.warn("1. Check if you need to use a proxy");
          this.logger.warn(
            "2. Try running: export NODE_TLS_REJECT_UNAUTHORIZED=0",
          );
          this.logger.warn("3. Check your DNS settings");
          this.logger.warn("4. Try a different network");
        }
      }
    } catch (error) {
      this.logger.error("Failed to initialize bot:", error);
    }
  }

  private setupCommands() {
    // Copy all the command handlers from the original bot.service.ts
    // ... (same implementation as before)

    this.bot.command("start", async (ctx) => {
      const user = ctx.from;
      if (!user) return;

      try {
        await this.userService.createUser({
          telegramId: user.id,
          username: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
        });

        await ctx.reply(
          "🎮 Welcome to RPS Tournament Bot!\n\n" +
            "Commands:\n" +
            "/play - Start a quick match\n" +
            "/join - Join an existing game\n" +
            "/stats - View your statistics\n" +
            "/help - Show this help message",
        );
      } catch (error) {
        this.logger.error("Error in start command:", error);
        await ctx.reply("❌ Something went wrong. Please try again.");
      }
    });

    // Add all other commands...
    this.bot.command("help", async (ctx) => {
      await ctx.reply(
        "🎮 RPS Tournament Bot Help\n\n" +
          "**Game Commands:**\n" +
          "/play - Create a new quick match\n" +
          "/join - Join an available game\n" +
          "/rock - Choose rock 🪨\n" +
          "/paper - Choose paper 📄\n" +
          "/scissors - Choose scissors ✂️\n\n" +
          "**Info Commands:**\n" +
          "/stats - View your game statistics\n" +
          "/help - Show this help message\n\n" +
          "**How to Play:**\n" +
          "1. Use /play to create a game\n" +
          "2. Share the game ID with a friend\n" +
          "3. Friend uses /join to join\n" +
          "4. Both players choose moves\n" +
          "5. Best of 3 rounds wins!",
      );
    });
  }

  // Expose the bot instance for webhook usage
  getBot() {
    return this.bot;
  }
}
