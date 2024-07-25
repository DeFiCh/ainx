pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD")
install_dir := shell("echo $WORKSPACE_OUT")

_default:
    just --list --justfile {{ source_file() }}

deps:
    # make sure we specify the depenency for the graph even if 
    # it doesn't require an explicit build
    just examples::deno_project::lint

build:
    deno compile --output={{ install_dir }}/bin/ -A main.ts 

run *args:
    deno run -A main.ts {{ args }}

fmt:
    deno fmt

lint:
    deno check ./main.ts && deno fmt --check

install: build

clean: 
    rm -f {{ install_dir }}/bin/{{ pkg_id }}
