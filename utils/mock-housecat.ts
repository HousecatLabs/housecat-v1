import { HousecatFactory, HousecatManagement, IUniswapV2Router02 } from "../typechain-types"
import { deployHousecat } from "./deploy-contracts"
import { IAmmWithMockTokens, ITokenWithPriceFeed, mockAssets } from "./mock-defi"


interface IMockHousecat extends IAmmWithMockTokens {
  treasury?: string
}

export const mockHousecat = async ({
  signer,
  treasury,
  weth,
  tokens,
}: IMockHousecat): Promise<[HousecatManagement, HousecatFactory, IUniswapV2Router02, ITokenWithPriceFeed, ITokenWithPriceFeed[]]> => {
  const [amm, _weth, _tokens] = await mockAssets({
    signer,
    weth,
    tokens
  })
  const tokenAddresses = [_weth.token.address, ..._tokens.map(x => x.token.address)]
  const tokensMeta = [
    { priceFeed: _weth.priceFeed.address, decimals: await _weth.token.decimals() },
    ...await Promise.all(_tokens.map(async t => ({
      priceFeed: t.priceFeed.address,
      decimals: await t.token.decimals()
    })))
  ]
  const [management, factory] = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    tokens: tokenAddresses,
    tokensMeta
  })
  return [management, factory, amm, _weth, _tokens]
}