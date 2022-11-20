import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration, CustomResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, BillingMode, AttributeType, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as s3 from "aws-cdk-lib/aws-s3";
import path = require('path');
import { BaseVpc } from './constructs/vpc';
import { CachePolicy, Distribution, OriginAccessIdentity, OriginProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { LoadBalancerV2Origin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { GoFunction } from "@aws-cdk/aws-lambda-go-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";

const API_CONTAINER_PORT = 8080
const ALB_LISTNER_PORT = 80

export class EcsUrlShortenerMigrationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dynamoTable = new Table(this, 'dynamoTable', {
      tableName: 'demo-url-shortener-table',
      partitionKey: {name:'ID', type: AttributeType.STRING},
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
    // Creating entity index
    dynamoTable.addGlobalSecondaryIndex({
      indexName: 'Entities',
      partitionKey: { name: 'Type', type: AttributeType.STRING },
      sortKey: { name: 'State', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
    
    /**
     * VPC
     */
    const baseVpc = new BaseVpc(this, 'InternetGatewayVpcNestedStack')

    /**
     * Application Load Balancer
     */
    const albSg = new ec2.SecurityGroup(this, 'security-group-load-balancer', {
      vpc: baseVpc.vpc,
      allowAllOutbound: true,
    });
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc: baseVpc.vpc,
      loadBalancerName: 'go-fiber-api-ecs-alb',
      securityGroup: albSg,
      internetFacing: true,
      idleTimeout: Duration.minutes(10),
      deletionProtection: false,
    });
    const httpListener = alb.addListener('http-listener', {
      port: ALB_LISTNER_PORT,
      open: true,
    });

    /**
     * ECS Fargate Task
     */
    const fargateTaskDefinition = new ecs.FargateTaskDefinition(this, 'FargateTaskDefinition', {
      family: 'go-fiber-api-task-definition',
      memoryLimitMiB: 512,
      cpu: 256,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });
    fargateTaskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: [
        dynamoTable.tableArn,
        dynamoTable.tableArn + "/index/*",
      ],
      actions: ['dynamodb:*']
    }));
    
    /**
     * ECS Fargate Container
     */
    const container = fargateTaskDefinition.addContainer("go-fiber-api", {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, '../../api/')),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'go-fiber-api-container-logs',
        logRetention: logs.RetentionDays.ONE_DAY
      }),
      environment: { 
        'URL_TABLE': dynamoTable.tableName,
      }
    });
    container.addPortMappings({
      containerPort: API_CONTAINER_PORT
    });

    /**
     * ECS Fargate Service
     */
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: 'demo-url-shortener-cluster',
      vpc: baseVpc.vpc,
      // allow metrics to show up in cloudwath
      containerInsights: true 
    });
    const securityGroup = new ec2.SecurityGroup(this, 'SGService', { vpc: baseVpc.vpc });
    securityGroup.addIngressRule(
      ec2.Peer.securityGroupId(albSg.securityGroupId), 
      ec2.Port.tcp(API_CONTAINER_PORT),
      'Allow inbound connections from ALB'
    );
    const fargateService = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition: fargateTaskDefinition,
      desiredCount: 1,
      assignPublicIp: false,
      securityGroups: [securityGroup]
    });
    
    // Setup AutoScaling policy
    const scaling = fargateService.autoScaleTaskCount({ maxCapacity: 6, minCapacity: 2 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50,
      scaleInCooldown: Duration.seconds(60),
      scaleOutCooldown: Duration.seconds(60)
    });

    httpListener.addTargets('Target', {
      targetGroupName: "tcp-target-ecs-service",
      port: ALB_LISTNER_PORT,
      targets: [fargateService],
      healthCheck: { path: '/' }
    });

    /**
     * Cloudfront 
     */
     const frontendBucket = new s3.Bucket(this, "S3BucketForWebsite", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      versioned: true,
    });
    const cloudfrontOAI = new OriginAccessIdentity(this, "OAI", {
      comment: `OAI for url shortener app`,
    });
    frontendBucket.grantRead(cloudfrontOAI);

    // Create Cloudfront distribution with S3 as Origin
    const distribution = new Distribution(this, "distribution", {
      defaultBehavior: {
        origin: new S3Origin(frontendBucket, {
          originAccessIdentity: cloudfrontOAI,
        }),
        // Necessary to enable dynamic configuration injection
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: "index.html",
    });
    
    distribution.addBehavior('/urls*', new LoadBalancerV2Origin(alb, {
      httpPort: ALB_LISTNER_PORT,
      protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
      connectionAttempts: 3,
      connectionTimeout: Duration.seconds(5),
      readTimeout: Duration.seconds(10),
      keepaliveTimeout: Duration.seconds(10),
    }))

    new BucketDeployment(this, "deployStaticWebsite", {
      sources: [
        Source.asset(`${path.resolve(__dirname)}/../../ui/build`),
      ],
      destinationBucket: frontendBucket,
      // By default, files in the destination bucket that don't exist in the source will be deleted when the BucketDeployment resource is created or updated.
      // You can use the option prune: false to disable this behavior, in which case the files will not be deleted.
      prune: false,
      distribution: distribution,
      distributionPaths: ["/*"],
      retainOnDelete: false,
      exclude: ["runtime-config.json"],
    });

    const RUNTIME_CONFIG_FILE_NAME = "runtime-config.json";

    /** 
     * CUSTOM RESOURCE ONEVENT HANDLER
    */
    const onEventLambda = this.createLambda("onEvent", "../customresource/cmd/onEvent/main.go");
    frontendBucket.grantWrite(onEventLambda);
    // https://github.com/aws/aws-cdk/issues/11549#issuecomment-1308805103
    onEventLambda.addToRolePolicy(new iam.PolicyStatement({
      actions:['logs:CreateLogGroup'],
      resources:['*'],
      effect: iam.Effect.DENY
    }));
    
    new CustomResource(this, 'custom-resource', {
      resourceType: 'Custom::InjectReactRuntimeConfiguration',
      serviceToken: onEventLambda.functionArn,
      removalPolicy: RemovalPolicy.DESTROY,
      properties: {
        "runtimeConfigFileName": RUNTIME_CONFIG_FILE_NAME,
        "frontendBucketName": frontendBucket.bucketName,
        "loadBalancerDnsName": "http://" + alb.loadBalancerDnsName,
      },
    });

    // Outputs
    new CfnOutput(this, 'CloudfrontDistributionDomain', { value: "http://" + distribution.distributionDomainName });
  }
  /**
   * CREATE GO LAMBDA FUNCTION
   */
  createLambda(name: string, entry: string): GoFunction {
    const functionName = name + '-handler'
    const lambdaFn = new GoFunction(this, functionName, {
        functionName: functionName,
        entry: entry,
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.PROVIDED_AL2,
        timeout: Duration.seconds(29),
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
    })
    // Explicit log group that refers to the Lambda function
    new logs.LogGroup(this, `${name}-log-group`, {
      logGroupName: `/aws/lambda/${lambdaFn.functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_DAY,
    })
    return lambdaFn
  }
}
