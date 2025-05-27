# Saito Miner

- We use [Nx](./README_NX.md) as our build system.

## Workflow development

- `nx run api-server:serve` to start api-server, endpoint exposed at http://localhost:8716/api/v1/keeper
## Development

## prerequisite

### Install asdf
1. install asdf
https://asdf-vm.com/guide/getting-started.html

2. install asdf plugins
```
cat .tool-versions | awk '{print $1}' | xargs -n 1 asdf plugin add
```

### Build all
nx run-many --target=build --all



pnpm nx build cli-wrapper --configuration=production --skip-nx-cache
pnpm nx build api-server --configuration=production --skip-nx-cache
