import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StoragePort,
  UploadFileRequest,
  UploadFileResponse,
  GetPresignedUrlRequest,
} from '../ports/storage.port';

@Injectable()
export class AwsS3Adapter implements StoragePort {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly logger = new Logger(AwsS3Adapter.name);

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('aws.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('aws.accessKeyId') ?? '',
        secretAccessKey: this.configService.get<string>('aws.secretAccessKey') ?? '',
      },
    });
    this.bucket = this.configService.get<string>('aws.s3Bucket') ?? '';
  }

  async upload(request: UploadFileRequest): Promise<UploadFileResponse> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: request.key,
        Body: request.buffer,
        ContentType: request.mimeType,
        Metadata: request.metadata,
      }),
    );

    return {
      url: this.getPublicUrl(request.key),
      key: request.key,
      bucket: this.bucket,
    };
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async getPresignedUrl(request: GetPresignedUrlRequest): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: request.key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: request.expiresIn ?? 3600,
    });
  }

  getPublicUrl(key: string): string {
    const region = this.configService.get<string>('aws.region');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
