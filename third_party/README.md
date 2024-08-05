# third_party

This is the repo for third party code.

- All third_party code is organized here, be it forks or copy of licensed code.
- Forks are managed as git submodules.
  - Please ensure to fork the repo first and and add the submodule branch into this dir.
- Each dir in third_party should:
  - Contain an entry module in the `mod.just` file
  - Have a mod `<package>.just` task file that contains the build and install tasks
  - Normally, `deps` rule for each package will take dependency on `build` tasks. However
    for third party code, we use the `install` task instead as it can get expensive to build
    if there's no dependency tracking, and third_party code, by nature is out of our control.
  - The `install` tasks should be such that they fail when it's not built. This ensures that
    the user package is not built and the user is reminded to build the third party code.
- Note: third_party code may not need to be auto-built on changes, and is assumed to be built
  once a single build is complete.
