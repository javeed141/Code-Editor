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
  originalContent?: string;
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

function runTransaction(
  stores: string | string[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => void,
): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(stores, mode);
        operation(transaction);

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("IndexedDB transaction failed."));
        };
        transaction.onabort = () => {
          db.close();
          reject(transaction.error ?? new Error("IndexedDB transaction was aborted."));
        };
      }),
  );
}

export async function saveRepositorySnapshot(snapshot: RepositorySnapshot): Promise<void> {
  return runTransaction(REPOSITORY_SNAPSHOTS_STORE, "readwrite", (transaction) => {
    transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE).put(snapshot);
  });
}

export async function getRepositorySnapshot(snapshotId: string): Promise<RepositorySnapshot | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_SNAPSHOTS_STORE, "readonly");
    const store = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
    const request = store.get(snapshotId);

    transaction.oncomplete = () => {
      db.close();
      resolve((request.result as RepositorySnapshot | undefined) ?? null);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Failed to read repository snapshot."));
    };
  });
}

export async function saveRepositoryFiles(snapshotId: string, files: StoredRepoFile[]): Promise<void> {
  if (!files.length) return;

  return runTransaction(REPOSITORY_FILES_STORE, "readwrite", (transaction) => {
    const store = transaction.objectStore(REPOSITORY_FILES_STORE);
    for (const file of files) {
      store.put({ ...file, snapshotId });
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

    transaction.oncomplete = () => {
      db.close();
      resolve((request.result as StoredRepoFile[]) ?? []);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Failed to list repository files."));
    };
  });
}

export async function getRepositoryFile(snapshotId: string, path: string): Promise<StoredRepoFile | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(REPOSITORY_FILES_STORE, "readonly");
    const store = transaction.objectStore(REPOSITORY_FILES_STORE);
    const request = store.get(`${snapshotId}:${path}`);

    transaction.oncomplete = () => {
      db.close();
      resolve((request.result as StoredRepoFile | undefined) ?? null);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Failed to read repository file."));
    };
  });
}

export async function deleteRepositorySnapshot(snapshotId: string): Promise<void> {
  return runTransaction(
    [REPOSITORY_SNAPSHOTS_STORE, REPOSITORY_FILES_STORE],
    "readwrite",
    (transaction) => {
      const snapshotsStore = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
      const filesStore = transaction.objectStore(REPOSITORY_FILES_STORE);
      const index = filesStore.index("snapshotId");

      snapshotsStore.delete(snapshotId);
      const fileRequest = index.openCursor(IDBKeyRange.only(snapshotId));

      fileRequest.onsuccess = () => {
        const cursor = fileRequest.result;
        if (cursor) {
          filesStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    },
  );
}

export async function clearRepositoryCache(): Promise<void> {
  return runTransaction(
    [REPOSITORY_SNAPSHOTS_STORE, REPOSITORY_FILES_STORE],
    "readwrite",
    (transaction) => {
      const snapshotsStore = transaction.objectStore(REPOSITORY_SNAPSHOTS_STORE);
      const filesStore = transaction.objectStore(REPOSITORY_FILES_STORE);

      snapshotsStore.clear();
      filesStore.clear();
    },
  );
}
