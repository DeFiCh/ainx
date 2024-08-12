pkg_id := "sqlite3_deno"
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")
ext_dir := shell("echo $WORKSPACE_EXT")
data_dir := install_dir / "var/lib" / pkg_id

_default:
    just --list --justfile {{ source_file() }}

build:
    #!/bin/env -S bash -Eeuo pipefail
    cd {{ ext_dir }}/{{pkg_id}}
    git submodule update --init --recursive
    deno task build

install:
    #!/bin/env -S bash -Eeuo pipefail
    cd {{ ext_dir }}/{{pkg_id}}
    mkdir -p {{ install_dir }}/lib/{{pkg_id}}
    cp -f build/libsqlite3.so {{ install_dir }}/lib/{{pkg_id}}/libsqlite3.so

clean:
    #!/bin/env -S bash -Eeuo pipefail
    cd {{ ext_dir }}/{{pkg_id}}
    rm -rf build sqlite
    rm -rf {{ install_dir }}/lib/{{pkg_id}}
