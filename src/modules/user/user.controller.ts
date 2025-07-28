import { Controller, Get, Post, Body, Param } from "@nestjs/common";
import { UserService } from "./user.service";
import { User } from "../../entities/user.entity";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async createUser(
    @Body()
    userData: {
      telegramId: number;
      username?: string;
      firstName?: string;
      lastName?: string;
    },
  ): Promise<User> {
    return this.userService.createUser(userData);
  }

  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  @Get(":id")
  async getUserById(@Param("id") id: string): Promise<User> {
    return this.userService.findById(id);
  }

  @Get("telegram/:telegramId")
  async getUserByTelegramId(
    @Param("telegramId") telegramId: number,
  ): Promise<User> {
    return this.userService.findByTelegramId(telegramId);
  }
}
