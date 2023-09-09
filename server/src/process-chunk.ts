import { Handler, S3Event, Context, Callback } from "aws-lambda";
import * as AWS from "aws-sdk";
import dns from "dns";
import fs from "fs";
import * as fastcsv from "fast-csv";

import stream from "stream";
const EmailValidator = require("email-deep-validator");

// Initialize S3 client
const s3 = new AWS.S3();
const emailValidator = new EmailValidator();

// Your list of disposable email providers
const disposableEmailProviders = ["example.com", "example2.com"];

// 1. Syntax check
function syntaxCheck(email: string) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

// 2. Domain/MX record check
async function domainCheck(email: string) {
  const domain = email.split("@")[1];
  try {
    await dns.promises.resolveMx(domain);
    return true;
  } catch (error) {
    return false;
  }
}

// 3. Disposable Email Provider Check
function disposableEmailCheck(email: string) {
  const domain = email.split("@")[1];
  return !disposableEmailProviders.includes(domain);
}

// 4. SMTP Deep-Level Check
async function smtpCheck(email: string) {
  const { wellFormed, validDomain, validMailbox } = await emailValidator.verify(
    email
  );
  return wellFormed && validDomain && validMailbox;
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback
) => {
  const { FilePath, FileIndex, BucketName, id } = event;

  console.log("Event: ", JSON.stringify(event, null, 2));

  await new Promise(async (resolve, reject) => {
    try {
      const param = {
        Bucket: BucketName,
        Key: `${FilePath}`,
      };

      const s3Stream = s3.getObject(param).createReadStream();

      const parser = s3Stream.pipe(fastcsv.parse({ headers: true }));

      let rows: any[] = [];

      parser.on("data", async (row: any) => {
        rows.push(row);
      });

      parser.on("end", async () => {
        for (const row of rows) {
          const email = row["Email"]; // Extract the email using the index

          row.isEmailClean =
            email &&
            syntaxCheck(email) &&
            disposableEmailCheck(email) &&
            (await domainCheck(email)); // && await smtpCheck(email)
        }
        console.log("rows", rows);

        const csvString = await new Promise((resolve, reject) => {
          fastcsv
            .writeToString(rows, { headers: true })
            .then((csvString) => resolve(csvString))
            .catch((err) => reject(err));
        });

        console.log("csvString", csvString);
        const uploadParams: any = {
          Bucket: BucketName,
          Key: `${id}/output-${FileIndex}.csv`,
          Body: csvString,
        };
        console.log("uploading to s3...");
        // Upload the results to S3
        try {
          const result = await s3.upload(uploadParams).promise();

          console.log("result", result);
        } catch (error) {
          console.log("error", error);
        }

        resolve(null);
      });
    } catch (error) {
      reject(error);
    }
  });

  return {
    bucketName: BucketName,
    id,
  };
};
