interface IAsset {
  addr: string
  priceFeed: string
  decimals: number
  delisted?: boolean
}

export const uniswapV2Routers = {
  sushiswap: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  quickswap: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
}

export const paraswapV5 = {
  AugustusSwapper: '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57',
}

export const priceFeeds = {
  '1inch': '0x443C5116CdF663Eb387e72C688D276e702135C87',
  aave: '0x72484B12719E23115761D5DA1646945632979bB6',
  ageur: '0x9b88d07B2354eF5f4579690356818e07371c7BeD',
  alcx: '0x5DB6e61B6159B20F068dc15A47dF2E5931b14f29',
  bal: '0xD106B538F2A868c28Ca1Ec7E298C3325E0251d66',
  bat: '0x2346Ce62bd732c62618944E51cbFa09D985d86D2',
  cel: '0xc9ECF45956f576681bDc01F79602A79bC2667B0c',
  comp: '0x2A8758b7257102461BC958279054e372C2b1bDE6',
  crv: '0x336584C8E6Dc19637A5b36206B1c79923111b405',
  dai: '0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D',
  dodo: '0x59161117086a4C7A9beDA16C66e40Bdaa1C5a8B6',
  eth: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
  frax: '0x00DBeB1e45485d53DF7C2F0dF1Aa0b6Dc30311d3',
  fxs: '0x6C0fe985D3cAcbCdE428b84fc9431792694d0f51',
  ghst: '0xDD229Ce42f11D8Ee7fFf29bDB71C7b81352e11be',
  grt: '0x3FabBfb300B1e2D7c9B84512fe9D30aeDF24C410',
  knc: '0x10e5f3DFc81B3e5Ef4e648C4454D04e79E1E41E2',
  link: '0xd9FFdb71EbE7496cC440152d43986Aae0AB76665',
  mai: '0xd8d483d813547CfB624b8Dc33a00F2fcbCd2D428',
  mana: '0xA1CbF3Fe43BC3501e3Fc4b573e822c70e76A7512',
  matic: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
  nexo: '0x666bb13b3ED3816504E8c30D0F9B9C16b371774b',
  ocean: '0xdcda79097C44353Dee65684328793695bd34A629',
  pla: '0x24C0e0FC8cCb21e2fb3e1A8A4eC4b29458664f79',
  quick: '0xa058689f4bCa95208bba3F265674AE95dED75B6D',
  rai: '0x7f45273fD7C644714825345670414Ea649b50b16',
  sand: '0x3D49406EDd4D52Fb7FFd25485f32E073b529C924',
  snx: '0xbF90A5D9B6EE9019028dbFc2a9E50056d5252894',
  sol: '0x10C8264C0935b3B9870013e057f330Ff3e9C56dC',
  sushi: '0x49B0c695039243BBfEb8EcD054EB70061fd54aa0',
  tusd: '0x7C5D415B64312D38c56B54358449d0a4058339d2',
  uma: '0x33D9B1BAaDcF4b26ab6F8E83e9cb8a611B2B3956',
  uni: '0xdf0Fb4e4F928d2dCB76f438575fDD8682386e13C',
  usdc: '0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7',
  usdt: '0x0A6513e40db6EB1b165753AD52E80663aeA50545',
  wbtc: '0xDE31F8bFBD8c84b5360CFACCa3539B938dd78ae6',
  woo: '0x6a99EC84819FB7007dd5D032068742604E755c56',
  xlm: '0x692AE5510cA9070095A496dbcFBCDA99D4024Cd9',
  yfi: '0x9d3A43c111E7b2C6601705D9fcF7a70c95b1dc55',
}

