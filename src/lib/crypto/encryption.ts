const IV_LENGTH = 12;

export async function encrypt(
  data: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    data.buffer as ArrayBuffer
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);

  return result;
}

export async function decrypt(
  encryptedData: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  // Extract IV from beginning
  const iv = encryptedData.slice(0, IV_LENGTH);
  const data = encryptedData.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv.buffer as ArrayBuffer,
    },
    key,
    data.buffer as ArrayBuffer
  );

  return new Uint8Array(decrypted);
}
