import { ethers } from "@esm/ethers";
import {
  Address,
  Amount,
  BlockHash,
  BlockHeight,
  hexToDecimal,
  makeSerializable,
  TokenAmount,
  TxHash,
} from "./common.ts";
import {
  AccountToAccountArgs,
  AccountToUtxosArgs,
  AddressMapKind,
  AddressType,
  EvmTxArgs,
  PoolSwapArgs,
  SendToAddressArgs,
  SendTokensToAddressArgs,
  TransferDomainArgs,
} from "./req.ts";
import {
  AddressMapResponse,
  GetAccountIndexedResponse,
  GetAccountResponse,
  GetAccountTokenAmountArrayResponse,
  GetBlockResponse,
  GetBlockResponseV0,
  GetBlockResponseV1,
  GetBlockResponseV2,
  GetBlockResponseV3,
  GetBlockResponseV4,
  GetBlockStatsResponse,
  GetNetworkInfoResponse,
  GetPoolPairResponse,
  GetTokenBalancesResponse,
  GetTokenBalancesResponseArray,
  GetTokenBalancesResponseDecoded,
  GetTokenResponse,
  GetTransactionResponse,
  ListAccountsResponse,
  ListAccountsResponses,
  ListTokensResponse,
  TokenResponseFormat,
  Unspent,
} from "./resp.ts";
import { BurnTokensArgs } from "./req.ts";
import { Runtime } from "./rt.ts";
import { ListAccountsIndexedResponse } from "./resp.ts";

export { ethers };

export class Output {
  constructor(private _buf: string) {}

  toString() {
    return this._buf;
  }
  json() {
    return JSON.parse(this.toString());
  }

  filterLine(
    predicate: (value: string, index: number, array: string[]) => unknown,
  ) {
    return this.toString()
      .split("\n")
      .filter(predicate)
      .join("\n");
  }
}

export function trimConsoleText(str: string) {
  return str
    .trim()
    .replace(/^\n*/g, "")
    .replace(/\n*$/g, "")
    .replace(/^\s*/g, "")
    .replace(/^\s*$/g, "");
}

interface IQueryOptions {
  minimumAmount?: number;
  maximumAmount?: number;
  maximumCount?: number;
  minimumSumAmount?: number;
}

export class CliDriver {
  public path: string;
  public args: string[];
  private _evmProvider: ethers.JsonRpcProvider | null = null;
  private _onEachBlockFuncs: Array<(height: BlockHeight) => Promise<void>> = [];

  constructor(cliPath?: string | null, ...args: string[]) {
    const defaultEvnPath = "/usr/bin/env";
    const defaultCliName = "defi-cli";
    if (cliPath) {
      this.path = cliPath;
    } else {
      const envPath = Runtime.env.get("DEFI_CLI");
      if (envPath) {
        this.path = envPath;
      } else {
        this.path = defaultEvnPath;
      }
    }
    if (this.path === defaultEvnPath) {
      if (args.length < 1) {
        args = [defaultCliName];
      } else if (args[0] != defaultCliName) {
        args = [defaultCliName, ...args];
      }
    }
    this.args = args;
  }

  run(...args: string[]) {
    const finalArgs = [...this.args, ...args];
    // console.debug(finalArgs);
    return Runtime.processRun(this.path, ...finalArgs);
  }

  async output(...args: string[]) {
    const finalArgs = [...this.args, ...args];
    // console.debug(JSON.stringify(finalArgs));
    const stdout = await Runtime.processOutput(this.path, ...finalArgs);
    return new Output(new TextDecoder().decode(stdout));
  }

  async outputString(...args: string[]) {
    return (await this.output(...args)).toString();
  }

  setEvmProvider(provider: ethers.JsonRpcProvider) {
    this._evmProvider = provider;
  }

  evm() {
    return this._evmProvider;
  }

