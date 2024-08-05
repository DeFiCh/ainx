# Notes

## Repo

- Conventional commits: https://gist.github.com/qoomon/5dfcdf8eec66a051ecd85625518cfd13

## Pre-req

- Git
  - `sudo apt install git`
- C/C++ compiler toolchain for compiling C/C++ or Rust with sys-libs
  - `sudo apt install build-essential g++` or `sudo apt install clang clang-tools`
- Rust toolchain
  - TODO
- Just
  - `cargo binstall just`
- Deno for TypeScript projects
  - TODO

## Where to store data

- For system level data: read `man hier`
  - Store under this hierarchy. Don't store data in random places.
- For user related data, use XDG dirs
  - Read https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
  - Adhere to the UNIX XDG and FHS standards
- Deployed user applications should use the above with flags for redirecting them where appropriate so programs can
  be run both as a user or system level based on the infrastructure.
- When run directly from the user repo, wrap the programs to use `WORKSPACE_OUT` as sysroot

### Maintainer Info

- Do not accept code that isn't a good citizen regardless of if it's a quick script or not.
  - It's a base responsibility of the developer to adhere to FHS and XDG standards and not hardcode things in random
    places.
- This may seems like a small issue, but operational infra can make decisions expecting programs to be good citizens.
- For example, if logs are stored elsewhere, it may not be collected during operational maintenance or can outgrow
  the system may be in a filesystem that wasn't designed with the write access in mind.
- Infrastructure cannot know what's safe to be deleted, what's not.
