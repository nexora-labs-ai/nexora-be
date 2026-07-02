import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import {
  GetPresignedUrlRequest,
  StoragePort,
  UploadFileRequest,
  UploadFileResponse,
} from '../ports/storage.port';

@Injectable()
export class CloudinaryAdapter implements StoragePort {
  private readonly logger = new Logger(CloudinaryAdapter.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('cloudinary.cloudName'),
      api_key: this.configService.get<string>('cloudinary.apiKey'),
      api_secret: this.configService.get<string>('cloudinary.apiSecret'),
    });
  }

  async upload(request: UploadFileRequest): Promise<UploadFileResponse> {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (request.mimeType && !ALLOWED.includes(request.mimeType)) {
      return Promise.reject(
        new UnprocessableEntityException(`Unsupported mime type: ${request.mimeType}`),
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: request.key,
          folder: 'nexora',
          resource_type: 'image',
          overwrite: true,
          timeout: 15_000,
        },
        (error: any, result: any) => {
          if (error) {
            this.logger.error('Failed to upload file to Cloudinary', error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Upload result is undefined'));
          }
          resolve({
            url: result.secure_url,
            key: result.public_id,
            bucket: 'cloudinary',
          });
        },
      );

      streamifier.createReadStream(request.buffer).pipe(uploadStream);
    });
  }

  async delete(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(key, (error: any, result: any) => {
        if (error) {
          this.logger.error(`Failed to delete file from Cloudinary: ${key}`, error);
          return reject(error);
        }
        resolve();
      });
    });
  }

  async getPresignedUrl(request: GetPresignedUrlRequest): Promise<string> {
    return this.getPublicUrl(request.key);
  }

  getPublicUrl(key: string): string {
    return cloudinary.url(key, { secure: true });
  }
}
