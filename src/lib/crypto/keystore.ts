const DB_NAME = 'zenwallet-keystore';
const DB_VERSION = 1;
const STORE_NAME = 'wallets';

interface StoredWallet {
  id: string;
  publicKey: string;
  encryptedSecretKey: string; // Base64 encoded
  salt: string; // Base64 encoded
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveWallet(
  publicKey: string,
  encryptedSecretKey: Uint8Array,
  salt: Uint8Array
): Promise<void> {
  const db = await openDB();

  const wallet: StoredWallet = {
    id: publicKey,
    publicKey,
    encryptedSecretKey: uint8ArrayToBase64(encryptedSecretKey),
    salt: uint8ArrayToBase64(salt),
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(wallet);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getWallet(publicKey: string): Promise<{
  encryptedSecretKey: Uint8Array;
  salt: Uint8Array;
} | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(publicKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const wallet = request.result as StoredWallet | undefined;
      if (!wallet) {
        resolve(null);
        return;
      }
      resolve({
        encryptedSecretKey: base64ToUint8Array(wallet.encryptedSecretKey),
        salt: base64ToUint8Array(wallet.salt),
      });
    };
  });
}

export async function getAllWallets(): Promise<string[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as string[]);
  });
}

export async function deleteWallet(publicKey: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(publicKey);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Helpers
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
