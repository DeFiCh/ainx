import { default as RocksDB } from "npm:level-rocksdb";
import { KvStoreWithBlob } from "@pkg/utils_ts/kv.ts";
export class RocksDbStore<K> implements KvStoreWithBlob<K> {
  db: any;

  constructor(
    path: string,
    private processInput?: (val: unknown) => Promise<unknown>,
    private processOutput?: (val: unknown) => Promise<unknown>,
  ) {
    this.db = this.initDb(path);
  }

  initDb(path: string) {
    const db = RocksDB(path, { prefix: "", createIfMissing: true, keyEncoding: "binary" });
    return db;
  }

  async get<V>(k: K): Promise<V | undefined> {
    try {
      const v = await this.db.get(k);
      return this.processOutput ? await this.processOutput(v) as V : v as V;
    } catch (_) {
      return undefined;
    }
  }

  async put<V>(k: K, v: V): Promise<void> {
    const val = this.processInput ? await this.processInput(v) : v;
    return this.db.put(k, val);
  }

  async del(k: K, end?: K): Promise<void> {
    // RocksDB exposes DeleteRange for more efficient op, but this isn't
    // exposed by the level-rocksdb wrapper at this point. A better alternative
    // might be to use batch. 
    if (end != null) {
      for await (const x of this.iter(k, false)) {
        await this.db.del(x.k);
        if (x.k >= end) {
          break;
        }
      }
    }
    return this.db.del(k);
  }

  async *iter<V>(k?: K, reverse: boolean = false): AsyncGenerator<{ k: K; v: V }> {
    // Note: Passing k as undefined directly doesn't seems to work if gte key is set, even if
    // undefined. So we pre-check this. 
    const iterOpts = k === undefined ? { reverse } : { reverse, gte: k };
    const it = await this.db.iterator(iterOpts);
    for await (const [key, value] of it) {
      yield { k: key, v: this.processOutput ? await this.processOutput(value) as V : value as V };
    }
  }

  // We also implement the blob interfaces, but we just redirect to the main interfaces
  // as RockDB implements it implicitly, use KV. 
  // TODO: Ideally, we could do 2 separate column stores where one has an extremely low blob db limit.
  // This should provide explicit control for the application.  
  getBlob<V>(k: K): Promise<V | undefined> {
    return this.get(k);
  }
  putBlob(k: K, v: unknown): Promise<void> {
    return this.put(k, v);
  }
  delBlob(k: K, end?: K | undefined): Promise<void> {
    return this.del(k, end);
  }
  iterBlob(k?: K | undefined, reverse?: boolean): AsyncGenerator<{ k: K; v: unknown; }> {
    return this.iter(k, reverse);
  }
}
