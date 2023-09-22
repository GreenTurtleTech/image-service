#!/usr/bin/env node
import 'dotenv/config'

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ImageServiceStack } from '../lib/image-service-stack';

const app = new cdk.App();
new ImageServiceStack(app, 'ImageServiceStack', {
  bucketName: process.env.BUCKET_NAME as string ||'protect-earth-prod-photos-58374',
  errorsEmail: process.env.ERRORS_EMAIL as string,
  treeApiUrl: process.env.TREE_API_URL as string || 'https://quaint-dublin-zvwqq2sxihei.vapor-farm-b1.com/api'
});
