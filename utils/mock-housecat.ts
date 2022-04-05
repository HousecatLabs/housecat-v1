import { HousecatFactory, HousecatManagement, IUniswapV2Router02, UniswapV2Integration } from '../typechain-types'
import { deployHousecat, deployUniswapV2Integration } from './deploy-contracts'
import { IAmmWithMockTokens, ITokenWithPriceFeed, mockAssets } from './mock-defi'

interface IMockHousecatProps extends IAmmWithMockTokens {
  treasury?: string
}

interface IIntegrations {
  uniswapV2: UniswapV2Integration
}

export interface IMockHousecat {
  management: HousecatManagement
  factory: HousecatFactory
  amm: IUniswapV2Router02
  weth: ITokenWithPriceFeed
  tokens: ITokenWithPriceFeed[]
  integrations: IIntegrations
}

export const mockHousecat = async ({ signer, treasury, weth, tokens }: IMockHousecatProps): Promise<IMockHousecat> => {
  const [amm, _weth, _tokens] = await mockAssets({
    signer,
    weth,
    tokens,
  })
  const tokenAddresses = [_weth.token.address, ..._tokens.map((x) => x.token.address)]
  const tokensMeta = [
    { priceFeed: _weth.priceFeed.address, decimals: await _weth.token.decimals() },
    ...(await Promise.all(
      _tokens.map(async (t) => ({
        priceFeed: t.priceFeed.address,
        decimals: await t.token.decimals(),
      }))
    )),
  ]
  const integrations = {
    uniswapV2: await deployUniswapV2Integration(signer),
  }
  const [management, factory] = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    tokens: tokenAddresses,
    tokensMeta,
    integrations: [integrations.uniswapV2.address],
  })
  return { management, factory, amm, weth: _weth, tokens: _tokens, integrations }
}
