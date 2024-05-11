import { Handler, Context, Callback } from "aws-lambda";
import fs from "fs";
import csv from "csv-parser";
import * as fastcsv from "fast-csv";
import S3 from "aws-sdk/clients/s3";
import stream from "stream";
const awsS3 = new S3();

async function fileSplitter(data: any, bucketName: string, id: string) {
  return new Promise(async (resolve, reject) => {
    let chunkSize = 500;

    const fileNames = [];
    const outputFilePath = `${id}/${id}_part_`;

    const numChunks = Math.ceil(data.length / chunkSize);

    for (let i = 0; i < numChunks; i++) {
      let batch = [];

      for (let j = i * chunkSize; j < (i + 1) * chunkSize; j++) {
        //   console.log(data[j]);
        batch.push(data[j]);
      }

      const options = { headers: true };
      const generateCsv = fastcsv.write(batch, options);
      const fileKey = `${outputFilePath}${i + 1}.csv`;
      fileNames.push(fileKey);
      const response = await awsS3
        .upload({
          Bucket: bucketName,
          Key: fileKey,
          Body: generateCsv,
          ContentType: "application/octet-stream",
        })
        .promise();

      console.log("response", response);
    }

    resolve(fileNames);
  });
}
export const handler = async (
  event: any,
  context: Context,
  callback: Callback
) => {
  console.log("Event: ", JSON.stringify(event, null, 2));
  if (event === null) {
    throw new Error("No records found");
  }

  const processedJson: any = [];

  const data = event.data;

  const getObjectParams = {
    Bucket: data.bucketName,
    Key: data.key,
  };

  const result = await new Promise((resolve, reject) => {
    awsS3
      .getObject(getObjectParams)
      .createReadStream()
      .pipe(csv({ separator: "," }))
      .on("data", (row: any, index: any) => {
        if (index !== 0) {
          processedJson.push(row);
        }
      })
      .on("end", () => {
        resolve(processedJson);
      })
      .on("error", (err) => {
        console.log("Error: ", err);
        reject(err);
      });
  });
  const responseFileNames = await fileSplitter(
    result,
    data.bucketName,
    data.id
  );

  return {
    id: data.id,
    bucketName: data.bucketName,
    splitFileNames: responseFileNames,
  };
};
