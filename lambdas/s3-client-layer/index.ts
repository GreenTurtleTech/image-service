import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extension as getExtension } from 'es-mime-types';

type Event = {
  requestContext: { requestId: string; };
  queryStringParameters: { contentType: string; };
};

const client = new S3Client({
  region: process.env.AWS_REGION,
});

const getUploadURL = async function(event: {
    requestContext: { requestId: string; };
    queryStringParameters: { contentType: string; };
}) {

  const apiRequestId = event.requestContext.requestId;
  const contentType = event.queryStringParameters.contentType;
  const extension = getExtension(contentType);
  const s3Key = `${apiRequestId}.${extension}`;

  // Get signed URL from S3
  const putObjectParams = {
    Bucket: process.env.UPLOAD_BUCKET,
    Key: s3Key,
    ContentType: contentType,
  };
  const command = new PutObjectCommand(putObjectParams);

  const signedUrl = await getSignedUrl(client, command, {
      expiresIn: parseInt(process.env.URL_EXPIRATION_SECONDS || '300')
  });

  return {
    uploadURL: signedUrl,
    key: s3Key,
  };
};

export const handler = async function(event: Event) {
  const body = await getUploadURL(event);
  return {
    statusCode: 200,
    body: JSON.stringify(body),
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  };
}
