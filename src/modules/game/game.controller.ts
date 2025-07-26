import { Controller, Post, Get, Body, Param, BadRequestException } from '@nestjs/common';
import { GameEngineService } from '../../services/game-engine.service';
import { Game, GameMove } from '../../entities/game.entity';

@Controller('games')
export class GameController {
  constructor(private readonly gameEngineService: GameEngineService) {}

  @Post('quick-match')
  async createQuickMatch(@Body() body: { playerId: string }): Promise<Game> {
    return this.gameEngineService.createQuickMatch(body.playerId);
  }

  @Post(':gameId/join')
  async joinGame(
    @Param('gameId') gameId: string,
    @Body() body: { playerId: string }
  ): Promise<Game> {
    return this.gameEngineService.joinGame(gameId, body.playerId);
  }

  @Post(':gameId/move')
  async submitMove(
    @Param('gameId') gameId: string,
    @Body() body: { playerId: string; move: string }
  ): Promise<Game> {
    // Validate move
    const validMoves = ['ROCK', 'PAPER', 'SCISSORS'];
    if (!validMoves.includes(body.move.toUpperCase())) {
      throw new BadRequestException('Invalid move. Must be ROCK, PAPER, or SCISSORS');
    }

    const move = body.move.toUpperCase() as GameMove;
    return this.gameEngineService.submitMove(gameId, body.playerId, move);
  }

  @Get(':gameId')
  async getGame(@Param('gameId') gameId: string): Promise<Game> {
    return this.gameEngineService.getGameById(gameId);
  }

  @Get('player/:playerId')
  async getPlayerGames(@Param('playerId') playerId: string): Promise<Game[]> {
    return this.gameEngineService.getPlayerGames(playerId);
  }

  @Get('player/:playerId/stats')
  async getPlayerStats(@Param('playerId') playerId: string) {
    return this.gameEngineService.getPlayerStats(playerId);
  }

  @Get()
  async getActiveGames(): Promise<Game[]> {
    return this.gameEngineService.getActiveGames();
  }
}