export const assets: { [key: string]: IAsset } = {
  /*
  '1inch': {
    addr: '0x9c2C5fd7b07E95EE044DDeba0E97a665F142394f',
    priceFeed: priceFeeds['1inch'],
    decimals: 18,
  },
  */
  aave: {
    addr: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
    priceFeed: priceFeeds.aave,
    decimals: 18,
  },
  /*
  ageur: {
    addr: '0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4',
    priceFeed: priceFeeds.ageur,
    decimals: 18,
  },
  */
  /*
  alcx: {
    addr: '0x95c300e7740D2A88a44124B424bFC1cB2F9c3b89',
    priceFeed: priceFeeds.alcx,
    decimals: 18,
  },
  */
  bal: {
    addr: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
    priceFeed: priceFeeds.bal,
    decimals: 18,
  },
  /*
  bat: {
    addr: '0x3cef98bb43d732e2f285ee605a8158cde967d219',
    priceFeed: priceFeeds.bat,
    decimals: 18,
  },
  */
  cel: {
    addr: '0xd85d1e945766fea5eda9103f918bd915fbca63e6',
    priceFeed: priceFeeds.cel,
    decimals: 4,
    delisted: true,
  },
  /*
  comp: {
    addr: '0x8505b9d2254a7ae468c0e9dd10ccea3a837aef5c',
    priceFeed: priceFeeds.comp,
    decimals: 18,
  },
  */
  crv: {
    addr: '0x172370d5cd63279efa6d502dab29171933a610af',
    priceFeed: priceFeeds.crv,
    decimals: 18,
  },
  dai: {
    addr: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    decimals: 18,
    priceFeed: priceFeeds.dai,
  },
  /*
  dodo: {
    addr: '0xe4bf2864ebec7b7fdf6eeca9bacae7cdfdaffe78',
    decimals: 18,
    priceFeed: priceFeeds.dodo,
  },
  */
  /*
   frax: {
     addr: '0x45c32fa6df82ead1e2ef74d17b76547eddfaff89',
     priceFeed: priceFeeds.frax,
     decimals: 18,
   },
   */
  /*
  fxs: {
    addr: '0x1a3acf6d19267e2d3e7f898f42803e90c9219062',
    priceFeed: priceFeeds.fxs,
    decimals: 18,
  },
  */
  ghst: {
    addr: '0x385eeac5cb85a38a9a07a70c73e0a3271cfb54a7',
    priceFeed: priceFeeds.ghst,
    decimals: 18,
  },
  /*
  grt: {
    addr: '0x5fe2b58c013d7601147dcdd68c143a77499f5531',
    priceFeed: priceFeeds.grt,
    decimals: 18,
  },
  */
  /*
  knc: {
    addr: '0x1C954E8fe737F99f68Fa1CCda3e51ebDB291948C',
    priceFeed: priceFeeds.knc,
    decimals: 18,
  },
  */
  link: {
    addr: '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
    priceFeed: priceFeeds.link,
    decimals: 18,
  },
  mai: {
    addr: '0xa3Fa99A148fA48D14Ed51d610c367C61876997F1',
    priceFeed: priceFeeds.mai,
    decimals: 18,
  },
  /*
  mana: {
    addr: '0xa1c57f48f0deb89f569dfbe6e2b7f46d33606fd4',
    priceFeed: priceFeeds.mana,
    decimals: 18,
  },
  */
  /*
   nexo: {
     addr: '0x41b3966B4FF7b427969ddf5da3627d6AEAE9a48E',
     priceFeed: priceFeeds.nexo,
     decimals: 18,
   },
   */
  /*
  ocean: {
    addr: '0x282d8efCe846A88B159800bd4130ad77443Fa1A1',
    priceFeed: priceFeeds.ocean,
    decimals: 18,
  },
  */
  /*
   pla: {
     addr: '0x8765f05ADce126d70bcdF1b0a48Db573316662eB',
     decimals: 18,
     priceFeed: priceFeeds.pla,
   },
   */
  quick: {
    addr: '0x831753dd7087cac61ab5644b308642cc1c33dc13',
    priceFeed: priceFeeds.quick,
    decimals: 18,
  },
  /*
  rai: {
    addr: '0x00e5646f60AC6Fb446f621d146B6E1886f002905',
    priceFeed: priceFeeds.rai,
    decimals: 18,
  },
  */
  sand: {
    addr: '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683',
    priceFeed: priceFeeds.sand,
    decimals: 18,
  },
  /*
  snx: {
    addr: '0x50b728d8d964fd00c2d0aad81718b71311fef68a',
    priceFeed: priceFeeds.snx,
    decimals: 18,
  },
  */
  /*
   sol: {
     addr: '0xd93f7e271cb87c23aaa73edc008a79646d1f9912',
     decimals: 9,
     priceFeed: priceFeeds.sol,
   },
   */
  sushi: {
    addr: '0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a',
    priceFeed: priceFeeds.sushi,
    decimals: 18,
  },
  tusd: {
    addr: '0x2e1AD108fF1D8C782fcBbB89AAd783aC49586756',
    priceFeed: priceFeeds.tusd,
    decimals: 18,
  },
  /*
  uma: {
    addr: '0x3066818837c5e6ed6601bd5a91b0762877a6b731',
    priceFeed: priceFeeds.uma,
    decimals: 18,
  },
  */
  uni: {
    addr: '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
    priceFeed: priceFeeds.uni,
    decimals: 18,
  },
  usdc: {
    addr: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    priceFeed: priceFeeds.usdc,
    decimals: 6,
  },
  usdt: {
    addr: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    priceFeed: priceFeeds.usdt,
    decimals: 6,
  },
  wbtc: {
    addr: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    priceFeed: priceFeeds.wbtc,
    decimals: 8,
  },
  weth: {
    addr: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    priceFeed: priceFeeds.eth,
    decimals: 18,
  },
  wmatic: {
    addr: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    priceFeed: priceFeeds.matic,
    decimals: 18,
  },
  /*
  woo: {
    addr: '0x1B815d120B3eF02039Ee11dC2d33DE7aA4a8C603',
    priceFeed: priceFeeds.woo,
    decimals: 18,
  },
  */
  /*
  wxlm: {
    addr: '0xf854225caaef5a722884a68a23215dfa5386751e',
    priceFeed: priceFeeds.xlm,
    decimals: 18,
  },
  */
  /*
   yfi: {
     addr: '0xda537104d6a5edd53c6fbba9a898708e465260b6',
     priceFeed: priceFeeds.yfi,
     decimals: 18,
   },
   */
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
  paraswapV5,
}
