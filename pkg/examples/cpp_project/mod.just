pkg_id := replace_regex(source_directory(), ".*/", "")
build_dir := shell("echo $WORKSPACE_BUILD") + "/example_" + pkg_id
install_dir := shell("echo $WORKSPACE_OUT")

_default:
    just --list --justfile {{ source_file() }}

configure:
    mkdir -p {{build_dir}}
    cmake -S . -B {{build_dir}} -DCMAKE_INSTALL_PREFIX={{install_dir}}

build: configure
    cmake --build {{build_dir}}

install: build
    cmake --install {{build_dir}} --prefix {{install_dir}}

clean:
    rm -rf {{build_dir}} {{install_dir}}

test: build
    ctest --test-dir {{build_dir}}

purge: clean
