#!/usr/bin/env node
import 'dotenv/config';

import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { ImageServiceStack } from '../lib/image-service-stack';

const env =  {
  account: process.env.ACCOUNT_ID as string,
  region: process.env.AWS_REGION || 'eu-west-2' as string,
};
const app = new cdk.App();
new ImageServiceStack(app, 'ImageServiceStack', {
  env,
  bucketName: process.env.BUCKET_NAME as string,
  errorsEmail: process.env.ERRORS_EMAIL as string,
  treeApiUrl: process.env.TREE_API_URL as string,
  prefix: process.env.PREFIX as string | undefined
});

new ImageServiceStack(app, 'ImageServiceStackStaging', {
  env,
  bucketName: process.env.BUCKET_NAME_STAGING as string,
  errorsEmail: process.env.ERRORS_EMAIL as string,
  treeApiUrl: process.env.TREE_API_URL_STAGING as string || process.env.TREE_API_URL as string,
  prefix: process.env.PREFIX as string | undefined
});
