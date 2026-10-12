import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.register({}),
  ],
  controllers: [UploadsController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UploadsModule {}
