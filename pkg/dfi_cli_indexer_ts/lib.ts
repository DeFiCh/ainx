import { KvStore } from "@pkg/utils_ts/lib.ts";

export class BlockchainStore {
  constructor(private kv: KvStore<string>) {}

  getStore() {
    return this.kv;
  }

  keyEncode(key: string, numSuffix?: number) {
    return lexStringEncode(key, numSuffix);
  }

  keyDecode(data: string) {
    return lexStringDecode(data);
  }

  async setBlock(hash: string, value: any) {
    await this.kv.put(this.keyEncode("b/x/" + hash), JSON.stringify(value));
  }

  async setHeightHash(height: number, hash: string) {
    await this.kv.put(this.keyEncode("b/h", height), hash);
  }

  async setTxHeight(txid: string, height: number) {
    await this.kv.put(this.keyEncode("t/h/" + txid), height.toString());
  }

  async setTx(txid: string, value: any) {
    await this.kv.put(this.keyEncode("t/x/" + txid), JSON.stringify(value));
  }

  async getBlock(heightOrHash: number | string): Promise<any> {
    if (typeof heightOrHash === "string") {
      const hash = heightOrHash;
      return JSON.parse(
        await this.kv.get(this.keyEncode("b/x/" + hash)) as string,
      );
    } else {
      const height = heightOrHash;
      const hash = await this.kv.get(this.keyEncode("b/h", height));
      return this.getBlock(hash as string);
    }
  }

  async getTx(txid: string) {
    return JSON.parse(await this.kv.get(this.keyEncode("t/x/" + txid)) as string);
  }

  async getTxHeight(txid: string) {
    return Number(await this.kv.get(this.keyEncode("t/h/" + txid)));
  }
}

// A key encoder that optionally takes num suffix and and turns that to
// lexicographically sortable  directly strings with
// "<str><length>/<num>". Useful to keep numerical sort rather than lexical for numbers.
export function lexStringEncode(
  str: string,
  numSuffix?: number,
  separator: string = "/",
): string {
  const numStr = numSuffix != null ? Math.abs(numSuffix!).toFixed(0) : "";
  if (numStr.length) {
    return str + separator + (numSuffix! < 0 ? -numStr.length : numStr.length) +
      separator + numStr;
  }
  return str;
}

// If there are two separators, then it _could_ contain a number suffix.
// We slice the string such that we extract the last two parts separated by the separator.
// We try to parse the last part as a number entirely, if it's success, then we look at the previous part
// This part should be the length. If the parsed number and length matches, it's success.
// We return the string without the last - 1 part.
// Otherwise, we return the entire string as such.
export function lexStringDecode(
  str: string,
  separator: string = "/",
): string {
  const sepLastIndex = str.lastIndexOf(separator);
  if (sepLastIndex < 0) return str;

  const strPartsLast = str.slice(sepLastIndex + 1);
  const strPartsExceptLast = str.slice(0, sepLastIndex);

  const sepSecondLastIndex = strPartsExceptLast.lastIndexOf(separator);
  if (sepSecondLastIndex < 0) return str;

  const strPartsNumLength = strPartsExceptLast.slice(sepSecondLastIndex + 1);
  const numLength = parseInt(strPartsNumLength);
  const num = parseInt(strPartsLast);
  if (!isNaN(numLength) && !isNaN(num) && numLength === num.toFixed(0).length) {
    const strPart1 = str.slice(0, sepSecondLastIndex + 1);
    const strPart2 = strPartsLast;
    return strPart1 + strPart2;
  }
  return str;
}

// A key encoder that convert string to bytes, and optionally
// also takes a num suffix and turns that to bytes directly without interpreting
// it as string. Useful to keep numerical sort rather than lexical for numbers.
// WARN: We don't use this currently since SQLite won't support more involved 
// ops like LIKE on binary data. It only works on string. Otherwise, this should
// a faster method.
export function lexByteEncode(str: string, numSuffix?: number): Uint8Array {
  const strBuf = new TextEncoder().encode(str);
  const a = new ArrayBuffer(strBuf.byteLength + (numSuffix != null ? 9 : 1));
  new Uint8Array(a).set(strBuf);
  const v = new DataView(a);
  if (numSuffix != null) {
    v.setBigInt64(strBuf.byteLength, BigInt(numSuffix));
    v.setUint8(strBuf.byteLength + 8, 1);
  } else {
    v.setUint8(strBuf.byteLength, 0);
  }
  return new Uint8Array(a);
}

export function lexByteDecode(data: Uint8Array): string {
  const v = new DataView(data.buffer);
  const hasNum = v.getUint8(v.byteLength - 1);
  if (hasNum) {
    const num = v.getBigInt64(data.byteLength - 9);
    const strBuf = new ArrayBuffer(data.byteLength - 9);
    new Uint8Array(strBuf).set(data.slice(0, -9));
    const s = new TextDecoder().decode(strBuf);
    return s + num;
  }
  return new TextDecoder().decode(data);
}
