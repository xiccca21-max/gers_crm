import { S3Client } from "@aws-sdk/client-s3";

type MinioClientInstance = InstanceType<typeof S3Client>;

let _minioClient: MinioClientInstance | undefined;

/** Создаёт клиент только при первом вызове — иначе `next build` падает при импорте (Collecting page data) без MINIO_* в env. */
export function getMinioClient(): MinioClientInstance {
  if (_minioClient) return _minioClient;
  const endpoint = process.env.MINIO_ENDPOINT?.trim();
  const accessKey = process.env.MINIO_ACCESS_KEY?.trim();
  const secretKey = process.env.MINIO_SECRET_KEY?.trim();
  if (!endpoint || !accessKey || !secretKey) {
    throw new Error(
      "MINIO_ENDPOINT, MINIO_ACCESS_KEY и MINIO_SECRET_KEY должны быть заданы в окружении (например Vercel → Environment Variables)."
    );
  }
  _minioClient = new S3Client({
    endpoint,
    region: "us-east-1",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });
  return _minioClient;
}

/** Совместимость: обращение к API MinIO только в рантайме, не при загрузке модуля. */
export const minioClient = new Proxy({} as MinioClientInstance, {
  get(_target, prop) {
    const client = getMinioClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return (value as (...a: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});

export function getMinioBucket(): string {
  const b = process.env.MINIO_BUCKET?.trim();
  if (!b) {
    throw new Error("MINIO_BUCKET должен быть задан в окружении.");
  }
  return b;
}

export function getMinioPublicUrl(): string | undefined {
  const u = process.env.NEXT_PUBLIC_MINIO_ENDPOINT?.trim();
  return u || undefined;
}
