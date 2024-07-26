// deno-lint-ignore-file no-explicit-any

import { TokenAmount } from "./common.ts";
import { AddressMapKind } from "./req.ts";

export interface GetPoolPairResponse {
  id: number;
  symbol: string;
  name: string;
  status: boolean;
  idTokenA: string;
  idTokenB: string;
  dexFeePctTokenA: number;
  dexFeeInPctTokenA: number;
  reserveA: number;
  reserveB: number;
  commission: number;
  totalLiquidity: number;
  "reserveA/reserveB": number;
  "reserveB/reserveA": number;
  tradeEnabled: boolean;
  ownerAddress: string;
  blockCommissionA: number;
  blockCommissionB: number;
  rewardPct: number;
  rewardLoanPct: number;
  creationTx: string;
  creationHeight: number;
}

export interface GetTransactionResponse {
  amount: number;
  fee: number;
  confirmations: number;
  blockhash: string;
  blockindex: number;
  blocktime: number;
  txid: string;
  walletconflicts: any[];
  time: number;
  timereceived: number;
  "bip125-replaceable": string;
  details: GetTransactionResponseDetails[];
  hex?: string;
}

export interface GetTransactionResponseDetails {
  category: string;
  amount: number;
  vout: number;
  fee?: number;
  abandoned?: boolean;
  address?: string;
  label?: string;
}

export type GetBlockResponse =
  | GetBlockResponseV0
  | GetBlockResponseV1
  | GetBlockResponseV2
  | GetBlockResponseV3
  | GetBlockResponseV4;
export type GetBlockResponseV0 = string;
export interface GetBlockResponseV1 {
  hash: string;
  confirmations: number;
  strippedsize: number;
  size: number;
  weight: number;
  height: number;
  masternode: string;
  minter: string;
  mintedBlocks: number;
  stakeModifier: string;
  version: number;
  versionHex: string;
  merkleroot: string;
  nonutxo: GetBlockResponseNonUtxo[];
  tx: string[];
  time: number;
  mediantime: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  nextblockhash: string;
}

export interface GetBlockResponseNonUtxo {
  AnchorReward: number;
  CommunityDevelopmentFunds: number;
  Burnt: number;
}

export interface GetBlockResponseV2 {
  hash: string;
  confirmations: number;
  strippedsize: number;
  size: number;
  weight: number;
  height: number;
  masternode: string;
  minter: string;
  mintedBlocks: number;
  stakeModifier: string;
  version: number;
  versionHex: string;
  merkleroot: string;
  nonutxo: GetBlockResponseNonUtxo[];
  tx: TxResponseV2[];
  time: number;
  mediantime: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  nextblockhash: string;
}

export interface GetBlockResponseV3Plus {
  hash: string;
  confirmations: number;
  strippedsize: number;
  size: number;
  weight: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  bits: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  nextblockhash: string;
  minter: MinterInfo;
  rewards: RewardInfo;
}

export interface GetBlockResponseV3 extends GetBlockResponseV3Plus {
  tx: TxResponseV3[];
}

export interface GetBlockResponseV4 extends GetBlockResponseV3Plus {
  tx: TxResponseV4[];
}

export interface MinterInfo {
  id: string;
  owner: string;
  operator: string;
  rewardAddress: string;
  totalMinted: number;
  stakeModifier: number;
}

export interface RewardInfo {
  block: number;
  IncentiveFunding: number;
  AnchorReward: number;
  CommunityDevelopmentFunds: number;
  Loan: number;
  Options: number;
  Burnt: number;
}

export interface EVMBlockHeader {
  parenthash: string;
  beneficiary: string;
  stateRoot: string;
  receiptRoot: string;
  number: number;
  gasLimit: number;
  gasUsed: number;
  timestamp: number;
  nonce: number;
  baseFee: number;
}

export interface XVMTxCoinbaseInfo {
  vmtype: "coinbase";
  txtype: "coinbase";
  msg: {
    version: number;
    evm: {
      version: number;
      blockHash: string;
      burntFee: number;
      priorityFee: number;
      beneficiary: string;
    };
  };
  xvmHeader: EVMBlockHeader;
}

export interface XVMTxInfo {
  vmtype: "evm" | "dvm" | "coinbase";
  txtype: string;
  msg: any;
}

export interface TxResponse {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: VinResponse[];
}

export interface TxResponseV2 extends TxResponse {
  vout: VoutResponseV2[];
  hex: string;
}

