import { pushToTreeTracker } from "./pushToTreeTracker";
import { S3Event, S3EventRecord } from "aws-lambda";

import { S3Adapter } from "./s3";
import { S3ObjectMetaData } from "./S3ObjectMetaData";

export function parseS3MetaData(key: string, amazonMetaData: { [key: string]: any; } | undefined): S3ObjectMetaData {
  if (!amazonMetaData) {
    throw new Error(`Failed to extract meta data of ${key} - was undefined.`);
  }

  let id = amazonMetaData.phimageid
  let dateTaken = new Date(Date.parse(amazonMetaData.datetaken));
  let latitude = parseFloat(amazonMetaData.latitude);
  let longitude = parseFloat(amazonMetaData.longitude);
  let species = amazonMetaData.species;
  let supervisor = amazonMetaData.supervisor;
  let site = amazonMetaData.site

  return {
    id,
    dateTaken,
    latitude,
    longitude,
    site,
    species,
    supervisor,
  };
}

function extractRegionBucketAndKey(record: S3EventRecord) {
  const region = record.awsRegion;
  const bucket = record.s3.bucket.name; //eslint-disable-line
  // https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example.html
  // these are url encoded (equivalent to unquote_plus in python)
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  return { bucket, key, region }
}


async function processS3Event({
  record,
  treeApiUrl,
}: {
  record: S3EventRecord;
  treeApiUrl: string;
}) {
  const s3Client = new S3Adapter();
  const { bucket, key, region } = extractRegionBucketAndKey(record);
  console.log({ bucket, key, region });
  const processedKey = key.replace('public/photos/', 'trees/');

  if (await s3Client.objectExists(bucket, processedKey)) {
    console.log(`${key} already recorded as processed at ${processedKey}, skipping`);
    return;
  }

  console.log(`Ready to process ${key}`);

  const objectDetails = await s3Client.getObjectDetails(bucket, key);
  if (objectDetails.ContentLength === 0) {
    console.log(`${key} is empty, skipping - expected to be re-uploaded as a failed upload`);
    return
  }

  console.log({
    Metadata: objectDetails.Metadata,
  });

  const metaData = parseS3MetaData(key, objectDetails.Metadata);
  try {
    await pushToTreeTracker({
      treeApiUrl,
      metaData,
      key,
      bucket,
      region,
    });
    console.log(`Pushed ${key} to tree tracker`, {
      key,
      processedKey
    });
    try {
      s3Client.moveObject(bucket, key, processedKey);
      console.log(`Moved ${key} to ${processedKey}`);
    } catch (error) {
      console.log(`Moving ${key} to ${processedKey} failed with ${error}, skipping`);
    }
  } catch (error) {
    console.log(`Error pushing ${key} to tree tracker`, {
      key,
      processedKey,
      error,
    });
  }
}

export const handler = async function (event: S3Event) {
  const treeApiUrl = process.env.treeApiUrl as string;
  console.log({ treeApiUrl });
  if (event.Records && event.Records.length) {
    console.log(`Processing ${event.Records.length} records with`,)
    console.log(`Tree URL ${treeApiUrl}`,);
    event.Records.forEach(record => processS3Event({
      record,
      treeApiUrl,
    }));
  } else {
    console.log('No records in event',)
  }

}
