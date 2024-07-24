set shell := ["bash", "-Eeuo", "pipefail", "-c"]

default:
    just --list --justfile {{ source_file() }}

init: _init_out
    mkdir -p $WORKSPACE_BUILD

_init_out:
    mkdir -p $WORKSPACE_OUT/{bin,lib,etc,share,include,systemd}

clean: 
    rm -rf $WORKSPACE_BUILD $WORKSPACE_OUT

refresh: clean init
