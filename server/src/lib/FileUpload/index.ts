import S3 from "aws-sdk/clients/s3";
import { nanoid } from "nanoid";

export default class FileUpload {
  public readonly s3: S3;
  private static instance: S3 | null = null;

  constructor() {
    if (!FileUpload.instance) {
      this.s3 = new S3({
        signatureVersion: "v4",
      });
      FileUpload.instance = this.s3;
    } else {
      this.s3 = FileUpload.instance;
    }
  }

  async getSignedUrlForUpload(key: string, contentType: string, id: string) {
    const params = {
      Bucket: (process.env.AWS_S3_BUCKET as string) || "my-bucket",
      Key: key,
      Expires: 60 * 60 * 24 * 7,
      ContentType: contentType,
      Metadata: {
        id: id,
      },
    };

    return await this.s3.getSignedUrlPromise("putObject", params);
  }

  async getSignedUrlForDownload(key: string, fileName: string) {
    const params = {
      Bucket: (process.env.AWS_S3_BUCKET as string) || "my-bucket",
      Key: key,
      Expires: 60 * 60 * 24 * 7,
      ResponseContentDisposition: `attachment; filename="${fileName}"`,
    };

    return await this.s3.getSignedUrlPromise("getObject", params);
  }

  upload() {
    // TODO: Implement upload method
  }
}
