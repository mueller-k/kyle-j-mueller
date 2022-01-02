import { Construct } from "constructs";
import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import {
  aws_certificatemanager as acm,
  aws_cloudfront as cf,
  aws_cloudfront_origins as cfo,
  aws_dynamodb as ddb,
  aws_route53 as r53,
  aws_route53_targets as r53t,
  aws_s3 as s3,
  aws_s3_deployment as s3d,
} from "aws-cdk-lib";
import * as path from "path";

export class SiteStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "static-site-bucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new s3d.BucketDeployment(this, "static-site-bucket-deployment", {
      sources: [s3d.Source.asset(path.resolve(__dirname, "./../src/"))],
      destinationBucket: bucket,
      retainOnDelete: false,
    });

    const hostedZone = new r53.PublicHostedZone(this, "hosted-zone", {
      zoneName: "kylejmueller.com",
    });

    const certificate = new acm.DnsValidatedCertificate(this, "certificate", {
      domainName: "www.kylejmueller.com",
      hostedZone: hostedZone,
      subjectAlternativeNames: ["kylejmueller.com"],
    });

    const distribution = new cf.Distribution(this, "dist", {
      certificate: certificate,
      defaultBehavior: {
        allowedMethods: cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        origin: new cfo.S3Origin(bucket),
        viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      domainNames: ["www.kylejmueller.com"],
    });

    new r53.ARecord(this, "a-record-root", {
      target: r53.RecordTarget.fromAlias(
        new r53t.CloudFrontTarget(distribution)
      ),
      zone: hostedZone,
    });

    new r53.ARecord(this, "a-record-www", {
      recordName: "www.kylejmueller.com",
      target: r53.RecordTarget.fromAlias(
        new r53t.CloudFrontTarget(distribution)
      ),
      zone: hostedZone,
    });

    new ddb.Table(this, "Table", {
      partitionKey: { name: "counter", type: ddb.AttributeType.NUMBER },
    });
  }
}
