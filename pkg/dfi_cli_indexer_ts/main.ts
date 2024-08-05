#!/usr/bin/env -S deno run -A

import {
  BlockHeight,
  CliDriver,
  GetBlockResponseV4,
  initTimedLogger,
} from "@pkg/dfi_cli_sdk_ts/lib.ts";
import { parseArgs } from "@std/cli/parse-args";
import { RocksDbStore, SqliteStore } from "@pkg/utils_ts/lib.ts";
import { BlockchainStore } from "./lib.ts";
import { dirname } from "@std/path/dirname";

function loadOpts() {
  const alias = {
    "help": "h",
    "output": "o",
    "start": "s",
    "end": "e",
    "data": "d",
  };
  const args = parseArgs(Deno.args, {
    alias,
    string: ["data", "start", "end", "db"],
    default: {
      db: "sqlite",
    },
    boolean: ["help", "dump"],
    "--": false,
    unknown: (args) => {
      console.log(`Error: unknown args: ${args}`);
      Deno.exit(1);
    },
  });
  const getHelpText = () => {
    let text =
      "Build a DFI index with node's getblock high verbosity mode as source.\n\n";
    text += "Usage: <program> --data=<string> [flags]\n\n";
    text += "Options:\n";
    text += "  -h, --help                   Print this help message\n";
    text += "      --db=<type>              DB type: sqlite, rocksdb\n";
    text +=
      "  -d, --data=<file-or-dir>     Output file when sqlite, dir rocksdb.\n";
    text += "  -s, --start=<block_num>      Start block number (0).\n";
    text +=
      "  -e, --end=<block_num>        End block number. (-1: getblockcount)\n";
    text +=
      "      --dump                   Dump indexes rather than indexing.\n";
    return text;
  };
  const validate = () => {
    if (args.db && !["sqlite", "rocksdb"].includes(args.db)) {
      console.log("Error: invalid db type");
      return false;
    }
    if (args.start && !Number.isInteger(Number(args.start))) {
      console.log("Error: invalid start block number");
      return false;
    }
    if (args.end && !Number.isInteger(Number(args.end))) {
      console.log("Error: invalid end block number");
      return false;
    }
    return true;
  };
  if (args.help || !validate()) {
    console.log(getHelpText());
    Deno.exit(1);
  }
  if (!args.data) {
    console.log("Error: data is required");
    Deno.exit(1);
  }
  if (!args.data.startsWith("/")) {
    args.data = Deno.cwd() + "/data/" + args.data;
  }
  if (args.db.startsWith("sqlite") && args.data.endsWith("/")) {
    console.log("Error: data required as a file for sqlite, not dir");
    Deno.exit(1);
  }
  return {
    db: args.db,
    data: args.data,
    start: args.start ? Number(args.start) : null,
    end: args.end ? Number(args.end) : null,
    dump: args.dump,
  };
}

async function main() {
  initTimedLogger();
  const args = loadOpts();

  const cli = new CliDriver();
  console.log(
    `cli: ${cli.path} ${cli.args.join(" ")}, args: ${Deno.inspect(args)}`,
  );

  await Deno.mkdir(
    args.db.startsWith("sqlite") ? dirname(args.data) : args.data,
    { recursive: true },
  );

  const kv = args.db.startsWith("sqlite")
    ? new SqliteStore<string>(args.data)
    : new RocksDbStore<string>(args.data);

  const store = new BlockchainStore(kv);

  if (args.dump) {
    await new DataDumper().dump(args, store);
    return;
  }

  const start = args.start == null ? 0 : args.start;
  const end = args.end == null ? (await cli.getBlockHeight()).value : args.end;

  await new DfiCliIndexer().run(cli, store, start, end);
}

class DataDumper {
  async dump(
    args: ReturnType<typeof loadOpts>,
    store: BlockchainStore,
  ) {
    // We just dump the indexes and exit.
    const startKey = args.start == null
      ? undefined
      : store.keyEncode("h", args.start);
    const endKey = args.end == null
      ? undefined
      : store.keyEncode("h", args.end);
    console.log(`dump index: [${startKey}, ${endKey}]`);
    for await (const x of store.getStore().iter(startKey)) {
      if (endKey && x.k > endKey) {
        break;
      }
      const k = store.keyDecode(x.k);
      console.log(`${k} (${x.k}): ${x.v}`);
    }
  }
}

class DfiCliIndexer {
  async run(
    cli: CliDriver,
    store: BlockchainStore,
    startBlock: number,
    endBlock: number,
  ) {
    const kv = store.getStore();
    const lastRunBlockKey = store.keyEncode("x/last_run_block");
    const getLastRunBlock = async () => {
      const r = await kv.get(lastRunBlockKey);
      return Number(r) || 0;
    };

    let lastRunBlock = await getLastRunBlock();
    let adjustedStartBlock = startBlock;

    console.log(`lastRunBlock: ${lastRunBlock}`);
    if (lastRunBlock > startBlock) {
      adjustedStartBlock = lastRunBlock + 1;
    }

    const markLastUpdated = async (height: number) => {
      lastRunBlock = height;
      await kv.put(lastRunBlockKey, lastRunBlock.toString());
    };

    for (let i = adjustedStartBlock; i < endBlock; i++) {
      if (i % 500 === 0 || i === endBlock - 1 || i === adjustedStartBlock) {
        console.log(i);
        await markLastUpdated(i - 1);
      }

      const hash = await cli.getBlockHash(new BlockHeight(i));
      const x = await cli.getBlock(hash, 4) as GetBlockResponseV4;

      await store.setBlock(hash.value, x);
      await store.setHeightHash(i, hash.value);

      for (const tx of x.tx) {
        await store.setTxHeight(tx.txid, i);
        await store.setTx(tx.txid, tx);
      }
    }
    console.log("store completed");
  }
}

main();
