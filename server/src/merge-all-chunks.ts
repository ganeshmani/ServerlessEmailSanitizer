import { Handler, Context, S3Event, Callback } from "aws-lambda";
import S3 from "aws-sdk/clients/s3";

const awsS3 = new S3();
import DBClient from "./lib/DynamoDB";
import SNSClient from "./lib/SNS";

export const handler = async (
  event: any,
  context: Context,
  callback: Callback
) => {
  console.log("Event: ", JSON.stringify(event, null, 2));
  const fileUploadTopicArn = process.env.FILE_UPLOAD_TOPIC_ARN;
  if (event === null) {
    throw new Error("No records found");
  }

  const id = event.id;

  const response: S3.ListObjectsV2Output = await awsS3
    .listObjectsV2({
      Bucket: event.bucketName,
      Prefix: `${id}/`,
    })
    .promise();

  if (!response) {
    throw new Error("No files found");
  }

  if (!response.Contents) {
    throw new Error("No files found");
  }

  if (response && response.Contents && response.Contents.length > 0) {
    let output = "";
    let headers = "";
    let totalEmails = 0;
    let cleanEmails = 0;
    let isEmailCleanIndex: number | null = null;
    const resultResponse = await Promise.all(
      response.Contents.map(async (file: any, index: number) => {
        if (!file.Key.match(/output-\d+\.csv$/)) {
          return Promise.resolve("");
        }
        return new Promise(async (resolve, reject) => {
          let result = "";
          try {
            if (file.Key.endsWith(".csv")) {
              const params = {
                Bucket: event.bucketName,
                Key: file.Key,
                ExpressionType: "SQL",
                Expression: "select * from s3object",
                InputSerialization: {
                  CSV: {
                    FileHeaderInfo: "NONE",
                  },
                  CompressionType: "NONE",
                },
                OutputSerialization: {
                  CSV: {},
                },
              };

              await awsS3.selectObjectContent(params, (err: any, data: any) => {
                if (err) {
                  console.log(err);
                }

                const eventStream = data.Payload;

                eventStream.on("data", (event: any) => {
                  if (event.Records) {
                    console.log(
                      "event.Records.Payload",
                      event.Records.Payload.toString()
                    );
                    const stringPayload =
                      event.Records.Payload.toString().split("\n");
                    console.log("stringPayload", stringPayload);
                    // if (index === 0) {
                    // Only consider headers from the first file
                    headers = stringPayload[0];
                    console.log("headers", headers);
                    isEmailCleanIndex = headers
                      .split(",")
                      .indexOf("isEmailClean");
                    // }

                    let dataWithoutHeader = stringPayload.splice(1);
                    console.log("dataWithoutHeader", dataWithoutHeader);

                    // check if isEmailClean is true and calculate bounce rate of the whole data
                    dataWithoutHeader.forEach((row: string) => {
                      const columns = row.split(",");
                      if (
                        isEmailCleanIndex !== null &&
                        (columns[isEmailCleanIndex] === "TRUE" ||
                          columns[isEmailCleanIndex] === "true")
                      ) {
                        cleanEmails++;
                      }
                      totalEmails++;
                    });

                    result = dataWithoutHeader.join("\n");
                  }
                });

                eventStream.on("end", (event: any) => {
                  console.log("end");
                  resolve(result);
                });
              });
            }
          } catch (err) {
            reject(err);
          }
        });
      })
    );

    output = headers + resultResponse.join("\n"); // Prepend the headers to the output

    await awsS3
      .upload({
        Bucket: event.bucketName,
        Key: `${id}/result.csv`,
        Body: output,
        ContentType: "application/octet-stream",
      })
      .promise();

    // calculate bounce rate from totalEmails and cleanEmails

    const bounceRate = ((totalEmails - cleanEmails) / totalEmails) * 100;

    const dbClient = new DBClient();

    const emailFileResponse = await dbClient.get("email-files", "id", id);

    if (!emailFileResponse) {
      throw new Error("File not found");
    }

    emailFileResponse.bounceRate = bounceRate;
    emailFileResponse.totalEmails = totalEmails;
    emailFileResponse.cleanEmails = cleanEmails;
    emailFileResponse.state = "finished";

    const dbResponse = await dbClient.update(emailFileResponse, "email-files");

    console.log("dbResponse", dbResponse);

    const snsPayload = {
      id: id,
      state: "PROCESSING_COMPLETE",
    };

    const snsPayloadString = JSON.stringify(snsPayload);

    const sns = SNSClient.getInstance();
    await sns.publish(snsPayloadString, fileUploadTopicArn!);

    // fs.writeFileSync("result.csv", output);
  }

  callback(null, "Success");
};
