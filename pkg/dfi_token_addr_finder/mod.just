pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")

_default:
    just --list --justfile {{ source_file() }}

deps:
    just dfi_cli_sdk_ts::build

build: deps
    deno compile --output={{ install_dir }}/bin/ -A ./main.ts 

run *args: deps
    deno run -A ./main.ts {{ args }}

fmt:
    deno fmt

lint:
    deno check ./main.ts && deno fmt --check

install: build

clean:
    rm -f {{ install_dir }}/bin/{{ pkg_id }}

purge: clean