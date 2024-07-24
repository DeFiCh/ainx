# We enforce strictness to all commands
set shell := ["bash", "-Eeuo", "pipefail", "-c"]

# We export a root cross libs can use this for internal paths relative to root. 
# Do not overcomplicate parent scripts. Keep it simple, minimal and only
# base items like core paths that'll fit well for all projects. 
# THINK: May be XDG paths later if needed.
export WORKSPACE_ROOT := justfile_directory()
# Intermediate build dir. This is the working dir
export WORKSPACE_BUILD := WORKSPACE_ROOT + "/.build"
# Out dir with unix layout for final outputs
export WORKSPACE_OUT := WORKSPACE_ROOT + "/.out"

# direct flat import
import "pkg/mod.just"

# import as modules
mod infra
mod book
mod third_party
mod workspace

_default:
    just --list

list:
    just --list --list-submodules

