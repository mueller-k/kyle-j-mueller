import * as cdk from "@aws-cdk/core";
import { DnsValidatedCertificate } from "@aws-cdk/aws-certificatemanager";
import {
  AllowedMethods,
  Distribution,
  ViewerProtocolPolicy,
} from "@aws-cdk/aws-cloudfront";
import { S3Origin } from "@aws-cdk/aws-cloudfront-origins";
import { ARecord, PublicHostedZone, RecordTarget } from "@aws-cdk/aws-route53";
import { CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { BlockPublicAccess, Bucket } from "@aws-cdk/aws-s3";
import { BucketDeployment, Source } from "@aws-cdk/aws-s3-deployment";
import * as path from "path";

export class SiteStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, "static-site-bucket", {
      autoDeleteObjects: true,
      // blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      // publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, "static-site-bucket-deployment", {
      sources: [Source.asset(path.resolve(__dirname, "./../src/"))],
      destinationBucket: bucket,
      retainOnDelete: false,
    });

    const hostedZone = new PublicHostedZone(this, "hosted-zone", {
      zoneName: "kylejmueller.com",
    });

    const certificate = new DnsValidatedCertificate(this, "certificate", {
      domainName: "www.kylejmueller.com",
      hostedZone: hostedZone,
    });

    const distribution = new Distribution(this, "dist", {
      certificate: certificate,
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        origin: new S3Origin(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      domainNames: ["www.kylejmueller.com"],
    });

    new ARecord(this, "a-record-root", {
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });

    new ARecord(this, "a-record-www", {
      recordName: "www.kylejmueller.com",
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
      zone: hostedZone,
    });
  }
}
