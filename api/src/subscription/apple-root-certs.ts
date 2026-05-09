import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve } from "path";

const APPLE_CERT_AUTHORITY_URL = "https://www.apple.com/certificateauthority/";
const SUPPORTED_CERT_EXTENSIONS = [".cer", ".der"] as const;

export function loadAppleRootCertificates(dir: string): Buffer[] {
  const absoluteDir = resolve(dir);

  if (!existsSync(absoluteDir) || !statSync(absoluteDir).isDirectory()) {
    throw new Error(
      `Apple root certs directory not found at ${absoluteDir}. Download the Apple root CA certs from ${APPLE_CERT_AUTHORITY_URL} and place them in this directory.`,
    );
  }

  const certFiles = readdirSync(absoluteDir).filter((file) =>
    SUPPORTED_CERT_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext)),
  );

  if (certFiles.length === 0) {
    throw new Error(
      `No Apple root certs found in ${absoluteDir}. Download the 4 Apple root CA certs from ${APPLE_CERT_AUTHORITY_URL} and place them in this directory.`,
    );
  }

  return certFiles.map((file) => readFileSync(join(absoluteDir, file)));
}
