import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Game } from "../../entities/game.entity";
import { User } from "../../entities/user.entity";
import { UserStats } from "../../entities/user-stats.entity";
import { GameEngineService } from "../../services/game-engine.service";
import { GameController } from "./game.controller";
import { UserModule } from "../user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([Game, User, UserStats]), UserModule],
  providers: [GameEngineService],
  controllers: [GameController],
  exports: [GameEngineService, TypeOrmModule],
})
export class GameModule {}
