export function isValidScashAddress(addr: string): boolean {
  return /^scash1[a-z0-9]{20,}$/.test(addr)
}

export function isValidEvmAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr)
}
