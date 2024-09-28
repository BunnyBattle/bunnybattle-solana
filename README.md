### Install project dependencies
```
yarn
```

### Install snarkjs globally

To install `snarkjs` run:

```sh
npm install -g snarkjs@latest
```


### Prepare groth-16 solana submodule
```
yarn prepare:submodules
```

### Compile circuits and create verifiers
```
yarn compile:keys
```
If permission problem occurs, run `sudo chmod +x ./circuits/circuits.sh` to solve

### Build Solana Program
```
anchor build
```

### Run tests
```
anchor test
```