export const uniswapV2Routers = {
  sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
}

export const priceFeeds = {
  matic: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  dai: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
  wbtc: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
}

export const assets = {
  wmatic: {
    addr: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    decimals: 18,
    priceFeed: priceFeeds.matic,
  },
  dai: {
    addr: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    decimals: 18,
    priceFeed: priceFeeds.dai,
  },
  wbtc: {
    addr: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    decimals: 8,
    priceFeed: priceFeeds.wbtc,
  },
}

export const aaveV2LendingPools = {
  aave: '0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf',
}

export const aaveV2Tokens = {
  wmatic: {
    aToken: '0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4',
    stable: '0xb9A6E29fB540C5F1243ef643EB39b0AcbC2e68E3',
    variable: '0x59e8E9100cbfCBCBAdf86b9279fa61526bBB8765',
    decimals: 18,
  },
  wbtc: {
    aToken: '0x5c2ed810328349100A66B82b78a1791B101C9D61',
    stable: '0x2551B15dB740dB8348bFaDFe06830210eC2c2F13',
    variable: '0xF664F50631A6f0D72ecdaa0e49b0c019Fa72a8dC',
    decimals: 8,
  },
}

export default {
  uniswapV2Routers,
  assets,
  priceFeeds,
  aaveV2LendingPools,
  aaveV2Tokens,
}
