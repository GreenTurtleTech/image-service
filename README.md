# Image Service

Creates infrastructure for uploads to s3 and sending them to tree-tracker-web. Also has the Lambda function code.

## Environment Variables

The following environment variables are used in the `image-service.ts` file:

| Variable Name | Description |
| --- | --- |
| `ACCOUNT_ID` | The AWS account ID to deploy the stack to. If not set, the default value is `'163934172718'`. |
| `AWS_REGION` | The AWS region to deploy the stack to. If not set, the default value is `'eu-west-2'`. |
| `BUCKET_NAME` | The name of the S3 bucket to create for production images. If not set, the default value is `'protect-earth-prod-photos-58374'`. |
| `BUCKET_NAME_STAGING` | The name of the S3 bucket to create for staging images. If not set, the default value is `'protect-earth-stag-photos-57324'`. |
| `ERRORS_EMAIL` | The email address to send error notifications to. |
| `TREE_API_URL` | The URL of the Tree API to use. If not set, the default value is `'https://quaint-dublin-zvwqq2sxihei.vapor-farm-b1.com/api'` for production and `'https://royal-delhi-n3vjzgjonhc9.vapor-farm-f1.com/api'` for staging. |

These environment variables are used to configure the `ImageServiceStack` stack.

## Deployment

Deployment is automated in Github actions.

- Deployg to prod:
    - `npm run deploy:prod`
- Deploy staging
    - `npm run deploy:staging`

### Automated Deployments

- Push to main branch
    - Deploys to prod
- Push to any other branch
    - Deploys to staging.


## Deploy New Stacks

If you want to deploy a new instance of these stacks in a new account:

- Bootstrap this stack in that account
    - `cdk bootstrap aws://<account-id>/<region>`
    - https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html
- Then set the environment variables

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npm run deploy`      deploy stack
* `npm runcdk diff`        compare deployed stack with current state
* `npm run cdk synth`       emits the synthesized CloudFormation template