  async waitForBlock(minHeight?: BlockHeight) {
    let min = minHeight ? minHeight.value : 0;
    let current = (await this.getBlockHeight()).value;
    if (!min) min = current + 1;

    while (current < min) {
      // we check every 15s
      await new Promise((res, _) => setTimeout(() => res(0), 15 * 1000));
      current = (await this.getBlockHeight()).value;
      // console.debug(`wait for block: ${min}, current: ${current}`);
    }
    return new BlockHeight(current);
  }

  addEachBlockEvent(func: (height: BlockHeight) => Promise<void>) {
    if (this._onEachBlockFuncs.indexOf(func) === -1) {
      this._onEachBlockFuncs.push(func);
    }
  }

  async runBlockEventLoop() {
    let onEachBlockFuncs = this._onEachBlockFuncs;
    let height = await this.getBlockHeight();
    while (onEachBlockFuncs.length > 0) {
      // console.debug(`on each block event: ${height.value}`);
      for (const func of onEachBlockFuncs) {
        try {
          await func(height);
        } catch (err) {
          console.error(err);
        }
      }
      height = await this.waitForBlock(new BlockHeight(height.value + 1));
      onEachBlockFuncs = this._onEachBlockFuncs;
    }
  }

  async getNewAddress(
    type: AddressType = AddressType.Bech32,
    label = "",
  ): Promise<Address> {
    const res = await this.outputString(
      "getnewaddress",
      label,
      type.toString(),
    );
    return new Address(trimConsoleText(res));
  }

  async getBlockHeight(): Promise<BlockHeight> {
    const res = await this.outputString("getblockcount");
    const blocks = parseInt(trimConsoleText(res));
    if (!Number.isFinite(blocks)) {
      throw new Error("invalid numeric value returned");
    }
    return new BlockHeight(blocks);
  }

  async getBalance() {
    const res = await this.outputString("getbalance");
    const resNum = parseFloat(trimConsoleText(res));
    if (!Number.isFinite(resNum)) {
      throw new Error(`invalid balance number: ${res}`);
    }
    return resNum;
  }

  async getTokenBalances(
    decodeTokenStrings = true,
    useTokenNames = true,
  ): Promise<GetTokenBalancesResponse> {
    const res = await this.output(
      "gettokenbalances",
      "{}",
      decodeTokenStrings.toString(),
      useTokenNames.toString(),
    );
    const resJson = res.json();
    if (decodeTokenStrings) {
      return resJson as GetTokenBalancesResponseDecoded;
    } else {
      return (resJson as string[]).map((x) =>
        new TokenAmount(x)
      ) as GetTokenBalancesResponseArray;
    }
  }

  async getToken(args: string) {
    const res = await this.output("gettoken", args);
    const resJson = res.json();
    // We fix up the id so make life easier
    const id = Object.keys(resJson)[0];
    // deno-lint-ignore no-explicit-any
    const o = Object.values(resJson)[0] as any;
    o["id"] = parseInt(id);
    return o as GetTokenResponse;
  }

  async getPoolPair(args: string) {
    const res = await this.output("getpoolpair", args);
    const resJson = res.json();
    // We fix up the id so make life easier
    const id = Object.keys(resJson)[0];
    // deno-lint-ignore no-explicit-any
    const o = Object.values(resJson)[0] as any;
    o["id"] = parseInt(id);
    return o as GetPoolPairResponse;
  }

  async poolSwap(args: PoolSwapArgs) {
    const res = await this.outputString(
      "poolswap",
      JSON.stringify(makeSerializable(args)),
    );
    return new TxHash(trimConsoleText(res));
  }

  async addPoolLiquidity(args: TokenAmount[]) {
    const res = await this.outputString(
      "addpoolliquidity",
      JSON.stringify(makeSerializable(args)),
    );
    return new TxHash(trimConsoleText(res));
  }

  async removePoolLiquidity(from: Address, amount: TokenAmount) {
    const res = await this.outputString(
      "removepoolliquidity",
      from.value,
      amount.toString(),
    );
    return new TxHash(trimConsoleText(res));
  }

