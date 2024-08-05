# dfi_cli_indexer_ts

```
Build a DFI index with node's getblock high verbosity mode as source.

Usage: <program> --data=<string> [flags]

Options:
  -h, --help                   Print this help message
      --db=<type>              DB type: sqlite, rocksdb
  -d, --data=<file-or-dir>     Output file when sqlite, dir rocksdb.
  -s, --start=<block_num>      Start block number (0).
  -e, --end=<block_num>        End block number. (-1: getblockcount)
      --dump                   Dump indexes rather than indexing.
```

### Examples

#### Index upto the current block

- `just dfi_cli_indexer_ts::run -db=sqlite`

#### Index upto the current block but use rocksdb as backing store

- `just dfi_cli_indexer_ts::run -db=rocksdb`

#### Index the first 100 blocks

- `just dfi_cli_indexer_ts::run -db=sqlite --start=0 --end=100`

#### Same as above, but use a different backing store location

- `just dfi_cli_indexer_ts::run -db=sqlite --data=/tmp/dfi_cli_indexer_ts.sqlite`


### Quick tasks

- `just dfi_utxo_consolidator::run_sqlite`: Run with sqlite db under sysroot
- `just dfi_utxo_consolidator::run_rocksdb`: Run with rocks db under sysroot

#### Quick task impl

- `just dfi_cli_indexer_ts::run_sqlite --help` does the following: 
  - `just dfi_cli_indexer_ts::run --db=sqlite --data=/home/user/src/defich/ainx/.out/var/lib/dfi_cli_indexer_ts/data.sqlite --help`
  - `deno run --unstable-ffi -A ./main.ts --db=sqlite --data=/home/user/src/defich/ainx/.out/var/lib/dfi_cli_indexer_ts/data.sqlite --help`
