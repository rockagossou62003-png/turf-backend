import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ASSETS_BUCKET, getObjectStorageClient } from "@/lib/object-storage";

export async function GET() {
  const services = { postgres: "ok", objectStorage: "ok" };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    console.error("Health check failed for PostgreSQL.", error);
    services.postgres = "unavailable";
  }

  try {
    await getObjectStorageClient().send(new HeadBucketCommand({ Bucket: ASSETS_BUCKET }));
  } catch (error) {
    console.error("Health check failed for Neon Object Storage.", error);
    services.objectStorage = "unavailable";
  }

  const healthy = Object.values(services).every((status) => status === "ok");
  const racingProvider = process.env.HORSE_RACING_PROVIDER ?? "not-configured";

  return NextResponse.json(
    {
      app: "TURF PRO",
      status: healthy ? "ok" : "degraded",
      services,
      environment: process.env.NODE_ENV ?? "development",
      racingProvider,
      note:
        racingProvider === "theracingapi"
          ? "The Racing API is selected; a staff sync is required to import current racecards."
          : "No live racing feed is configured.",
    },
    { status: healthy ? 200 : 503 },
  );
}