  async compositeSwap(args: PoolSwapArgs) {
    const res = await this.outputString(
      "compositeswap",
      JSON.stringify(makeSerializable(args)),
    );
    return new TxHash(trimConsoleText(res));
  }

  async testPoolSwap(args: PoolSwapArgs) {
    const res = await this.outputString(
      "testpoolswap",
      JSON.stringify(makeSerializable(args)),
      "auto",
    );
    return new TokenAmount(trimConsoleText(res));
  }

  async getBlockHash(args: BlockHeight) {
    const res = await this.outputString("getblockhash", args.value.toString());
    return new TxHash(trimConsoleText(res));
  }

  async listTokens(
    pagination: { start?: string; including_start?: boolean; limit?: number } =
      {},
    verbose: boolean = true,
  ): Promise<ListTokensResponse> {
    const res = await this.output(
      "listtokens",
      JSON.stringify(pagination),
      verbose.toString(),
    );
    return res.json() as ListTokensResponse;
  }

  async listAccounts(
    pagination: { start?: string; including_start?: boolean; limit?: number } =
      {},
    indexedAmounts: boolean = false,
    isMineOnly: boolean = false,
  ): Promise<ListAccountsResponses> {
    const cmdArgs = [
      JSON.stringify(pagination),
      false.toString(),
      indexedAmounts.toString(),
      isMineOnly.toString(),
    ];
    const res = await this.output("listaccounts", ...cmdArgs);
    const resJson = res.json();
    if (!indexedAmounts) {
      const r = resJson as { key: string; owner: string; amount: string }[];
      return r.map((x) => {
        return { ...x, amount: new TokenAmount(x.amount) };
      }) as ListAccountsResponse;
    } else {
      return resJson as ListAccountsIndexedResponse;
    }
  }

  async getAccount(
    args: Address,
    format: TokenResponseFormat = TokenResponseFormat.List,
  ): Promise<GetAccountResponse> {
    const cmdArgs = [args.value];
    if (format != TokenResponseFormat.List) {
      // Node does this. Just delegate
      cmdArgs.push(
        "{}",
        format === TokenResponseFormat.IndexedAsTokenId ? "true" : "false",
      );
    }
    const res = await this.output("getaccount", ...cmdArgs);
    const resJson = res.json();
    if (format === TokenResponseFormat.List) {
      return (resJson as string[]).map((x) =>
        new TokenAmount(x)
      ) as GetAccountTokenAmountArrayResponse;
    }
    if (format === TokenResponseFormat.IndexedAsTokenId) {
      return resJson as GetAccountIndexedResponse;
    }
    return (resJson as string[]).reduce((acc, cur) => {
      const t = new TokenAmount(cur);
      acc[t.token()] = t.amount();
      return acc;
    }, {} as GetAccountIndexedResponse) as GetAccountIndexedResponse;
  }

  async ethGetBalance(args: Address) {
    const res = await this.outputString(
      "eth_getBalance",
      args.value.toString(),
    );
    return new Amount(hexToDecimal(trimConsoleText(res)));
  }

  async ethChainId() {
    const res = await this.outputString("eth_chainId");
    return hexToDecimal(trimConsoleText(res));
  }

  async ethGasPrice() {
    const res = await this.outputString("eth_gasPrice");
    return new Amount(hexToDecimal(trimConsoleText(res)));
  }

  async ethAccounts() {
    const res = await this.output("eth_accounts");
    return res.json() as string[];
  }

  async listUnspent(
    minConf: number = 1,
    maxConf: number = 9999999,
    addresses: Address[] = [],
    includeUnsafe: boolean = false,
    queryOpts: IQueryOptions = {},
  ) {
    const res = await this.output(
      "listunspent",
      minConf.toString(),
      maxConf.toString(),
      JSON.stringify(addresses.map((x) => x.value)),
      includeUnsafe ? "true" : "false",
      JSON.stringify(queryOpts),
    );
    return res.json() as Unspent[];
  }

