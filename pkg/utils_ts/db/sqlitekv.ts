import { BindValue, Database, Statement } from "@ext/deno_sqlite3/mod.ts";
import { KvStore } from "@pkg/utils_ts/lib.ts";
import { KvStoreWithBlob } from "@pkg/utils_ts/kv.ts";

export class SqliteCore {
  db: Database;

  constructor(
    path: string,
    private processInput?: (val: unknown) => Promise<unknown>,
    private processOutput?: (val: unknown) => Promise<unknown>,
  ) {
    this.db = this.initDb(path);
  }

  initDb(path: string) {
    const db = new Database(path);
    this.initPragma(db);
    this.initDbTables(db);
    return db;
  }

  initPragma(db: Database) {
    db.exec("pragma locking_mode=exclusive");
    db.exec("pragma journal_mode=wal2");
    db.exec("pragma secure_delete=off");
    db.exec("pragma synchronous=normal");
    db.exec("pragma analysis_limit=1000"); // recommended
    db.exec("pragma wal_autocheckpoint=1000"); // default
    db.exec("pragma page_size=4096"); // default
    db.exec("pragma auto_vacuum=0"); // 0| none / 1| full / 2|incremental
    db.exec("pragma journal_size_limit=67108864"); // 1024 * 1024 * 64 // default: -1
    db.exec("pragma wal_checkpoint(truncate)"); // let's restart the wal
  }

  initDbTables(db: Database) {
    db.exec(
      `create table if not exists kv(k text primary key not null, v blob)`,
    );
  }

  async getStatementValue<K, V>(stmt: Statement, k: K): Promise<V | undefined> {
    const res = stmt.value(k as BindValue);
    if (res && res[0] !== undefined) {
      return this.processOutput
        ? await this.processOutput(res[0]) as V
        : res[0] as V;
    }
    return undefined;
  }

  async runStatement<K>(
    stmt: Statement,
    k: K[],
    ...args: unknown[]
  ): Promise<void> {
    let v = [] as BindValue[];
    if (args.length) {
      v = await Promise.all(
        args.map(async (v) =>
          this.processInput ? await this.processInput(v) : v
        ),
      ) as BindValue[];
    }
    stmt.run(...k as BindValue[], ...v);
  }

  async *iterStatement<K, V>(stmt: Statement, ...args: K[]) {
    for (const { k, v } of stmt.iter(...args as BindValue[])) {
      yield {
        k,
        v: this.processOutput ? await this.processOutput(v) as V : v as V,
      };
    }
  }
}

function generateStatements(
  db: Database,
  table: string = "kv",
  label: string = "",
  isClusteredKey: boolean = false,
) {
  const v: any = {};
  const nativeOrderColumn = isClusteredKey ? "k" : "rowid";

  v[`get${label}`] = db.prepare(`select v from ${table} where k=? limit 1`);
  v[`put${label}`] = db.prepare(`insert or replace into ${table} values(?, ?)`);
  v[`del${label}`] = db.prepare(`delete from ${table} where k = ?`);
  v[`delRange${label}`] = db.prepare(
    `delete from ${table} where k >= ? and k <= ?`,
  );

  v[`iter${label}`] = db.prepare(`select k,v from ${table}`);
  v[`iter${label}Desc`] = db.prepare(
    `select k,v from ${table} order by ${nativeOrderColumn} desc`,
  );
  v[`iter${label}Filter`] = db.prepare(`select k,v from ${table} where k >= ?`);
  v[`iter${label}FilterDesc`] = db.prepare(
    `select k,v from ${table} where k <= ? order by ${nativeOrderColumn} desc`,
  );

  // If it's clustered, everything is ordered by k, we don't need the rest.
  if (isClusteredKey) return v;

  v[`iterOrd${label}`] = db.prepare(`select k,v from ${table} order by k`);
  v[`iterOrd${label}Desc`] = db.prepare(
    `select k,v from ${table} order by k desc`,
  );
  v[`iterOrd${label}Filter`] = db.prepare(
    `select k,v from ${table} where k >= ? order by k`,
  );
  v[`iterOrd${label}FilterDesc`] = db.prepare(
    `select k,v from ${table} where k <= ? order by k desc`,
  );
  return v;
}

