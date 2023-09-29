import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import {join} from 'path';
export interface STACK_PROPS extends cdk.StackProps {
  //The name you see in the list of S3 buckets in the AWS console
  bucketName: string;
  errorsEmail: string;
  treeApiUrl: string;
  env: {
    account: string;
    region: string;
  };

}
export class ImageServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: STACK_PROPS) {
    super(scope, id, props);

    const {  bucketName, treeApiUrl, errorsEmail,env } = props;

    /**
     * Existing s3 bucket for storing tree photos
     *
     * Bucket created by Laravel Vapor (vapor.yml)
     */
    const bucket = s3.Bucket.fromBucketName(
      this,
      'Storage bucket',
      bucketName,
    );

    /**
     * Create an IAM user with put object permissions
     *
     * This user is any one using the iOS app
     */
    const user = new iam.User(this, `iOsAppUser${this.stackName}`, {
      userName: `iOsAppUser${this.stackName}`,
    });

    const policy = new iam.Policy(this, `iOsAppUser${this.stackName}Policy`, {
      policyName:`iOsAppUser${this.stackName}Policy`,
      statements: [
        new iam.PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [
            bucket.arnForObjects("*"),
            bucket.bucketArn
          ],
        }),
      ],
    });

    policy.attachToUser(user);
    /**
     * sns topics errors are sent to.
     */
    const errorsTopic = new sns.Topic(this, `${this.stackName} Errors topic`, {});

    /**
     * Subscribe to the errors topic
     */
    errorsTopic.addSubscription(
      new subscriptions.EmailSubscription(errorsEmail)
    );

    /**
     * Lambda function for iOS client
     */
    const s3ClientLayer = new nodejs.NodejsFunction(this, `${this.stackName}-s3-client-layer`, {
      entry: join(__dirname, '..', 'lambdas', 's3-client-layer', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      logRetention: logs.RetentionDays.THREE_MONTHS,
      bundling: {
        minify: false,
      },
      environment: {
        UPLOAD_BUCKET: bucket.bucketName,
      }
    });


    /**
     * Lambda function that runs when images are put on the bucket
     */
    const s3TriggerLambda = new nodejs.NodejsFunction(this, `${this.stackName}-s3TriggerFunction`, {
      entry: join(__dirname, '..', 'lambdas', 's3-trigger', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      functionName: `${this.stackName}BucketPutHandler`,
      logRetention: logs.RetentionDays.THREE_MONTHS,
      environment: {
        treeApiUrl,
      },
      bundling: {
        minify: false,
      },
    });

    /**
     * When bucket gets new upload, trigger the lambda function
     */
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3TriggerLambda),
      {prefix: 'public/photos/'}
    );

    /**
     * Give the lambda function ability to read and write to the bucket
     */
    s3TriggerLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:PutObject",
        "s3:GetObject",
      ],
      resources: [
        bucket.arnForObjects("*"),
        bucket.bucketArn
      ]
    }));
    /**
     * Give the lambda function ability to list the bucket contents
     */
    s3TriggerLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:ListBucket"
      ],
      resources: [
        bucket.arnForObjects("*"),
        bucket.bucketArn
      ]
    }));

    /**
     * Create a cloudwatch alarm for the lambda function errors
     */
    let errorAlarm = new cloudwatch.Alarm(this, `${this.stackName}-s3-trigger-errors-alarm`, {
      metric: s3TriggerLambda.metricErrors({
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      evaluationPeriods: 1,
      alarmDescription: 'Alarm for lambda errors',
    });
    errorAlarm.addAlarmAction(new actions.SnsAction(errorsTopic));

    /**
     * CDK output
     */
    new cdk.CfnOutput(this, 'aws_s3_bucket', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'aws_s3_bucket_arn', { value: bucket.bucketArn });
    new cdk.CfnOutput(this, 'ios_app_user_arn', { value: user.userArn });
    new cdk.CfnOutput(this, 'ios_app_user_name', { value: user.userName });

  }

}
