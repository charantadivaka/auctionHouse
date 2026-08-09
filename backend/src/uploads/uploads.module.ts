import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { join } from 'path';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      dest: join(process.cwd(), 'uploads'),
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
