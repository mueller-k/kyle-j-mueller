import * as cdk from "@aws-cdk/core";
import { BlockPublicAccess, Bucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import { Distribution } from "@aws-cdk/aws-cloudfront";
import { S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { ARecord, PublicHostedZone, RecordTarget } from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import * as path from "path";

export class SiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "static-site-bucket", {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, "static-site-bucket-deployment", {
      sources: [Source.asset(path.resolve(__dirname, "./../src/"))],
      destinationBucket: bucket,
    });

    const distribution = new Distribution(this, "dist", {
      defaultBehavior: { origin: new S3Origin(bucket) },
    });

    const hostedZone = new PublicHostedZone(this, "hosted-zone", {
      zoneName: "kylejmueller.com",
    });

    new ARecord(this, "a-record", {
      zone: hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }
}
