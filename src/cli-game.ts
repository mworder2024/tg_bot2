#!/usr/bin/env node

/**
 * CLI Game Interface for Testing
 * Quick way to test the game without Telegram
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app/app.module';
import { UserService } from './modules/user/user.service';
import { GameEngineService } from './services/game-engine.service';
import { GameMove } from './entities/game.entity';
import * as readline from 'readline';

class CLIGame {
  private rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  private userService: UserService;
  private gameEngineService: GameEngineService;
  private players: any[] = [];
  private currentGame: any = null;

  async initialize() {
    console.log('🎮 RPS Tournament Bot - CLI Mode');
    console.log('================================');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    this.userService = app.get(UserService);
    this.gameEngineService = app.get(GameEngineService);
    
    console.log('✅ Game engine initialized');
    await this.showMainMenu();
  }

  private async showMainMenu() {
    console.log('\\n📋 Main Menu:');
    console.log('1. Create test players');
    console.log('2. Start quick match');
    console.log('3. View player stats');
    console.log('4. Exit');
    
    this.rl.question('\\nChoose option (1-4): ', async (answer) => {
      switch (answer.trim()) {
        case '1':
          await this.createTestPlayers();
          break;
        case '2':
          await this.startQuickMatch();
          break;
        case '3':
          await this.viewPlayerStats();
          break;
        case '4':
          console.log('👋 Goodbye!');
          process.exit(0);
          break;
        default:
          console.log('❌ Invalid option');
          await this.showMainMenu();
      }
    });
  }

  private async createTestPlayers() {
    try {
      console.log('\\n👥 Creating test players...');
      
      const player1 = await this.userService.createUser({
        telegramId: 12345,
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith'
      });

      const player2 = await this.userService.createUser({
        telegramId: 67890,
        username: 'bob',
        firstName: 'Bob',
        lastName: 'Johnson'
      });

      this.players = [player1, player2];
      
      console.log(`✅ Created players:`);
      console.log(`   Player 1: ${player1.displayName} (${player1.id})`);
      console.log(`   Player 2: ${player2.displayName} (${player2.id})`);
      
    } catch (error) {
      console.log('❌ Error creating players:', error.message);
    }
    
    await this.showMainMenu();
  }

  private async startQuickMatch() {
    if (this.players.length < 2) {
      console.log('❌ Need at least 2 players. Create test players first.');
      await this.showMainMenu();
      return;
    }

    try {
      console.log('\\n⚔️ Starting quick match...');
      
      // Create game
      const game = await this.gameEngineService.createQuickMatch(this.players[0].id);
      console.log(`🎮 Game created: ${game.id}`);
      
      // Join second player
      const joinedGame = await this.gameEngineService.joinGame(game.id, this.players[1].id);
      console.log(`👥 ${this.players[1].displayName} joined the game`);
      
      this.currentGame = joinedGame;
      await this.playGame();
      
    } catch (error) {
      console.log('❌ Error starting match:', error.message);
      await this.showMainMenu();
    }
  }

  private async playGame() {
    if (!this.currentGame) return;

    console.log(`\\n🎯 Round starting!`);
    console.log(`${this.players[0].displayName} vs ${this.players[1].displayName}`);
    
    // Get moves from both players
    const moves = await Promise.all([
      this.getPlayerMove(this.players[0]),
      this.getPlayerMove(this.players[1])
    ]);

    try {
      // Submit moves
      let game = await this.gameEngineService.submitMove(this.currentGame.id, this.players[0].id, moves[0]);
      game = await this.gameEngineService.submitMove(this.currentGame.id, this.players[1].id, moves[1]);
      
      // Show result
      this.showRoundResult(moves[0], moves[1]);
      
      if (game.isCompleted) {
        this.showFinalResult(game);
        this.currentGame = null;
        await this.showMainMenu();
      } else {
        // Continue to next round
        this.currentGame = game;
        await this.playGame();
      }
      
    } catch (error) {
      console.log('❌ Error processing moves:', error.message);
      await this.showMainMenu();
    }
  }

  private async getPlayerMove(player: any): Promise<GameMove> {
    return new Promise((resolve) => {
      console.log(`\\n${player.displayName}, choose your move:`);
      console.log('1. Rock 🪨');
      console.log('2. Paper 📄');
      console.log('3. Scissors ✂️');
      
      this.rl.question('Your choice (1-3): ', (answer) => {
        switch (answer.trim()) {
          case '1':
            resolve(GameMove.ROCK);
            break;
          case '2':
            resolve(GameMove.PAPER);
            break;
          case '3':
            resolve(GameMove.SCISSORS);
            break;
          default:
            console.log('❌ Invalid choice, defaulting to Rock');
            resolve(GameMove.ROCK);
        }
      });
    });
  }

  private showRoundResult(move1: GameMove, move2: GameMove) {
    const moveEmoji = {
      [GameMove.ROCK]: '🪨',
      [GameMove.PAPER]: '📄',
      [GameMove.SCISSORS]: '✂️'
    };

    console.log(`\\n🎯 Round Result:`);
    console.log(`${this.players[0].displayName}: ${moveEmoji[move1]} ${move1}`);
    console.log(`${this.players[1].displayName}: ${moveEmoji[move2]} ${move2}`);

    if (move1 === move2) {
      console.log('🤝 It\'s a draw!');
    } else if (
      (move1 === GameMove.ROCK && move2 === GameMove.SCISSORS) ||
      (move1 === GameMove.PAPER && move2 === GameMove.ROCK) ||
      (move1 === GameMove.SCISSORS && move2 === GameMove.PAPER)
    ) {
      console.log(`🎉 ${this.players[0].displayName} wins this round!`);
    } else {
      console.log(`🎉 ${this.players[1].displayName} wins this round!`);
    }
  }

  private showFinalResult(game: any) {
    console.log('\\n🏆 GAME OVER!');
    if (game.winner) {
      const winnerName = game.winner.id === this.players[0].id ? 
        this.players[0].displayName : this.players[1].displayName;
      console.log(`🥇 Winner: ${winnerName}`);
    } else {
      console.log('🤝 Game ended in a draw!');
    }
  }

  private async viewPlayerStats() {
    if (this.players.length === 0) {
      console.log('❌ No players created yet. Create test players first.');
      await this.showMainMenu();
      return;
    }

    try {
      console.log('\\n📊 Player Statistics:');
      
      for (const player of this.players) {
        const stats = await this.gameEngineService.getPlayerStats(player.id);
        console.log(`\\n👤 ${player.displayName}:`);
        console.log(`   🎮 Total Games: ${stats.totalGames}`);
        console.log(`   🏆 Wins: ${stats.wins}`);
        console.log(`   💔 Losses: ${stats.losses}`);
        console.log(`   🤝 Draws: ${stats.draws}`);
        console.log(`   📈 Win Rate: ${stats.winRate}%`);
        console.log(`   🔥 Current Streak: ${stats.currentStreak}`);
        console.log(`   ⭐ Best Streak: ${stats.bestStreak}`);
        console.log(`   ❤️ Favorite Move: ${stats.favoriteMove || 'None yet'}`);
      }
      
    } catch (error) {
      console.log('❌ Error fetching stats:', error.message);
    }
    
    await this.showMainMenu();
  }
}

// Run the CLI game
if (require.main === module) {
  const game = new CLIGame();
  game.initialize().catch(console.error);
}

export { CLIGame };