import { parse } from "path";
import { pushToTreeTracker } from "./pushToTreeTracker";
import * as uuid from "uuid";
import { S3EventRecord } from "aws-lambda";

import { S3Adapter } from "./s3";
import { S3ObjectMetaData } from "./S3ObjectMetaData";
const processedKeyPathComponent = '/processed-photos/';
const fileNameDelimiter = "_";


export function getMetaDataFromFilePath(filePath: string) {
  // parse the file path
  let fileNameWithoutExtension = parse(filePath).name;
  let components = fileNameWithoutExtension.split(fileNameDelimiter);
  if (components.length != 6 && components.length != 7) {
    throw new Error(`Skipping meta data extraction of ${filePath} due to unexpected component count. Got ${components.length} components.`);
  }
  let id = uuid.stringify(uuid.parse(components[1]));
  let dateTaken = new Date(Date.parse(components[0]));
  let latitude = parseFloat(components[3]);
  let longitude = parseFloat(components[4]);
  let accuracy = parseFloat(components[5]);
  let plotId = components.length == 7 ? parseInt(components[6]) : 0;

  let species = components[2];
  return {
    id,
    dateTaken,
    latitude,
    longitude,
    accuracy,
    species,
    plotId
  };
}
export function parseS3MetaData(key: string, amazonMetaData: { [key: string]: any; } | undefined): S3ObjectMetaData {
  if (!amazonMetaData) {
    throw new Error(`Failed to extract meta data of ${key} - was undefined.`);
  }
  if (amazonMetaData.version !== "1"
    && amazonMetaData.version !== "1.1"
    && amazonMetaData.version !== "1.2") {
    throw new Error(`Failed to extract meta data of ${key} due to unexpected version.`);
  }
  var id
  if (amazonMetaData.version === "1") {
    // extract id from key
    id = getMetaDataFromFilePath(key).id
  } else {
    id = uuid.stringify(uuid.parse(amazonMetaData.id));
  }
  let dateTaken = new Date(Date.parse(amazonMetaData.datetaken));
  let latitude = parseFloat(amazonMetaData.latitude);
  let longitude = parseFloat(amazonMetaData.longitude);
  let accuracy = parseFloat(amazonMetaData.accuracy);
  let species = amazonMetaData.species;
  let userId = amazonMetaData.userid;
  let plotId = parseInt(amazonMetaData.plotid);

  return {
    id,
    dateTaken,
    latitude,
    longitude,
    accuracy,
    species,
    userId,
    plotId
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


function getProcessedKeyForObject(unprocessedObjectKey: string) {

  // public/photos/ -> public/processed-photos/
  const unprocessedPrefix = 'public/photos/';
  const processedPrefix = `public${processedKeyPathComponent}`
  if (!unprocessedObjectKey.startsWith(unprocessedPrefix)) {
    throw new Error(`Unexpected key - ${unprocessedObjectKey} did not start with ${unprocessedPrefix}`)
  }
  return `${processedPrefix}${unprocessedObjectKey.substr(unprocessedPrefix.length)}.json`;
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
  const processedKey = getProcessedKeyForObject(key)

  if (key.indexOf(`${processedKeyPathComponent}`) > -1) {
    console.log(`Skipping ${key} as it is already processed`);
    return;
  }
  if (await s3Client.objectExists(bucket, region, processedKey)) {
    console.log(`${key} already recorded as processed at ${processedKey}, skipping`);
    return;
  }
  if (await s3Client.objectExists(bucket, region, processedKey)) {
    console.log(`${key} already recorded as processed at ${processedKey}, skipping`);
    return;
  }

  const objectDetails = await s3Client.getObjectDetails(bucket, region, key);
  if (objectDetails.ContentLength === 0) {
    console.log(`${key} is empty, skipping - expected to be re-uploaded as a failed upload`);
    return
  }

  const metaData = parseS3MetaData(key, objectDetails.Metadata);
  return await pushToTreeTracker({
    treeApiUrl,
    metaData,
    key,
    bucket,
    region,
  });
}

export const handler = async function (event: { records: S3EventRecord[] }) {
  const treeApiUrl = process.env.treeApiUrl as string;
  event.records.forEach(record => processS3Event({
    record,
    treeApiUrl,
  }));
}
