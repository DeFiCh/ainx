build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")

# TODO: workspace pre-req install

default:
    just --list --justfile {{ source_file() }}

init: _init_out
    #!/bin/env -S bash -Eeuo pipefail
    mkdir -p {{ build_dir }}

_init_out:
    #!/bin/env -S bash -Eeuo pipefail
    mkdir -p {{ install_dir }}/{bin,lib,etc,share,include,systemd}

clean: 
    #!/bin/env -S bash -Eeuo pipefail
    rm -rf {{ build_dir }} {{ install_dir }}

purge: clean
    just ext::clean

refresh: clean init
