mod sqlite3_deno

_default:
    just --list --justfile {{ source_file() }}

# Currently there's no way to iterate through all modules,
# so we just manually build up a list
modules := "sqlite3_deno"

build:
    #!/bin/env -S bash -Eeuo pipefail
    for x in {{ modules }}; do
    echo "====="
    (set -x; just ext::${x}::build)
    done

install:
    #!/bin/env -S bash -Eeuo pipefail
    for x in {{ modules }}; do
    echo "====="
    (set -x; just ext::${x}::install)
    done

clean:
    #!/bin/env -S bash -Eeuo pipefail
    for x in {{ modules }}; do
    echo "====="
    (set -x; just ext::${x}::clean)
    done

update:
    git submodule update --remote