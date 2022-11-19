import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, BillingMode, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import path = require('path');
import { LogStream } from 'aws-cdk-lib/aws-logs';

const API_CONTAINER_PORT = 8080

export class EcsUrlShortenerMigrationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const dynamoTable = new Table(this, 'dynamoTable', {
      tableName: 'demo-url-shortener-table',
      partitionKey: {name:'ID', type: AttributeType.STRING},
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    /**
     * VPC
     */
    const vpc = new ec2.Vpc(this, "vpc", {
      cidr: "10.1.0.0/16",
      natGateways: 1,
      subnetConfiguration: [
        {  cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC, name: "Public" },
        {  cidrMask: 24, subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, name: "Private" }
      ],
      maxAzs: 2
    });


    /**
     * Application Load Balancer
     */
    const albSg = new ec2.SecurityGroup(this, 'security-group-load-balancer', {
      vpc: vpc,
      allowAllOutbound: true,
    });
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      loadBalancerName: 'go-fiber-api-ecs-alb',
      securityGroup: albSg,
      internetFacing: true,
      idleTimeout: Duration.minutes(10),
      deletionProtection: false,
    });
    const httpListener = alb.addListener('http-listener', {
      port: 80,
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
      resources: [dynamoTable.tableArn],
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
      vpc: vpc,
      // allow metrics to show up in cloudwath
      containerInsights: true 
    });
    const securityGroup = new ec2.SecurityGroup(this, 'SGService', { vpc: vpc });
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
      port: 80,
      targets: [fargateService],
      healthCheck: { path: '/' }
    });
    httpListener.connections.allowDefaultPortFromAnyIpv4('Open to the world');

    // Outputs
    new CfnOutput(this, 'LoadBalancerDnsName', { value: alb.loadBalancerDnsName });
  }
}
