import fetch from 'node-fetch';
import { S3ObjectMetaData } from './S3ObjectMetaData';

/**
 * Pushes the given meta data to the tree tracker API.
*/
export async function pushToTreeTracker({ metaData, key, region, bucket, treeApiUrl }: {
  metaData: S3ObjectMetaData;
  key: string;
  region: string;
  bucket: string;
  treeApiUrl: string;
}) {
  const image_url = `https://${bucket}.${region}.amazonaws.com/${key}`;
  const data = {
    image_url,
    site: {
      id: metaData.plotId.toString(),
    },
    planted_at: metaData.dateTaken.toISOString(),
    species: {
      id: metaData.species,
    },
    supervisor: {
      id: metaData.userId,
    },
    latitude: metaData.latitude,
    longitude: metaData.longitude,
  };

  //POST to upload endpoint in Tree Tracker Web API
  return await fetch(`${treeApiUrl}/upload`, {
    body: JSON.stringify(data),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }).catch((error) => {
    throw new Error(`Failed to push to laravel: ${error}`);
  }).then((response) => response.json()
  ).then((data) => {
    console.log(`Response from laravel: ${JSON.stringify(data)}`);
    return data;
  });
}
