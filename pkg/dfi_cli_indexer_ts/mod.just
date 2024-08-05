pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")
data_dir := install_dir / "var/lib" / pkg_id

_default:
    just --list --justfile {{ source_file() }}

deps:
    just dfi_cli_sdk_ts::lint
    just utils_ts::lint

build:
    deno compile --output={{ install_dir }}/bin/ -A ./main.ts 

run *args:
    deno run --unstable-ffi -A ./main.ts {{ args }}

fmt:
    deno fmt

lint:
    deno check ./main.ts && deno fmt --check

install: build

clean:
    rm -f {{ install_dir }}/bin/{{ pkg_id }}

# quick tasks

run_sqlite *args:
    just {{ pkg_id }}::run --db=sqlite --data={{ data_dir }}/data.sqlite {{ args }}

run_rocksdb *args:
    just {{ pkg_id }}::run --db=rocksdb --data={{ data_dir }}/data.rocksdb/ {{ args }}
