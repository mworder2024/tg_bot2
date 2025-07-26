import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tournament } from '../../entities/tournament.entity';
import { TournamentMatch } from '../../entities/tournament-match.entity';
import { TournamentParticipant } from '../../entities/tournament-participant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tournament, TournamentMatch, TournamentParticipant])],
  providers: [],
  controllers: [],
  exports: [TypeOrmModule],
})
export class TournamentModule {}