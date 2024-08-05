export interface KvStore<K> {
  get<V>(k: K): Promise<V | undefined>;
  put(k: K, v: unknown): Promise<void>;
  del(k: K, end?: K): Promise<void>;
  iter(k?: K, reverse?: boolean): AsyncGenerator<{ k: K; v: unknown }>;
}

export interface KvStoreWithBlob<K> extends KvStore<K> {
  getBlob<V>(k: K): Promise<V | undefined>;
  putBlob(k: K, v: unknown): Promise<void>;
  delBlob(k: K, end?: K): Promise<void>;
  iterBlob(k?: K, reverse?: boolean): AsyncGenerator<{ k: K; v: unknown }>;
}
