#!/usr/bin/env -S deno run -A
/// <reference lib="deno.unstable" />

import {
  Address,
  CliDriver,
  initTimedLogger,
  TxHash,
} from "@pkg/dfi_sdk_ts/lib.ts";
import { sleep } from "@x/sleep@v1.3.0/sleep.ts";
import { parseArgs } from "@std/cli/parse-args";

function loadOpts() {
  const alias = {
    "help": "h",
    "addr": "a",
    "delay": "d",
  };
  const defaults = {
    "minconf": undefined,
    "maxconf": undefined,
    "minamount": undefined,
    "maxamount": undefined,
    "maxcount": undefined,
    "delay": 0,
  };
  const args = parseArgs(Deno.args, {
    alias,
    string: ["addr", ...Object.keys(defaults)],
    boolean: ["help"],
    "--": false,
    default: defaults,
    unknown: (args) => {
      console.log(`Error: unknown args: ${args}`);
      Deno.exit(1);
    },
  });
  const getHelpText = () => {
    let text = "Consolidate UTXOs in an address\n\n";
    text += "Usage: <program> -addr=<address> [opts]\n\n";
    text += "Options:\n";
    text += "  -h, --help              Print this help message\n";
    text += "  -a, --addr              Address\n";
    text += "  -d, --delay             Delay in seconds between TXs\n";
    text +=
      "      --minconf           Min confirmations of utxo req. to be considered\n";
    text +=
      "      --maxconf           Max confirmations of utxo req. to be considered\n";
    text +=
      "      --minamount         Min amount value of utxo req. to be considered\n";
    text +=
      "      --maxamount         Min amount value of utxo req. to be considered\n";
    text +=
      "      --maxcount          Max number of utxos in one consolidation TX\n";
    return text;
  };
  if (args.help || !args.addr) {
    console.log(getHelpText());
    Deno.exit(1);
  }
  const numericArgs: any = {};
  for (const k in defaults) {
    const v = args[k];
    numericArgs[k] = v !== undefined ? Number(v) : undefined;
  }
  return {
    ...numericArgs,
    addr: new Address(args.addr),
  };
}

async function main() {
  const args = loadOpts();
  const {
    addr,
    delay,
    minconf: minConf,
    maxconf: maxConf,
    minamount: minAmount,
    maxamount: maxAmount,
    maxcount: maxCount,
  } = args;

  initTimedLogger();

  const cli = new CliDriver();
  console.log(
    `cli: ${cli.path} ${cli.args.join(" ")}, args: ${Deno.inspect(args)}`,
  );

  const totals = {
    consolidatedTxCount: 0,
    consolidatedAmounts: 0,
    feeSpent: 0,
    receivedAmounts: 0,
    runs: 0,
  };

  let txs;
  while (true) {
    console.log("step: collect UTXOs");
    txs = await cli.listUnspent(minConf, maxConf, [addr], false, {
      maximumAmount: maxAmount,
      maximumCount: maxCount,
      minimumAmount: minAmount,
    });

    if (txs.length < 2) {
      console.log("exit: < 2 UTXO found.");
      return;
    }

    console.log("step: aggregate amount");
    const height = await cli.getBlockHeight();
    const minRelayFee = (await cli.getNetworkInfo()).incrementalfee;
    const inTxs = txs.map((x) => {
      return { txid: x.txid, vout: x.vout };
    });
    const val = txs.reduce((acc, x) => acc + x.amount, 0) as number;

    // dummy tx for fee
    console.log("step: calculate fee");
    const dummytxOut = {} as any;
    dummytxOut[addr.value] = val.toFixed(8);
    const dummyTx = await cli.createRawTransaction(inTxs, dummytxOut);
    const feeRate = await cli.getAvgFeeRateFromStats(height);
    // fee approximation
    const fee = minRelayFee * ((dummyTx.length / 1000) + 1) +
      (dummyTx.length * feeRate);

    const outputChange = val - fee;
    const outputChangeFixed = outputChange.toFixed(8);
    const txOut = {} as any;
    txOut[addr.value] = outputChangeFixed;

    console.log("step: create tx");
    const rawTx = await cli.createRawTransaction(inTxs, txOut);
    // console.log(await cli.decodeRawTransaction(rawTx));

    console.log("step: sign tx");
    const signedTx = await cli.signRawTransactionWithWallet(rawTx);
    // console.log(await cli.decodeRawTransaction(signedTx.hex));

    console.log("step: relay tx");
    const txHash = await cli.sendRawTransaction(signedTx.hex);
    console.log(`tx: ${txHash}, amount: ${outputChangeFixed}, fee: ${fee}`);
    await cli.waitForTx(new TxHash(txHash));
    console.log(`completed: https://defiscan.live/tx/${txHash}`);

    totals.consolidatedTxCount += inTxs.length;
    totals.consolidatedAmounts += val;
    totals.receivedAmounts += outputChange;
    totals.feeSpent += fee;
    totals.runs += 1;

    console.log(`totals: ${Deno.inspect(totals)}`);
    if (delay) {
      console.log(`step: wait for ${delay}s..`);
      await sleep(delay);
    }
  }
}

main();