  async createRawTransaction(
    txIns: { txid: string; vout: number }[],
    txOut: { [address: string]: number },
  ) {
    const res = await this.output(
      "createrawtransaction",
      JSON.stringify(txIns),
      JSON.stringify(txOut),
    );
    return trimConsoleText(res.toString());
  }

  async signRawTransactionWithWallet(hexString: string) {
    const res = await this.output("signrawtransactionwithwallet", hexString);
    return res.json() as { hex: string; complete: boolean };
  }

  async sendRawTransaction(hexString: string, feeRate: number = 0) {
    const res = await this.output(
      "sendrawtransaction",
      hexString,
      feeRate.toFixed(8),
    );
    return trimConsoleText(res.toString());
  }

  async getBlock(args: BlockHash, verbosity = 0): Promise<GetBlockResponse> {
    const res = await this.output(
      "getblock",
      args.value.toString(),
      verbosity.toString(),
    );
    // deno-lint-ignore no-explicit-any
    const resJson = res.json() as any;
    switch (verbosity) {
      case 0:
        return resJson as GetBlockResponseV0;
      case 1:
        return resJson as GetBlockResponseV1;
      case 2:
        return resJson as GetBlockResponseV2;
      case 3:
        return resJson as GetBlockResponseV3;
      case 4:
        return resJson as GetBlockResponseV4;
    }
    throw new Error("unsupported verbosity");
  }

  async getTransaction(args: TxHash, includeWatchOnly = true) {
    const res = await this.output(
      "gettransaction",
      args.value.toString(),
      includeWatchOnly.toString(),
    );
    return res.json() as GetTransactionResponse;
  }

  async getRawTransaction(args: TxHash) {
    const res = await this.output(
      "getrawtransaction",
      args.value.toString(),
    );
    return res.toString().trim();
  }

  async decodeRawTransaction(rawTxStr: string) {
    const res = await this.output(
      "decoderawtransaction",
      rawTxStr,
    );
    return res.json();
  }

  async addressMap(addr: Address, type: AddressMapKind = AddressMapKind.Auto) {
    const res = await this.output(
      "addressmap",
      addr.value,
      type.toString(),
    );
    return res.json() as AddressMapResponse;
  }

  async invalidateBlock(args: BlockHash) {
    await this.outputString("invalidateblock", args.value.toString());
    return;
  }

  async waitForTx(args: TxHash, log = true): Promise<BlockHeight> {
    const writeText = (x: string) => {
      return Deno.stdout.writeSync(new TextEncoder().encode(x));
    };
    log && writeText(`wait for tx: ${args.value}`);
    while (true) {
      try {
        const tx = await this.getTransaction(args);
        const r = await this.getBlock(new BlockHash(tx.blockhash), 1);
        const height = (r as GetBlockResponseV1).height;
        log && writeText("\n");
        return new BlockHeight(height);
      } catch (_) {
        // continue
      }
      log && writeText(".");
      await this.waitForBlock();
    }
  }

  async sendToAddress(args: SendToAddressArgs) {
    const res = await this.outputString(
      "sendtoaddress",
      args.address.value,
      args.amount.toString(),
      args.comment,
      args.commentTo,
      args.subtractFeeFromAmount.toString(),
    );
    return new TxHash(trimConsoleText(res));
  }

  async sendUtxosFrom(
    from: Address,
    to: Address,
    amount: number,
    changeAddress?: Address,
  ) {
    const res = await this.outputString(
      "sendutxosfrom",
      from.value,
      to.value,
      amount.toFixed(8),
      changeAddress ? changeAddress.value : from.value,
    );
    return new TxHash(trimConsoleText(res));
  }

  async logAccountBalances(
    logToFile: boolean = false,
    logToConsole: boolean = true,
  ): Promise<{ accounts: { [address: string]: string[] }; count: number }> {
    const res = await this.output(
      "logaccountbalances",
      logToFile.toString(),
      logToConsole.toString(),
    );
    return res.json();
  }

