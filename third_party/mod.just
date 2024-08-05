mod sqlite3_deno

_default:
    just --list --justfile {{ source_file() }}

build:
    just third_party::sqlite3_deno::build

install:
    just third_party::sqlite3_deno::install
