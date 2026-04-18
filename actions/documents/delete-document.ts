"use server";
import { getSession } from "@/lib/auth-server";

import { prismadb } from "@/lib/prisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getMinioBucket, minioClient } from "@/lib/minio";

export async function deleteDocument(documentId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");

  if (!documentId) throw new Error("Document ID is required");

  const document = await prismadb.documents.findUnique({
    where: { id: documentId },
  });

  if (!document) throw new Error("Document not found");

  await prismadb.documents.delete({ where: { id: documentId } });

  if (document.key) {
    await minioClient.send(
      new DeleteObjectCommand({
        Bucket: getMinioBucket(),
        Key: document.key,
      })
    );
  }
}
