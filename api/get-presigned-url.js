import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const s3 = new S3Client({
      region: "auto",
      endpoint: "https://bfbe230ca137edcedace515cddedf935.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "0f663647fb4f9ce68a2c3dc698609c4b",
        secretAccessKey: "3c1b2d062bf5cb41ff54996d75a61281a01404f5927edd0be66424839c744093",
      },
      // ✅ Disable checksum — fixes the CORS preflight failure
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    const { fileName, contentType, folder } = req.query;

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    const folderName = folder || "uploads";
    const safeFileName = fileName.replace(/\s+/g, "_");
    const key = `${folderName}/${Date.now()}_${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: "happypickles",
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    // ✅ unhoistableHeaders tells the signer NOT to include checksum headers
    const url = await getSignedUrl(s3, command, {
      expiresIn: 60,
      unhoistableHeaders: new Set([
        "x-amz-checksum-crc32",
        "x-amz-sdk-checksum-algorithm",
      ]),
    });

    const publicUrl = `https://pub-e263b366c3584a049243b3d1fecb54ee.r2.dev/${key}`;

    return res.status(200).json({ url, publicUrl });

  } catch (err) {
    console.error("Presign error:", err);
    return res.status(500).json({
      error: "Failed to generate upload URL",
      message: err.message,
    });
  }
}
