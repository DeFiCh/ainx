# ainx

The monorepo for everything going forward 

## Notes

### `just` Common Conventions

- `just`: List all available tasks
- `just --list`: List all tasks including sub-modules
- `just <project>`: List project's sub-tasks.
- `just <project>::run`: Run `<project>` with default args.
- `just <project>::build`: Build `<project>`
- `just <project>::fmt`: Format `<project>`
- `just <project>::lint`: Lint `<project>`
- `just <project>::install`: Install `<project>` into output sysroot (`.out/`)

Read about [just](https://github.com/casey/just) here. We use it as the common _task_ runner and to specify dependency
rules across projects. Note that just is _not_ a build system like make is, but fixes all other issues with make.
We use project native build systems (cmake for C++, cargo for Rust, deno on it's own, etc) both to be able to keep
learning curve low instead of bazel / buck, etc and also to build projects as it's designed to be with native tooling.
`just` is just task running wrapper around to create common conventions. Use it to wrap native build system such
that any team can build, run and reuse any projects with the common conventions.

### Structure

- The root hierarchy consists of the following:
  - `pkg/<project>`:
    - All packages go here, binary or library.
    - Keep flat as much as possible and organically group when they outgrow.
  - `infra/<project>`:
    - Infrastructure projects that setup VM, etc
  - `third_party`:
    - All third-party code including dependencies that need to be vendored or not
      a part of the official package manager goes here (or if the native package
      manager tends to keep multiple copies).

#### Build & Output Sysroot

- `.build`:
  - This is the build dir where all the build artifacts or intermediate / temporary artifacts go.
- `.out`:
  - This a final sysroot of the output only. This is equivalent to the `install` of coming from makefiles.
    This is also how the layout on a final install on user system should look like.
    - `.out/bin`: All of the executable binaries go here. Add this to the path for easy access.
    - `.out/lib`: All of the shared / dynamic libs go here. Add this to the LD_LIBRARY_PATH for easy local access.
      Cross-linking between projects search for it here.
    - `.out/include`: This is for output layout of include headers for software outside of the monorepo. For internal
      use, always directly consume it from WORKSPACE_ROOT relative path.
    - `.out/systemd`: Please provide systemd unit files for any service or long running self-managed processes like
      microservices, web apps, web APIs, node etc.
      - Infrastructure will consume services in one of two ways: systemd or K8s.

## Best practices

- All paths should be either project relative or WORKSPACE_ROOT relative that can be exported to your
  project build system through just and env vars.
- All projects are it's own island free to use any tooling that makes sense. However, there should only be one copy of
  each dependency and one version throughout as much as possible (there may be exceptional cases, but make best effort
  to avoid this). Vendor and use third-party dir when needed.

- Read the [book](./book/README.md) for more info.
