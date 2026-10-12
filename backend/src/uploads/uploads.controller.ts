import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(
    private configService: ConfigService,
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * POST /uploads/image
   * Authenticated endpoint — uploads a single image file.
   *
   * • If Cloudinary is configured → uploads to Cloudinary CDN
   * • Otherwise → saves to local disk (dev fallback)
   *
   * Returns: { url: string }
   */
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Upload an image',
    description:
      'Uploads a single image (JPEG, PNG, WebP, GIF). Max 5 MB. ' +
      'Returns a permanent CDN URL (Cloudinary) or local URL (dev fallback).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file to upload' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Returns { url, filename }.' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size.' })
  @UseGuards(JwtAuthGuard)
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      // Use memory storage so we get a Buffer for Cloudinary.
      // For local-disk fallback we'll write manually, but multer memory storage
      // also works for the fallback path.
      storage: memoryStorage(),
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
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // ── Cloudinary path (production) ─────────────────────────────────────
    if (this.cloudinaryService.enabled) {
      const result = await this.cloudinaryService.uploadImage(file.buffer, file.originalname);
      return { url: result.url, filename: result.publicId };
    }

    // ── Local-disk fallback (development) ────────────────────────────────
    const fs = await import('fs/promises');
    const ext = MIME_TO_EXT[file.mimetype] || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const uploadsDir = join(process.cwd(), 'uploads');

    // Ensure the uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(join(uploadsDir, filename), file.buffer);

    const backendUrl =
      this.configService.get<string>('BACKEND_URL') ||
      `http://localhost:${this.configService.get<number>('APP_PORT', 3001)}`;

    const url = `${backendUrl}/uploads/${filename}`;
    return { url, filename };
  }
}
