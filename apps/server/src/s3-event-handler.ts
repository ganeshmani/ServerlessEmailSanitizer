import { Handler, S3Event, Context, Callback } from "aws-lambda";
import S3 from "aws-sdk/clients/s3";
import StepFunctions from "aws-sdk/clients/stepfunctions";

import DBClient from "./lib/DynamoDB";
import SNSClient from "./lib/SNS";

const awsS3 = new S3();
const stepFn = new StepFunctions();

export const handler: Handler<S3Event, Context> = async (
  event: S3Event,
  context: Context,
  callback: Callback
): Promise<any> => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const fileUploadTopicArn = process.env.FILE_UPLOAD_TOPIC_ARN;

  if (event.Records === null) {
    const error = new Error("No records found");
    callback(error);
    return;
  }

  const s3Record = event.Records[0].s3;
  const bucketName = s3Record.bucket.name;

  // const s3 = new AWS.S3();

  const key = s3Record.object.key;

  const headObjectParams = {
    Bucket: bucketName,
    Key: key,
  };

  awsS3
    .headObject(headObjectParams)
    .promise()
    .then((headObjectResponse) => {
      const customMetadata = headObjectResponse.Metadata;

      console.log("customMetadata", customMetadata);
    });

  console.log("key", key);
  const dbClient = new DBClient();

  const headObjectResponse = await awsS3.headObject(headObjectParams).promise();

  const customMetadata = headObjectResponse.Metadata;

  const id = customMetadata?.id;

  if (!id) {
    throw new Error("id not found");
  }

  const filesData = await dbClient.get("email-files", "id", id);

  if (filesData == null) {
    throw new Error("File not found");
  }

  filesData.isUploaded = true;
  filesData.state = "in-progress";
  filesData.createdAt = new Date().toISOString();
  const response = await dbClient.update(filesData, "email-files");

  console.log("File record updated", response);

  console.log("process.env.statemachine_arn ds", process.env.statemachine_arn);
  const stepFnStartExecutionParams: StepFunctions.StartExecutionInput = {
    stateMachineArn: process.env.statemachine_arn!,
    input: JSON.stringify({
      data: {
        bucketName: bucketName,
        key: key,
        id: id,
      },
    }),
  };

  const snsPayload = {
    id: id,
    state: "UPLOAD_COMPLETE",
  };

  const snsPayloadString = JSON.stringify(snsPayload);

  const sns = SNSClient.getInstance();
  await sns.publish(snsPayloadString, fileUploadTopicArn!);

  try {
    const stepFnStartExecutionResponse = await stepFn
      .startExecution(stepFnStartExecutionParams)
      .promise();

    console.log("stepFnStartExecutionResponse", stepFnStartExecutionResponse);

    const snsPayload = {
      id: id,
      state: "PROCESSING_IN_PROGRESS",
    };

    const snsPayloadString = JSON.stringify(snsPayload);

    const sns = SNSClient.getInstance();
    await sns.publish(snsPayloadString, fileUploadTopicArn!);
  } catch (err) {
    console.log("start exec err", err);
  }

  callback(null, "Success");

  // console.log("Event: ", JSON.stringify(event, null, 2));

  // callback(null, "Success");
};
