import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { InsurersController } from './insurers.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController, InsurersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
