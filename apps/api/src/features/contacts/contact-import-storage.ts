export async function deleteTemporaryImportFile(
  bucket: R2Bucket,
  fileKey: string,
) {
  try {
    await bucket.delete(fileKey);
  } catch {
    // R2 lifecycle policy is the fallback for stale temporary import objects.
  }
}
