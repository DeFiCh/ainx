pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")

_default:
    just --list --justfile {{ source_file() }}

deps:
    just third_party::sqlite3_deno::install

build: deps

fmt:
    deno fmt

lint:
    deno check ./lib.ts && deno fmt --check

clean:
