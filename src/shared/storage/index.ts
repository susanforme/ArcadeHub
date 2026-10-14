export interface GameSave {
  id: string;
  bestScore: number;
  score: number;
  updatedAt: number;
  snapshot: unknown | null;
}
let connection: Promise<IDBDatabase> | undefined;
function database() {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('arcadehub', 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore('games', { keyPath: 'id' });
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = undefined;
        };
        resolve(db);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('errors.saveDatabaseBusy'));
    }).catch((error) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
}
export async function listSaves(): Promise<GameSave[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('games', 'readonly');
    const request = tx.objectStore('games').getAll();
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
export async function writeSave(
  id: string,
  score: number,
  snapshot: unknown | null,
) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('games', 'readwrite');
    const store = tx.objectStore('games');
    const previous = store.get(id);
    previous.onsuccess = () => {
      store.put({
        id,
        score,
        snapshot,
        bestScore: Math.max(score, previous.result?.bestScore ?? 0),
        updatedAt: Date.now(),
      } satisfies GameSave);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
