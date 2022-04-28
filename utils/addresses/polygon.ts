export const uniswapV2Routers = {
  sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
}

export const priceFeeds = {
  matic: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  dai: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
  eth: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  usdc: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
  wbtc: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
  usdt: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
  fxs: '0x6C0fe985D3cAcbCdE428b84fc9431792694d0f51',
  aave: '0x72484B12719E23115761D5DA1646945632979bB6',
  link: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
  sushi: '0x49B0c695039243BBfEb8EcD054EB70061fd54aa0',
  crv: '0x336584C8E6Dc19637A5b36206B1c79923111b405',
  uni: '0xdf0Fb4e4F928d2dCB76f438575fDD8682386e13C',
  sand: '0x3D49406EDd4D52Fb7FFd25485f32E073b529C924',
  mana: '0xA1CbF3Fe43BC3501e3Fc4b573e822c70e76A7512',
  bat: '0x2346Ce62bd732c62618944E51cbFa09D985d86D2',
  frax: '0x00DBeB1e45485d53DF7C2F0dF1Aa0b6Dc30311d3',
  cel: '0xc9ECF45956f576681bDc01F79602A79bC2667B0c',
  comp: '0x2A8758b7257102461BC958279054e372C2b1bDE6',
  grt: '0x3FabBfb300B1e2D7c9B84512fe9D30aeDF24C410',
  snx: '0xbF90A5D9B6EE9019028dbFc2a9E50056d5252894',
  yfi: '0x9d3A43c111E7b2C6601705D9fcF7a70c95b1dc55',
  uma: '0x33D9B1BAaDcF4b26ab6F8E83e9cb8a611B2B3956',
  bal: '0xD106B538F2A868c28Ca1Ec7E298C3325E0251d66',
  ghst: '0xDD229Ce42f11D8Ee7fFf29bDB71C7b81352e11be',
  quick: '0xa058689f4bCa95208bba3F265674AE95dED75B6D',
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
  weth: {
    addr: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    priceFeed: priceFeeds.eth,
    decimals: 18,
  },
  usdc: {
    addr: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    priceFeed: priceFeeds.usdc,
    decimals: 6,
  },
  wbtc: {
    addr: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    priceFeed: priceFeeds.wbtc,
    decimals: 8,
  },
  usdt: {
    addr: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    priceFeed: priceFeeds.usdt,
    decimals: 6,
  },
  fxs: {
    addr: '0x1a3acf6d19267e2d3e7f898f42803e90c9219062',
    priceFeed: priceFeeds.fxs,
    decimals: 18,
  },
  aave: {
    addr: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
    priceFeed: priceFeeds.aave,
    decimals: 18,
  },
  link: {
    addr: '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
    priceFeed: priceFeeds.link,
    decimals: 18,
  },
  sushi: {
    addr: '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a',
    priceFeed: priceFeeds.sushi,
    decimals: 18,
  },
  crv: {
    addr: '0x172370d5cd63279efa6d502dab29171933a610af',
    priceFeed: priceFeeds.crv,
    decimals: 18,
  },
  uni: {
    addr: '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
    priceFeed: priceFeeds.uni,
    decimals: 18,
  },
  sand: {
    addr: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683',
    priceFeed: priceFeeds.sand,
    decimals: 18,
  },
  mana: {
    addr: '0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4',
    priceFeed: priceFeeds.mana,
    decimals: 18,
  },
  bat: {
    addr: '0x3cef98bb43d732e2f285ee605a8158cde967d219',
    priceFeed: priceFeeds.bat,
    decimals: 18,
  },
  frax: {
    addr: '0x45c32fa6df82ead1e2ef74d17b76547eddfaff89',
    priceFeed: priceFeeds.frax,
    decimals: 18,
  },
  cel: {
    addr: '0xd85d1e945766fea5eda9103f918bd915fbca63e6',
    priceFeed: priceFeeds.cel,
    decimals: 4,
  },
  comp: {
    addr: '0x8505b9d2254a7ae468c0e9dd10ccea3a837aef5c',
    priceFeed: priceFeeds.comp,
    decimals: 18,
  },
  grt: {
    addr: '0x5fe2b58c013d7601147dcdd68c143a77499f5531',
    priceFeed: priceFeeds.grt,
    decimals: 18,
  },
  snx: {
    addr: '0x50b728d8d964fd00c2d0aad81718b71311fef68a',
    priceFeed: priceFeeds.snx,
    decimals: 18,
  },
  yfi: {
    addr: '0xda537104d6a5edd53c6fbba9a898708e465260b6',
    priceFeed: priceFeeds.yfi,
    decimals: 18,
  },
  uma: {
    addr: '0x3066818837c5e6ed6601bd5a91b0762877a6b731',
    priceFeed: priceFeeds.uma,
    decimals: 18,
  },
  bal: {
    addr: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
    priceFeed: priceFeeds.bal,
    decimals: 18,
  },
  ghst: {
    addr: '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7',
    priceFeed: priceFeeds.ghst,
    decimals: 18,
  },
  quick: {
    addr: '0x831753dd7087cac61ab5644b308642cc1c33dc13',
    priceFeed: priceFeeds.quick,
    decimals: 18,
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
