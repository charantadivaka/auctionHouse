import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log(`Cloudinary configured (cloud: ${cloudName})`);
    } else {
      this.isConfigured = false;
      this.logger.warn(
        'Cloudinary credentials not set — uploads will fall back to local disk. ' +
          'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env to enable.',
      );
    }
  }

  /** Whether Cloudinary is configured and ready */
  get enabled(): boolean {
    return this.isConfigured;
  }

  /**
   * Upload a file buffer to Cloudinary.
   * Returns the secure CDN URL and public_id.
   */
  async uploadImage(
    fileBuffer: Buffer,
    originalname: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'auction-house',
          resource_type: 'image',
          // Cloudinary auto-detects format; we pass the original name for context
          public_id: originalname.replace(/\.[^/.]+$/, ''), // strip extension
          overwrite: false,
          unique_filename: true,
          // Optimisation: auto quality + format
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result?: UploadApiResponse) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(error);
          }
          resolve({
            url: result!.secure_url,
            publicId: result!.public_id,
          });
        },
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Delete an image from Cloudinary by its public_id.
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err: any) {
      this.logger.error(`Cloudinary delete failed for ${publicId}: ${err.message}`);
    }
  }
}
