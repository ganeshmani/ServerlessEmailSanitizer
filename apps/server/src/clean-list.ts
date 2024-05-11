import serverless from "serverless-http";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import S3 from "aws-sdk/clients/s3";
import * as fastcsv from "fast-csv";

const awsS3 = new S3();

import DBClient from "./lib/DynamoDB";

const app = express();

app.post(
  "/clean-list",
  async (req: Request, res: Response, next: NextFunction) => {
    const request = JSON.parse(req.body);

    const bucketName = process.env.AWS_S3_BUCKET!;

    const file_id = request.file_id;

    const dbClient = new DBClient();

    const fileData = await dbClient.get("email-files", "id", file_id);

    let resultFileUrl = "";
    if (fileData == null) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    try {
      const response = await new Promise(async (resolve, reject) => {
        try {
          const params = {
            Bucket: bucketName,
            Key: `${file_id}/result.csv`,
          };

          const s3Stream = awsS3.getObject(params).createReadStream();

          const parser = s3Stream.pipe(fastcsv.parse({ headers: true }));

          let rows: any[] = [];

          parser.on("data", async (row: any) => {
            console.log("row", row);
            if (row.isEmailClean === true || row.isEmailClean === "true") {
              rows.push(row);
            }
          });

          parser.on("end", async () => {
            const csvString = await new Promise((resolve, reject) => {
              fastcsv
                .writeToString(rows, { headers: true })
                .then((csvString) => resolve(csvString))
                .catch((err) => reject(err));
            });

            const uploadParams: any = {
              Bucket: bucketName,
              Key: `${file_id}/clean-result.csv`,
              Body: csvString,
            };

            console.log("uploading clean list result to s3...");

            try {
              const emailFileResponse = await dbClient.get(
                "email-files",
                "id",
                file_id
              );

              if (!emailFileResponse) {
                throw new Error("File not found");
              }

              const result = await awsS3.upload(uploadParams).promise();

              resultFileUrl = result.Key;

              emailFileResponse.state = "processed";

              const dbResponse = await dbClient.update(
                emailFileResponse,
                "email-files"
              );

              resolve(dbResponse);
            } catch (err) {
              throw err;
            }
          });
        } catch (err) {
          console.log(err);
          reject(err);
        }
      });

      return res.status(200).json({
        message: "Clean list generated successfully",
        url: resultFileUrl,
      });
    } catch (err) {
      return res.status(500).json({
        error: err,
      });
    }
  }
);

app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

export const handler = serverless(app);
