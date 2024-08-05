pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")
# TODO: get debug or release build conf
build_type := "debug"

_default:
    just --list --justfile {{ source_file() }}

deps:

build: deps
    cargo build -p {{ pkg_id }}

run: deps
    cargo run -p {{ pkg_id }}

test:
    cargo test -p {{ pkg_id }}

fmt: 
    cargo fmt -p {{ pkg_id }}

lint:
    cargo clippy -p {{ pkg_id }}

install: build
    cp -f {{ build_dir }}/{{ build_type }}/{{ pkg_id }} {{ install_dir }}/bin/{{ pkg_id }}

clean:
    cargo clean -p {{ pkg_id }}

purge: clean
