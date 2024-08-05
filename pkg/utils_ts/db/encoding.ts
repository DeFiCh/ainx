import SnappyJs from "npm:snappyjs";
import { decode, encode } from "npm:@msgpack/msgpack";

export interface ProcessOptions {
  compress: boolean;
  encode: boolean;
}

export async function snappyMsgPackInputProcessor(
  val: unknown,
  options?: ProcessOptions,
) {
  const opts = options || { compress: true, encode: true };
  const skip = !(opts.compress || opts.encode) || val === undefined;
  if (skip) {
    return val;
  }
  let v: any = val;
  if (opts.encode) {
    v = encode(v);
  }
  if (opts.compress) {
    v = await SnappyJs.compress(v);
  }
  return v;
}

export async function snappyMsgPackOutputProcessor(
  val: unknown,
  options?: ProcessOptions,
) {
  const opts = options || { compress: true, encode: true };
  const skip = !(opts.compress || opts.encode) || val === undefined;
  if (skip) {
    return val;
  }
  let v: any = val;
  if (opts.compress) {
    v = await SnappyJs.uncompress(v);
  }
  if (opts.encode) {
    v = decode(v);
  }
  return v;
}
