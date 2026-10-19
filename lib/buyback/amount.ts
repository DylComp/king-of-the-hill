export function rawLamports(value: unknown): bigint {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(value) || BigInt(value) > 18446744073709551615n) throw Error("Invalid lamport amount");
  return BigInt(value);
}
