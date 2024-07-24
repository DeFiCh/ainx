mod cpp_project
mod rust_project
mod rust_project_with_deps

_default:
    just --list --justfile {{ source_file() }}