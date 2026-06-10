export interface UploadFileRequest {
  key: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface UploadFileResponse {
  url: string;
  key: string;
  bucket: string;
}

export interface GetPresignedUrlRequest {
  key: string;
  expiresIn?: number;
}

export const STORAGE_PORT = Symbol('STORAGE_PORT');

export interface StoragePort {
  upload(request: UploadFileRequest): Promise<UploadFileResponse>;
  delete(key: string): Promise<void>;
  getPresignedUrl(request: GetPresignedUrlRequest): Promise<string>;
  getPublicUrl(key: string): string;
}
