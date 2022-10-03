import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import s3assets = require('@aws-cdk/aws-s3-assets');
import elasticbeanstalk = require('@aws-cdk/aws-elasticbeanstalk');
import iam = require('@aws-cdk/aws-iam');

export class MetapierCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

const webAppZipArchive = new s3assets.Asset(this, 'WebAppZip', {
    path: `${__dirname}/../app.zip`,
});

// Create a ElasticBeanStalk app.
const appName = 'MyWebApp';
const app = new elasticbeanstalk.CfnApplication(this, 'Application', {
    applicationName: appName,
});

// Create an app version from the S3 asset defined earlier
const appVersionProps = new elasticbeanstalk.CfnApplicationVersion(this, 'AppVersion', {
    applicationName: appName,
    sourceBundle: {
        s3Bucket: webAppZipArchive.s3BucketName,
        s3Key: webAppZipArchive.s3ObjectKey,
    },
});

// Make sure that Elastic Beanstalk app exists before creating an app version
appVersionProps.addDependsOn(app);

// Create role and instance profile
const myRole = new iam.Role(this, `${appName}-aws-elasticbeanstalk-ec2-role`, {
    assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
});

const managedPolicy = iam.ManagedPolicy.fromAwsManagedPolicyName('AWSElasticBeanstalkWebTier')
myRole.addManagedPolicy(managedPolicy);

const myProfileName = `${appName}-InstanceProfile`

const instanceProfile = new iam.CfnInstanceProfile(this, myProfileName, {
    instanceProfileName: myProfileName,
    roles: [
        myRole.roleName
    ]
});

// EB configurations
const optionSettingProperties: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
    {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: myProfileName,
    },
    {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MinSize',
        value: '1',
    },
    {
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '1',
    },
    {
        namespace: 'aws:ec2:instances',
        optionName: 'InstanceTypes',
        value: 't2.micro',
    },
];

// Create an Elastic Beanstalk environment to run the application
const elbEnv = new elasticbeanstalk.CfnEnvironment(this, 'Environment', {
    environmentName: 'MyWebAppEnvironment',
    applicationName: app.applicationName || appName,
    solutionStackName: '64bit Amazon Linux 2 v5.4.4 running Node.js 14',
    optionSettings: optionSettingProperties,
    versionLabel: appVersionProps.ref,
});


  }
}
