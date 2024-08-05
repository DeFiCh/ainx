pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")
logs_dir := install_dir / "var/log" / pkg_id

_default:
    just --list --justfile {{ source_file() }}

deps:
    just dfi_cli_sdk_ts::lint

build:
    deno compile --output={{ install_dir }}/bin/ -A ./main.ts 

run *args:
    deno run -A ./main.ts {{ args }}

fmt:
    deno fmt

lint:
    deno check ./main.ts && deno fmt --check

install: build

clean: 
    rm -f {{ install_dir }}/bin/{{ pkg_id }}

clean_logs:
    rm -rf {{ logs_dir }}

purge: clean clean clean_logs

# quick tasks

run_cfp_addr: 
    #!/bin/bash
    log_file={{ logs_dir }}/{{ datetime_utc("%F-u%s.log") }}
    mkdir -p $(dirname ${log_file})
    just {{ pkg_id }}::run --addr="dZcHjYhKtEM88TtZLjp314H2xZjkztXtRc" \
        --maxcount=380 --minconf=20 --maxamount=50 --delay=5 | tee ${log_file}
