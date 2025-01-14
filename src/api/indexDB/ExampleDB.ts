import { openDB, DBSchema, IDBPDatabase } from "idb";

type Example = {
  id: number;
  modelList: string[];
  clothingList: string[];
};

const DB_NAME = "ai-clothing-change-example-database";
const STORE_NAME = "ai-clothing-change-example-store";

interface MyDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: Example;
  };
}

export async function initDB(): Promise<IDBPDatabase<MyDB>> {
  const db = await openDB<MyDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
  return db;
}
let db: IDBPDatabase<MyDB> | null = null;

async function getDB(): Promise<IDBPDatabase<MyDB>> {
  if (!db) {
    db = await initDB();
  }
  return db;
}

export async function saveExample(params: {
  modelList?: string[];
  clothingList?: string[];
}): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const { modelList, clothingList } = params;

  const existingData = await store.get(1);

  if (existingData) {
    const updatedData = {
      ...existingData,
      ...(modelList !== undefined && { modelList }),
      ...(clothingList !== undefined && { clothingList }),
    };
    await store.put(updatedData);
  } else {
    await store.add({
      id: 1,
      modelList: modelList || [],
      clothingList: clothingList || [],
    });
  }

  await tx.done;
}

export async function getExample(): Promise<Example | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, 1);
}