  async accountToUtxos(args: AccountToUtxosArgs) {
    const res = await this.outputString(
      "accounttoutxos",
      args.from.value,
      JSON.stringify({
        [args.to.value]: [TokenAmount.from(args.toAmount, "DFI").toString()],
      }),
    );
    return new TxHash(trimConsoleText(res));
  }

  async accountToAccount(args: AccountToAccountArgs) {
    const res = await this.outputString(
      "accounttoaccount",
      args.from.value,
      JSON.stringify({ [args.to.value]: args.amount.toString() }),
    );
    return new TxHash(trimConsoleText(res));
  }

  async burnTokens(args: BurnTokensArgs) {
    const res = await this.outputString(
      "burntokens",
      JSON.stringify({
        "amounts": args.amounts.value,
        "from": args.from.value,
      }),
    );

    return new TxHash(trimConsoleText(res));
  }

  async getAvgFeeRateFromStats(
    targetHeight: BlockHeight,
    pastSearchBlockNum: number = 100,
  ): Promise<number> {
    let stats;
    let h = await this.getBlockHeight();
    if (targetHeight.value < h.value) {
      h = targetHeight;
    }
    let i = pastSearchBlockNum;
    while (i > 0) {
      stats = await this.getBlockStats(new BlockHeight(h.value - i));
      if (stats.avgfeerate > 0) {
        return 0.00000001 * stats.avgfeerate as number;
      }
      i--;
    }
    throw new Error("failed to estimate fee rate");
  }

  async getBlockStats(
    heightOrHash: BlockHeight | BlockHash,
  ): Promise<GetBlockStatsResponse> {
    const res = await this.output(
      "getblockstats",
      heightOrHash.value.toString(),
    );
    return res.json();
  }

  async getNetworkInfo(): Promise<GetNetworkInfoResponse> {
    const res = await this.output(
      "getnetworkinfo",
    );
    return res.json();
  }

  async estimateSmartFee(blocksCountHintToConfirm: number = 1): Promise<{
    feerate: number;
    blocks: number;
    errors?: string[];
  }> {
    const res = await this.output(
      "estimatesmartfee",
      blocksCountHintToConfirm.toString(),
    );
    return res.json();
  }

  async utxosToAccount(
    address: Address,
    amount: number,
    inputs?: { txid: string; vout: number }[],
  ) {
    const res = await this.outputString(
      "utxostoaccount",
      JSON.stringify({
        [address.value]: [TokenAmount.from(amount, "DFI").toString()],
      }),
      inputs ? JSON.stringify(inputs) : "[]",
    );
    return new TxHash(trimConsoleText(res));
  }

  async sendTokensToAddress(args: SendTokensToAddressArgs) {
    const res = await this.outputString(
      "sendtokenstoaddress",
      JSON.stringify(args.from),
      JSON.stringify(args.to),
      args.selectionMode.toString(),
    );
    return new TxHash(trimConsoleText(res));
  }

  async evmTx(args: EvmTxArgs) {
    const res = await this.outputString(
      "evmtx",
      args.from.value,
      args.nonce.toString(),
      args.gasPrice.toString(),
      args.gasLimit.toString(),
      args.to.value,
      args.amount.toString(),
      args.data,
    );
    return new TxHash(trimConsoleText(res));
  }

  async transferDomain(args: TransferDomainArgs) {
    const param = JSON.stringify([{
      src: {
        address: args.from.value,
        amount: args.amount.toString(),
        domain: args.domainFrom,
      },
      dst: {
        address: args.to.value,
        amount: args.amount.toString(),
        domain: args.domainTo,
      },
      nonce: args.nonce,
      // singlekeycheck: args.singleKeyCheck,
    }]);
    const res = await this.outputString("transferdomain", param);
    return new TxHash(trimConsoleText(res));
  }
}
