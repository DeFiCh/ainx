# ainx

The monorepo for everything going forward 

## Notes

### `just` Conventions

- `just`: List all available tasks
- `just --list`: List all tasks including sub-modules
- `just <project>`: List project's sub-tasks
- `just <project>::build`: Build `<project>`
- `just <project>::clean`: Clean-up `<project>`
- `just <project>::run`: Run `<project>` with default args
- `just <project>::fmt`: Format `<project>`
- `just <project>::lint`: Lint `<project>`
- `just <project>::install`: Install `<project>` into output sysroot (`.out/`)

Read about [just](https://github.com/casey/just) here. We use it as the common _task_ runner and to specify dependency
rules across projects.

Note that just is very minimal, _not_ a build system like make is, but fixes all other issues with make. Use it to
automate most as many tasks as possible and such that the above conventions are upheld and any pre-requisite, be it
fetching, building, bundling, cleaning up after yourself are taken care of implicitly.

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
  - For build systems that auto manage workspaces with different projects (like cargo), redirect the build system
    to use it's own dir inside (eg: `.build/target` for rust projects)
  - For projects that needs it's own, create a dir inside with the project name  (same as inside `pkg` dir) and 
    everything should be inside this dir unless shared between projects for which create your own namespace inside.
    (Eg: `examples/cpp_project` -> `.build/cpp_project`)
- `.out`:
  - This a final sysroot of the output only. This is equivalent to the `install` of coming from makefiles.
    This is also how the layout on a final install on user system should look like.
    - `.out/bin`: All of the executable binaries go here. Add this to the path for easy access.
      - Flat layout.
      - Keep your project names for the final output. Do not collide with other projects.
    - `.out/lib`: All of the shared / dynamic libs go here.
      - Flat layout.
      - Add this to the LD_LIBRARY_PATH for easy local access.
      - For cross-linking between projects, it needs to be deployed here and this is the search dir.
      - Do not collide with other projects. If multiple projects build the same dep, it needs to be a third_party
        project on it's own or be built by the dep's own project, just add it to your dep in the just module.
    - `.out/etc`: Any config files and example format with defaults.
      - Use a directory inside `etc/<project>/...`.
    - `.out/share`: Any other arch data files, ideally architecture independent and portable.
      - Use a directory inside `share/<project>/...`.
    - `.out/include`: This is for output layout of include headers for software outside of the monorepo. 
      - For internal use, always directly consume it from WORKSPACE_ROOT relative path.
      - Use a directory inside `include/<project>/...`
    - `.out/systemd`: Please provide systemd unit files for any service or long running self-managed processes like
      microservices, web apps, web APIs, node etc.
      - Flat layout.
      - Prefix with `<project>-` - eg: `<project>-x.unit`
      - Infrastructure will consume services in one of two ways: systemd or K8s.

## Best practices

- All paths should be either project relative or WORKSPACE_ROOT relative that can be exported to your
  project build system through just and env vars.
- All projects are it's own island free to use any tooling that makes sense. However, there should only be one copy of
  each dependency and one version throughout as much as possible (there may be exceptional cases, but make best effort
  to avoid this). Vendor and use third-party dir when needed.

- Read the [book](./book/README.md) for more info.
