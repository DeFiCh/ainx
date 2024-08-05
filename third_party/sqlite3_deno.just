pkg_id := "sqlite3_deno"
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")
third_party_dir := shell("echo $WORKSPACE_THIRD_PARTY")
data_dir := install_dir / "var/lib" / pkg_id

_default:
    just --list --justfile {{ source_file() }}

build:
    #!/bin/env -S bash -Eeuo pipefail
    cd {{ third_party_dir }}/{{pkg_id}}
    git submodule update --init --recursive
    deno task build

install:
    #!/bin/env -S bash -Eeuo pipefail
    cd {{ third_party_dir }}/{{pkg_id}}
    mkdir -p {{ install_dir }}/lib/{{pkg_id}}
    cp -f build/libsqlite3.so {{ install_dir }}/lib/{{pkg_id}}/libsqlite3.so