export interface TxResponseV3 extends TxResponse {
  vout: VoutResponse[];
  vm: XVMTxCoinbaseInfo | XVMTxInfo;
}

export interface TxResponseV4 extends TxResponse {
  vout: VoutResponse[];
  hex: string;

  vm: XVMTxCoinbaseInfo | XVMTxInfo;
}

export interface VinResponse {
  coinbase: string;
  sequence: number;
}

export interface VoutResponse {
  value: number;
  n: number;
  scriptPubKey: ScriptPubKeyResponse;
}

export interface VoutResponseV2 extends VoutResponse {
  tokenId: number;
}

export interface ScriptPubKeyResponse {
  asm: string;
  hex: string;
  reqSigs?: number;
  type: string;
  addresses?: string[];
}

export type ListTokensResponse = { [tokenId: string]: ListTokensItem };

export interface ListTokensItem {
  symbol: string;
  symbolKey: string;
  name: string;
  decimal: number;
  limit: number;
  mintable: boolean;
  tradeable: boolean;
  isDAT: boolean;
  isLPS: boolean;
  finalized: boolean;
  isLoanToken: boolean;
  minted: number;
  creationTx: string;
  creationHeight: number;
  destructionTx: string;
  destructionHeight: number;
  collateralAddress: string;
}


// TODO: Add other formats
export type ListAccountsResponses = ListAccountsResponse | ListAccountsIndexedResponse;

export type ListAccountsResponse = ListAccountsResponseItem[];
export type ListAccountsIndexedResponse = ListAccountsResponseIndexedItem[];

export interface ListAccountsResponseItem { key: string, owner: string, amount: TokenAmount };
export interface ListAccountsResponseIndexedItem { key: string, owner: string, amount: { [key: string]: number } };

export type GetTokenBalancesResponse =
  | GetTokenBalancesResponseArray
  | GetTokenBalancesResponseDecoded;

export type GetAccountResponse =
  | GetAccountTokenAmountArrayResponse
  | GetAccountIndexedResponse;

export type GetAccountTokenAmountArrayResponse = TokenAmount[];
export interface GetAccountIndexedResponse {
  [keyof: string]: number;
}

export enum TokenResponseFormat {
  List = 0,
  IndexedAsTokenId = 1,
  IndexedAsTokenName = 2,
}

export type GetTokenBalancesResponseArray = TokenAmount[];

export interface GetTokenBalancesResponseDecoded {
  [key: string]: number;
}

export interface AddressMapResponse {
  input: string;
  type: AddressMapKind;
  format: {
    [key: string]: string;
  };
}

export interface GetTokenResponse {
  id: number;
  symbol: string;
  symbolKey: string;
  name: string;
  decimal: number;
  limit: number;
  mintable: boolean;
  tradeable: boolean;
  isDAT: boolean;
  isLPS: boolean;
  finalized: boolean;
  isLoanToken: boolean;
  minted: number;
  creationTx: string;
  creationHeight: number;
  destructionTx: string;
  destructionHeight: number;
  collateralAddress: string;
}

export interface Unspent {
  txid: string
  vout: number
  address: string
  label: string
  scriptPubKey: string
  amount: number
  confirmations: number
  spendable: boolean
  solvable: boolean
  desc: string
  safe: boolean
}

export interface GetBlockStatsResponse {
  avgfee: number
  avgfeerate: number
  avgtxsize: number
  blockhash: string
  feerate_percentiles: number[]
  height: number
  ins: number
  maxfee: number
  maxfeerate: number
  maxtxsize: number
  medianfee: number
  mediantime: number
  mediantxsize: number
  minfee: number
  minfeerate: number
  mintxsize: number
  outs: number
  subsidy: number
  swtotal_size: number
  swtotal_weight: number
  swtxs: number
  time: number
  total_out: number
  total_size: number
  total_weight: number
  totalfee: number
  txs: number
  utxo_increase: number
  utxo_size_inc: number
}


export interface GetNetworkInfoResponse {
  version: number;
  subversion: string;
  protocolversion: number;
  localservices: string;
  localrelay: boolean;
  timeoffset: number;
  networkactive: boolean;
  connections: number;
  networks: NetworkInfo[];
  relayfee: number;
  incrementalfee: number;
  localaddresses: NetworkInfoLocalAddress[];
  warnings: string;
}

export interface NetworkInfo {
  name: string;
  limited: boolean;
  reachable: boolean;
  proxy: string;
  proxy_randomize_credentials: boolean;
}

export interface NetworkInfoLocalAddress {
  address: string;
  port: number;
  score: number;
}
