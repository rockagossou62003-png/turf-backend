import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { ASSETS_BUCKET, getObjectStorageClient } from "../lib/object-storage";

async function main() {
  const client = getObjectStorageClient();
  const key = `integration-check/${randomUUID()}.txt`;
  const expected = `TURF PRO Neon Object Storage check ${randomUUID()}`;
  let uploaded = false;

  try {
    await client.send(new HeadBucketCommand({ Bucket: ASSETS_BUCKET }));
    await client.send(
      new PutObjectCommand({
        Bucket: ASSETS_BUCKET,
        Key: key,
        Body: expected,
        ContentType: "text/plain",
      }),
    );
    uploaded = true;

    const object = await client.send(new GetObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }));
    const actual = await object.Body?.transformToString();
    if (actual !== expected) {
      throw new Error("Neon Object Storage returned content that did not match the uploaded object.");
    }

    console.log("Neon Object Storage: HEAD, PUT, GET and DELETE passed.");
  } finally {
    if (uploaded) {
      await client.send(new DeleteObjectCommand({ Bucket: ASSETS_BUCKET, Key: key }));
    }
    client.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
