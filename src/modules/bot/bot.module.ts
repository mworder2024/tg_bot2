import { Module } from "@nestjs/common";
import { BotService } from "./bot.service";
import { MockBotService } from "./mock-bot.service";
import { BotController } from "./bot.controller";
import { GameModule } from "../game/game.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [GameModule, UserModule],
  controllers: [BotController],
  providers: [
    BotService,
    MockBotService,
    {
      provide: "BOT_SERVICE",
      useFactory: (botService: BotService, mockBotService: MockBotService) => {
        // This factory could decide which service to use based on environment
        return process.env.USE_MOCK_BOT === "true"
          ? mockBotService
          : botService;
      },
      inject: [BotService, MockBotService],
    },
  ],
  exports: [BotService, MockBotService, "BOT_SERVICE"],
})
export class BotModule {}