export type KeyType = string | number | Uint8Array;

export class SqliteStore<K extends KeyType> extends SqliteCore
  implements KvStoreWithBlob<K> {
  statements: {
    get: Statement;
    put: Statement;
    del: Statement;
    delRange: Statement;
    iter: Statement;
    iterFilter: Statement;
    iterDesc: Statement;
    iterFilterDesc: Statement;

    getBlob: Statement;
    putBlob: Statement;
    delBlob: Statement;
    delRangeBlob: Statement;
    // We don't currently use the 2 below based on native (rowid / insertion) ordering.
    iterBlob: Statement;
    iterBlobFilter: Statement;

    iterOrdBlob: Statement;
    iterOrdBlobDesc: Statement;
    iterOrdBlobFilter: Statement;
    iterOrdBlobFilterDesc: Statement;
  };

  initStatements(db: Database) {
    const stmtClustered = generateStatements(db, "data", "", true);
    const stmtNonClustered = generateStatements(db, "blob", "Blob", false);
    return { ...stmtClustered, ...stmtNonClustered };
  }

  constructor(path: string) {
    super(path);
    this.statements = this.initStatements(this.db);
  }

  initDbTables(db: Database) {
    // This doesn't use row ID. It's a clustered index, K and V stored together in the disk page.
    // Great for ordered lookups, but slower to insert, modify, delete as the B-tree will need re-balancing.
    // Note that the key scans also get expensive if the values are large as more pages needs to be swapped
    // in and out. Ideal for small data.
    db.exec(
      `create table if not exists data(k blob primary key, v blob) without rowid`,
    );
    // This uses the default rowid. rowid results in a non clustered primary key.
    // So, it's great to use for storage without ordering or if the ordering exist as a separate index
    // Ideal for large data.
    db.exec(
      `create table if not exists blob(k blob primary key not null, v blob)`,
    );
  }

  get<V>(k: K): Promise<V | undefined> {
    return this.getStatementValue(this.statements.get, k);
  }

  put(k: K, v: unknown): Promise<void> {
    return this.runStatement(this.statements.put, [k], v);
  }

  del(k: K, end?: K): Promise<void> {
    return end !== undefined
      ? this.runStatement(this.statements.delRange, [k, end])
      : this.runStatement(this.statements.del, [k]);
  }

  iter<V>(k?: K, reverse: boolean = false): AsyncGenerator<{ k: K; v: V }> {
    if (reverse) {
      return k == undefined
        ? this.iterStatement(this.statements.iterDesc)
        : this.iterStatement(this.statements.iterFilterDesc, k);
    }
    return k == undefined
      ? this.iterStatement(this.statements.iter)
      : this.iterStatement(this.statements.iterFilter, k);
  }

  getBlob<V>(k: K): Promise<V | undefined> {
    return this.getStatementValue(this.statements.getBlob, k);
  }

  putBlob(k: K, v: unknown): Promise<void> {
    return this.runStatement(this.statements.putBlob, [k], v);
  }

  delBlob(k: K, end?: K): Promise<void> {
    return end !== undefined
      ? this.runStatement(this.statements.delRangeBlob, [k, end])
      : this.runStatement(this.statements.delBlob, [k]);
  }

  iterBlob(k?: K, reverse: boolean = false) {
    if (reverse) {
      return k == undefined
        ? this.iterStatement(this.statements.iterOrdBlobDesc)
        : this.iterStatement(this.statements.iterOrdBlobFilterDesc, k);
    }
    return k == undefined
      ? this.iterStatement(this.statements.iterOrdBlob)
      : this.iterStatement(this.statements.iterOrdBlobFilter, k);
  }
}
