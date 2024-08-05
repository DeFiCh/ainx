pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")
data_dir := install_dir / "var/lib" / pkg_id

# We redirect to the local build. This requires sqlite3 to be built from
# the deno lib. 
export DENO_SQLITE_PATH := install_dir / "lib/sqlite3_deno/libsqlite3.so"

_default:
    just --list --justfile {{ source_file() }}

deps:
    just dfi_cli_sdk_ts::build
    just utils_ts::build

build: deps
    deno compile --output={{ install_dir }}/bin/ -A ./main.ts 

run *args: deps
    deno run --unstable-ffi -A ./main.ts {{ args }}

fmt:
    deno fmt

lint:
    deno check ./main.ts && deno fmt --check

install: build

clean:
    rm -f {{ install_dir }}/bin/{{ pkg_id }}

purge: clean clean_sqlite clean_rocksdb

# quick tasks

run_sqlite *args:
    just {{ pkg_id }}::run --db=sqlite --data={{ data_dir }}/data.sqlite {{ args }}

run_rocksdb *args:
    just {{ pkg_id }}::run --db=rocksdb --data={{ data_dir }}/data.rocksdb/ {{ args }}

clean_sqlite:
    rm -f {{ data_dir }}/data.sqlite*

clean_rocksdb:
    rm -rf {{ data_dir }}/data.rocksdb/

