import JSZip from 'jszip';
import forge from 'node-forge';

/**
 * Computes SHA-256 in Base64 using pure node-forge (runs uniformly in Browser + Node + WebView)
 */
export function computeSha256Base64(data: Uint8Array | string): string {
  const md = forge.md.sha256.create();
  if (typeof data === 'string') {
    md.update(forge.util.encodeUtf8(data));
  } else {
    // Convert Uint8Array to byte string
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    md.update(binary);
  }
  const hex = md.digest().toHex();
  let bin = '';
  for (let i = 0; i < hex.length; i += 2) {
    bin += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return btoa(bin);
}

/**
 * Signs a JSZip APK archive with a valid Android v1 signature (JAR signing)
 * Producing genuine META-INF/MANIFEST.MF, META-INF/CERT.SF, and META-INF/CERT.RSA
 */
export async function signApkArchive(
  zip: JSZip,
  appName: string = 'Release',
  onProgress?: (percent: number, status: string) => void
): Promise<Blob> {
  onProgress?.(72, 'Computing cryptographic SHA-256 digests for all package entries...');

  // 1. Remove old signature files
  const toDelete: string[] = [];
  zip.forEach((entryPath) => {
    if (
      entryPath.startsWith('META-INF/') &&
      (entryPath.endsWith('.SF') ||
        entryPath.endsWith('.RSA') ||
        entryPath.endsWith('.DSA') ||
        entryPath.endsWith('.EC') ||
        entryPath.endsWith('MANIFEST.MF'))
    ) {
      toDelete.push(entryPath);
    }
  });
  toDelete.forEach((p) => zip.remove(p));

  // 2. Generate MANIFEST.MF
  let manifest = 'Manifest-Version: 1.0\r\nCreated-By: 1.0 (Android Signer)\r\n\r\n';
  const fileDigests: Array<{ name: string; hash: string; entryHeader: string }> = [];
  const files = Object.keys(zip.files).sort();

  for (const name of files) {
    const entry = zip.files[name];
    if (entry.dir || name.startsWith('META-INF/')) continue;
    const content = await entry.async('uint8array');
    const hash = computeSha256Base64(content);
    const entryHeader = `Name: ${name}\r\nSHA-256-Digest: ${hash}\r\n\r\n`;
    manifest += entryHeader;
    fileDigests.push({ name, hash, entryHeader });
  }

  const manifestHash = computeSha256Base64(manifest);

  // 3. Generate CERT.SF
  let certSf = `Signature-Version: 1.0\r\nCreated-By: 1.0 (Android Signer)\r\nSHA-256-Digest-Manifest: ${manifestHash}\r\n\r\n`;
  for (const item of fileDigests) {
    const entryHash = computeSha256Base64(item.entryHeader);
    certSf += `Name: ${item.name}\r\nSHA-256-Digest: ${entryHash}\r\n\r\n`;
  }

  onProgress?.(82, 'Generating cryptographic RSA key and X.509 certificate...');

  // 4. Generate RSA 2048 key & self-signed certificate
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Date.now().toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 30);

  const cleanName = appName.replace(/[^a-zA-Z0-9 ]/g, '').trim() || 'Android App';
  const attrs = [
    { name: 'commonName', value: cleanName },
    { name: 'organizationName', value: 'Web To APK Creator' },
    { name: 'countryName', value: 'US' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  onProgress?.(88, 'Generating PKCS#7 SignedData signature block (CERT.RSA)...');

  // 5. Create PKCS#7 signed block
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(forge.util.encodeUtf8(certSf));
  p7.addCertificate(cert);
  p7.addSigner({
    key: keys.privateKey,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() as any },
    ] as any,
  });
  p7.sign({ detached: true });

  const rsaDer = forge.asn1.toDer(p7.toAsn1()).getBytes();
  const rsaBytes = new Uint8Array(rsaDer.length);
  for (let i = 0; i < rsaDer.length; i++) {
    rsaBytes[i] = rsaDer.charCodeAt(i);
  }

  // 6. Inject signature files into META-INF
  zip.file('META-INF/MANIFEST.MF', manifest);
  zip.file('META-INF/CERT.SF', certSf);
  zip.file('META-INF/CERT.RSA', rsaBytes);

  onProgress?.(94, 'Packaging final signed installable APK binary...');

  return await zip.generateAsync(
    {
      type: 'blob',
      mimeType: 'application/vnd.android.package-archive',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(
        Math.min(99, Math.round(94 + metadata.percent * 0.05)),
        `Finalizing APK: ${Math.round(metadata.percent)}%`
      );
    }
  );
}
