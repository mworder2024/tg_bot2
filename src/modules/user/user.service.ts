import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import { UserStats } from "../../entities/user-stats.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserStats)
    private readonly userStatsRepository: Repository<UserStats>,
  ) {}

  async createUser(telegramData: {
    telegramId: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { telegramId: telegramData.telegramId },
    });

    if (existingUser) {
      return existingUser;
    }

    const user = this.userRepository.create({
      telegramId: telegramData.telegramId,
      username: telegramData.username,
      firstName: telegramData.firstName,
      lastName: telegramData.lastName,
    });

    const savedUser = await this.userRepository.save(user);

    // Create initial user stats
    const userStats = this.userStatsRepository.create({
      user: savedUser,
    });
    await this.userStatsRepository.save(userStats);

    return savedUser;
  }

  async findByTelegramId(telegramId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { telegramId },
      relations: ["stats"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["stats"],
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      relations: ["stats"],
      order: { createdAt: "DESC" },
    });
  }
}
