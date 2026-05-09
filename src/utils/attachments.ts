// IndexedDB-backed attachment store.
//
// localStorage is capped near 5 MB per origin and is shared by every key on
// the site. A single PDF stored as a base64 data URL inside the journal blob
// is enough to fill that cap. Moving attachment binaries to IndexedDB keeps
// the journal JSON small and durable.

const DB_NAME = 'course-journal-kit';
const DB_VERSION = 1;
const STORE = 'attachments';

type StoredBlob = {
  id: string;
  name: string;
  mimeType: string;
  data: Blob;
  createdAt: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open attachments DB.'));
    req.onblocked = () => reject(new Error('Attachments DB is blocked by another tab.'));
  });
  return dbPromise;
}

function getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDb().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export function isAttachmentsAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function putAttachment(args: {
  id?: string;
  name: string;
  mimeType: string;
  data: Blob;
}): Promise<string> {
  const id = args.id ?? `att-${crypto.randomUUID()}`;
  const record: StoredBlob = {
    id,
    name: args.name,
    mimeType: args.mimeType,
    data: args.data,
    createdAt: new Date().toISOString(),
  };
  const store = await getStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to store attachment.'));
  });
  return id;
}

export async function getAttachment(id: string): Promise<StoredBlob | undefined> {
  const store = await getStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result as StoredBlob | undefined);
    req.onerror = () => reject(req.error ?? new Error('Failed to read attachment.'));
  });
}

export async function deleteAttachment(id: string): Promise<void> {
  const store = await getStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error ?? new Error('Failed to delete attachment.'));
  });
}

export async function getAttachmentObjectUrl(id: string): Promise<string | undefined> {
  const blob = await getAttachment(id);
  if (!blob) return undefined;
  return URL.createObjectURL(blob.data);
}

export async function getAttachmentDataUrl(id: string): Promise<string | undefined> {
  const blob = await getAttachment(id);
  if (!blob) return undefined;
  return blobToDataUrl(blob.data);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = /data:([^;]+)/.exec(meta);
  const mime = mimeMatch?.[1] ?? 'application/octet-stream';
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function estimateAttachmentsBytes(): Promise<number> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      return est.usage ?? 0;
    } catch {
      // fall through to manual count
    }
  }
  const store = await getStore('readonly');
  return new Promise((resolve, reject) => {
    let total = 0;
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(total);
        return;
      }
      const value = cursor.value as StoredBlob;
      total += value.data.size;
      cursor.continue();
    };
    req.onerror = () => reject(req.error ?? new Error('Failed to scan attachments.'));
  });
}
