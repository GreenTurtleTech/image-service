import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, HeadObjectCommandOutput, CopyObjectCommand } from "@aws-sdk/client-s3";
interface Flavoring<FlavorT> {
  _type?: FlavorT;
}
export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

export type S3BucketName = Flavor<string, "Bucket">
export type Region = Flavor<string, "Region">
export type S3Key = Flavor<string, "S3Key">

export class S3Adapter {
  s3Client: S3Client

  constructor() {
    this.s3Client = new S3Client({
      //@ts-ignore
      region: process.env.AWS_REGION as string,
    });
  }

  async generatePresignedUrl(bucket: S3BucketName, key: S3Key, expiresIn: number) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    return await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
  }

  async getObjectDetails(bucket: S3BucketName, key: S3Key): Promise<HeadObjectCommandOutput> {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    });
    return await this.s3Client.send(command);
  }

  async objectExists(bucket: S3BucketName, key: S3Key) {
    try {
      await this.s3Client
        .send(new HeadObjectCommand({
          Bucket: bucket,
          Key: key,

        }));
    } catch (ex) {
      if (ex instanceof Error && ex.name === 'NotFound') {
        return false;
      }
      throw ex;
    }
    return true;
  }

  async moveObject(bucket: S3BucketName, currentKey: S3Key, newKey: S3Key) {
    try {
      await this.s3Client
        .send(new CopyObjectCommand({
          Bucket: bucket,
          Key: newKey,
          CopySource: `${bucket}/${currentKey}`,

        }));
    } catch (error) {
      console.log({moveObjectException: error})
      throw error;
    }
    return true;
  }

}
