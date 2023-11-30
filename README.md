# Image Service

Creates infrastructure for uploads to s3 and sending them to tree-tracker-web. Also has the Lambda function code.

- When a file is uploaded to `/treeuploads` in the bucket,
    - Lambda function checks if this item has been processed
        - It checks if a file with the same name, but `treeuploads` replaced with `processed` and with a `.json` file ending added on. If so, it stops running.
    - Gets the meta data from the s3 object
    - Sends that to tree tracker API
    - Creates a JSON file with the same name, but `treeuploads` replaced with `processed` and with a `.json` file ending added on.
        - This file contains the metadata.
        - That way if it doesn't end up saved in the tree tracker, we have it.
- If you change any of the infrastruture, or the trigger function:
    - If you commit the change to the staging branch, the staging environment will update.
    - If you commit the chnage to the main branch, the production environment will update.

## Observing

### Cloudwatch Logs

The Lambda function writes logs to [Cloudwatch]()

- Login to AWS console.
- Go to Cloudwatch and click "Log Groups"
    - https://eu-west-2.console.aws.amazon.com/cloudwatch/home?region=eu-west-2#logsV2:log-groups
- Find the log group for the lambda
    - `/aws/lambda/ImageServiceStackBucketPutHandler`
    - `/aws/lambda/ImageServiceStackStagingBucketPutHandler`
    - https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html
- Every time there is a deployment or the function scales to zero, a new log stream is created.
    - You can search across all streams in group with the "search all log streams" button on the right.

## Environment Variables

The following environment variables are used in the `image-service.ts` file:

| Variable Name | Description |
| --- | --- |
| `ACCOUNT_ID` | The AWS account ID to deploy the stack to. If not set, the default value is `'163934172718'`. |
| `AWS_REGION` | The AWS region to deploy the stack to. If not set, the default value is `'eu-west-2'`. |
| `BUCKET_NAME` | The name of the S3 bucket to create for production images. If not set, the default value is `'protect-earth-prod-photos-58374'`. |
| `BUCKET_NAME_STAGING` | The name of the S3 bucket to create for staging images.  |
| `ERRORS_EMAIL` | The email address to send error notifications to. |
| `TREE_API_URL` | The URL of the Tree API to use. |
| `TREE_API_URL_STAGING` | The URL of the staging tree API to use |
| `PREFIX` | The parent directory all photos must upload to. Default is `treeuploads`

These environment variables are used to configure the `ImageService` stack.

## Deployment

Deployment is automated in Github actions.

- Deployg to prod:
    - `npm run deploy:prod`
- Deploy staging
    - `npm run deploy:staging`
- If you have a `protect_earth` profile in `~/.aws/config`
    - `--profile=protect_earth`

### Automated Deployments

- Push to main branch
    - Deploys to prod
- Push to any other branch
    - Deploys to staging.


## Deployment

Deployment is automated in Github actions. These commands asume you have `protect_earth` profile in `~/.aws/config`. Please update as needed.

- Deploy to prod:
    - `npm run deploy:prod -- --profile=protect_earth`
- Deploy staging
    - `npm run deploy:staging -- --profile=protect_earth`


### Automated Deployments

- Push to main branch
    - Deploys to prod
- Push to any other branch
    - Deploys to staging.


## Create For New Client

### Assumptions

Before beginging, make sure these assumptions are true:

- You have AWS CDK toolkit installed.
    - https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- You haved Bootstrapped CDK for the account and region you will be deploying to.
    - https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html
- You have a named profile setup for AWS CLI for this Github account
    - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html#cli-configure-files-using-profiles

### Create New Stack

- Deploy the first time locally.
    - Setup .env file locally with the .env variables for this client
    - Deploy to staging
        - `npm run cdk deploy cdk deploy ImageServiceStackStaging --profile=client-aws-profile`
    - Deploy prod as well, if stage deploy worked:
        - `npm run cdk deploy cdk deploy ImageServiceStack --profile=client-aws-profile`
- Setup automated deployments
    - @todo
- In your AWS account there should be IAM users with the names `iOsAppUserImageServiceStack` and `iOsAppUserImageServiceStackStaging`
- Create and download an access key for those users, they are needed in the iOS app.
