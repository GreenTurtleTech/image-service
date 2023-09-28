#!/usr/bin/env node
import 'dotenv/config'

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageServiceStack } from '../lib/image-service-stack';

const env =  {
  account: process.env.ACCOUNT_ID || '163934172718' as string,
  region: process.env.AWS_REGION || 'eu-west-2' as string,
};
const app = new cdk.App();
new ImageServiceStack(app, 'ImageServiceStack', {
  env,
  bucketName: process.env.BUCKET_NAME as string ||'protect-earth-prod-photos-58374',
  errorsEmail: process.env.ERRORS_EMAIL as string,
  treeApiUrl: process.env.TREE_API_URL as string || 'https://quaint-dublin-zvwqq2sxihei.vapor-farm-b1.com/api'
});

new ImageServiceStack(app, 'ImageServiceStackStaging', {
  env,
  bucketName: process.env.BUCKET_NAME_STAGING as string ||'protect-earth-stag-photos-57324',
  errorsEmail: process.env.ERRORS_EMAIL as string,
  treeApiUrl: process.env.TREE_API_URL as string || 'https://royal-delhi-n3vjzgjonhc9.vapor-farm-f1.com/api'
});
