const { Stack, Duration } = require('aws-cdk-lib');
// const sqs = require('aws-cdk-lib/aws-sqs');
const s3 = require('aws-cdk-lib/aws-s3');
const nodejs = require('aws-cdk-lib/aws-lambda-nodejs');
const lambda = require('aws-cdk-lib/aws-lambda');
const logs = require('aws-cdk-lib/aws-logs');
const s3n = require('aws-cdk-lib/aws-s3-notifications');
const iam = require('aws-cdk-lib/aws-iam');
const {join} = require('path');

class ImageServiceStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    const {bucketName,treeApiUrl,env} = props;
    const bucket = s3.Bucket.fromBucketName(
      this,
      'bucketName',
      bucketName
    );

    /**
     * Lambda function that runs when images are put on the bucket
     */
    const s3TriggerLambda = new nodejs.NodejsFunction(this, `${this.stackName}-s3TriggerFunction`, {
      entry: join(__dirname, '..', 'lambdas', 'trigger', 'index.js'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: `${this.stackName}BucketPutHandler`,
      logRetention: logs.RetentionDays.THREE_MONTHS,
      environment: {
        treeApiUrl,
        bucketName,
        region: env.region,
      },
      bundling: {
        minify: false,
        keepNames: true,
        forceDockerBundling: true,
      },
      depsLockFilePath: join(__dirname, '..', 'lambdas', 'trigger', 'package-lock.json'),
    });

    /**
     * When bucket gets new upload, trigger the lambda function
     */
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3TriggerLambda),
      {prefix: 'treeunits'}
    );

    /**
     * Give the lambda function ability to read and write to the bucket
     */
    s3TriggerLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      resources: [
        bucket.arnForObjects("*"),
        bucket.bucketArn
      ]
    }));

  }
}

module.exports = { ImageServiceStack }
