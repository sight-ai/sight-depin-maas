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


npm run build:production


### run with cli(assume the file is called sightai)
```
// start with logger
./sightai start

// start in background
./sight start -d

// specificy a transport mode when starting (default is libp2p)
./sightai start -d --transport libp2p
./sightai start -d --transport socket

// check transport status
./sightai transport status

// check all the transport modes
./sightai transport list

// switch transport mode while running
./sightai transport switch socket
./sightai transport switch libp2p

// stop the server
./sightai stop
```