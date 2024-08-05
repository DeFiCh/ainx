# dfi_utxo_consolidator

```
Consolidate UTXOs in an address

Usage: <program> -addr=<address> [opts]

Options:
  -h, --help              Print this help message
  -a, --addr              Address
  -d, --delay             Delay in seconds between TXs
      --minconf           Min confirmations of utxo req. to be considered
      --maxconf           Max confirmations of utxo req. to be considered
      --minamount         Min amount value of utxo req. to be considered
      --maxamount         Min amount value of utxo req. to be considered
      --maxcount          Max number of utxos in one consolidation TX
```

### Examples

#### Consolidate funds in `dZcHjYhKtEM88TtZLjp314H2xZjkztXtRc`

`just dfi_utxo_consolidator::run --addr="dZcHjYhKtEM88TtZLjp314H2xZjkztXtRc" --maxcount=380 --minconf=20 --maxamount=50 --delay=5`

### Quick tasks

- `just dfi_utxo_consolidator::run_cfp_addr`: To consolidate funds in the CFP
  address
