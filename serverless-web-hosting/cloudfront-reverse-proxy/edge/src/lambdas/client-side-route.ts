"use strict";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  CloudFrontRequest,
  CloudFrontResponse,
  CloudFrontResponseEvent,
  CloudFrontResponseHandler,
  CloudFrontResponseResult,
} from "aws-lambda";

const indexPage = "index.html";
const s3Client = new S3Client({ region: "eu-west-1" });

export const handler: CloudFrontResponseHandler = async (
  event: CloudFrontResponseEvent,
): Promise<CloudFrontResponseResult> => {
  const cf = event.Records[0].cf;
  const originReq = cf.request;
  const originRes = cf.response;
  const statusCode = originRes.status;

  // Only replace 404 requests typically received
  // when loading a page for a SPA that uses client-side routing
  const doReplace = originReq.method === "GET" && statusCode == "404";
  const result = doReplace
    ? await generateResponseAndLog(originReq, originRes)
    : originRes;

  return result;
};

async function generateResponseAndLog(
  request: CloudFrontRequest,
  originRes: CloudFrontResponse,
): Promise<CloudFrontResponseResult> {
  const bucketName = request.origin?.s3?.domainName.split(".")[0];
  const response = await generateResponse(originRes, bucketName, indexPage);
  return response;
}

async function generateResponse(
  originRes: CloudFrontResponse,
  Bucket: string | undefined,
  Key: string,
) {
  const getObjectCommand = new GetObjectCommand({ Bucket, Key });
  try {
    // Load HTML index from the CloudFront cache
    const s3Response = await s3Client.send(getObjectCommand);
    const bodyString = await s3Response.Body?.transformToString();

    originRes.headers["content-type"] = [
      {
        key: "Content-Type",
        value: s3Response.ContentType ?? "",
      },
    ];
    originRes.headers["cache-control"] = [
      {
        key: "Cache-Control",
        value: s3Response.CacheControl ?? "",
      },
    ];
    return {
      status: "200",
      headers: originRes.headers,
      body: bodyString,
    };
  } catch (error) {
    console.log("unexpected error: ", error);
    return {
      status: "500",
      headers: {
        "content-type": [{ value: "text/plain" }],
      },
      body: "An error occurred loading the page",
    };
  }
}
