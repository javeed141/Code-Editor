export type RepositorySnapshot = {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  headSha: string;
  fetchedAt: number;
};

export type StoredRepoFile = {
  id: string;
  snapshotId: string;
  path: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  sha?: string;
  size?: number;
  language?: string;
  isBinary?: boolean;
  isModified?: boolean;
  updatedAt: number;
};

const DB_NAME = "ai-code-editor-db";
const DB_VERSION = 1;
const REPOSITORY_SNAPSHOTS_STORE = "repositorySnapshots";
const REPOSITORY_FILES_STORE = "files";

function getIndexedDB(): IDBFactory | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.indexedDB;
}

export function getRepositorySnapshotId(owner: string, repo: string, branch: string): string {
  return `${owner}/${repo}/${branch}`;
}

function openDatabase(): Promise<IDBDatabase> {
  const indexedDBInstance = getIndexedDB();
  if (!indexedDBInstance) {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBInstance.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(REPOSITORY_SNAPSHOTS_STORE)) {
        db.createObjectStore(REPOSITORY_SNAPSHOTS_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(REPOSITORY_FILES_STORE)) {
        const filesStore = db.createObjectStore(REPOSITORY_FILES_STORE, { keyPath: "id" });
        filesStore.createIndex("snapshotId", "snapshotId", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB."));
  });
}

export async function saveRepositorySnapshot(snapshot: RepositorySnapshot): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_SNAPSHOTS_STORE, "readwrite");
    const store = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
    const request = store.put(snapshot);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to save repository snapshot."));
  });
}

export async function getRepositorySnapshot(snapshotId: string): Promise<RepositorySnapshot | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_SNAPSHOTS_STORE, "readonly");
    const store = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
    const request = store.get(snapshotId);

    request.onsuccess = () => resolve((request.result as RepositorySnapshot | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to read repository snapshot."));
  });
}

export async function saveRepositoryFiles(snapshotId: string, files: StoredRepoFile[]): Promise<void> {
  if (!files.length) return;

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_FILES_STORE, "readwrite");
    const store = transaction.objectStore(REPOSITORY_FILES_STORE);

    let pending = files.length;
    let failed = false;

    for (const file of files) {
      const request = store.put({ ...file, snapshotId });
      request.onsuccess = () => {
        pending -= 1;
        if (!failed && pending === 0) {
          resolve();
        }
      };
      request.onerror = () => {
        failed = true;
        reject(request.error ?? new Error("Failed to save repository files."));
      };
    }
  });
}

export async function getRepositoryFiles(snapshotId: string): Promise<StoredRepoFile[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_FILES_STORE, "readonly");
    const store = transaction.objectStore(REPOSITORY_FILES_STORE);
    const index = store.index("snapshotId");
    const request = index.getAll(snapshotId);

    request.onsuccess = () => resolve((request.result as StoredRepoFile[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to list repository files."));
  });
}

export async function getRepositoryFile(snapshotId: string, path: string): Promise<StoredRepoFile | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_FILES_STORE, "readonly");
    const store = transaction.objectStore(REPOSITORY_FILES_STORE);
    const request = store.get(`${snapshotId}:${path}`);

    request.onsuccess = () => resolve((request.result as StoredRepoFile | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to read repository file."));
  });
}

export async function deleteRepositorySnapshot(snapshotId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REPOSITORY_SNAPSHOTS_STORE, REPOSITORY_FILES_STORE], "readwrite");
    const snapshotsStore = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
    const filesStore = transaction.objectStore(REPOSITORY_FILES_STORE);
    const index = filesStore.index("snapshotId");

    const deleteSnapshotRequest = snapshotsStore.delete(snapshotId);
    const fileRequest = index.openCursor(IDBKeyRange.only(snapshotId));

    fileRequest.onsuccess = () => {
      const cursor = fileRequest.result;
      if (cursor) {
        filesStore.delete(cursor.primaryKey);
        cursor.continue();
      }
    };

    deleteSnapshotRequest.onsuccess = () => resolve();
    deleteSnapshotRequest.onerror = () => reject(deleteSnapshotRequest.error ?? new Error("Failed to delete repository snapshot."));
    transaction.onerror = () => reject(transaction.error ?? new Error("Failed to delete repository snapshot."));
  });
}

export async function clearRepositoryCache(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([REPOSITORY_SNAPSHOTS_STORE, REPOSITORY_FILES_STORE], "readwrite");

    const snapshotsStore = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
    const filesStore = transaction.objectStore(REPOSITORY_FILES_STORE);

    const snapshotsRequest = snapshotsStore.clear();
    const filesRequest = filesStore.clear();

    let pending = 2;
    let failed = false;

    function finalize() {
      pending -= 1;
      if (!failed && pending === 0) {
        resolve();
      }
    }

    snapshotsRequest.onsuccess = finalize;
    filesRequest.onsuccess = finalize;
    snapshotsRequest.onerror = () => {
      failed = true;
      reject(snapshotsRequest.error ?? new Error("Failed to clear repository snapshot cache."));
    };
    filesRequest.onerror = () => {
      failed = true;
      reject(filesRequest.error ?? new Error("Failed to clear repository files cache."));
    };
  });
}
