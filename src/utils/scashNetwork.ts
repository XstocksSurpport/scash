import * as bitcoin from 'bitcoinjs-lib'

export const SCASH_COIN_TYPE = 805

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

export const SCASH_DERIVATION_PATHS = [
  `m/84'/${SCASH_COIN_TYPE}'/0'/0/0`,
  "m/84'/0'/0'/0/0",
  `m/44'/${SCASH_COIN_TYPE}'/0'/0/0`,
  "m/44'/0'/0'/0/0",
]
