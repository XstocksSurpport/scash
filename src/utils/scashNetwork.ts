import * as bitcoin from 'bitcoinjs-lib'

// Official SCASH wallet (wallet.scash.network) uses Bitcoin BIP84 coin type 0.
export const SCASH_DERIVATION_PATH = "m/84'/0'/0'/0/0"

export const SCASH_DERIVATION_PATHS = [
  SCASH_DERIVATION_PATH,
  "m/84'/0'/0'/0/1",
  "m/84'/0'/0'/0/2",
  "m/84'/0'/0'/0/3",
  "m/84'/0'/0'/0/4",
]

export const SCASH_NETWORK: bitcoin.networks.Network = {
  messagePrefix: '\x18Scash Signed Message:\n',
  bech32: 'scash',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
}
