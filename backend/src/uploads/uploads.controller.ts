import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Controller('uploads')
export class UploadsController {
  constructor(private configService: ConfigService) {}

  /**
   * POST /uploads/image
   * Authenticated endpoint — uploads a single image file.
   * Returns: { url: string }
   */
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (_req, file, cb) => {
          // BUG FIX: Generate extension from mimetype instead of originalname to prevent XSS/spoofing
          const mimeToExt: Record<string, string> = {
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
          };
          const ext = mimeToExt[file.mimetype] || '.bin';
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, WebP and GIF images are allowed'), false);
        }
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Build the public URL using FRONTEND_URL as base for the backend
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') ||
      `http://localhost:${this.configService.get<number>('APP_PORT', 3001)}`;

    const url = `${backendUrl}/uploads/${file.filename}`;
    return { url, filename: file.filename };
  }
}
