import { HousecatFactory, HousecatManagement, IUniswapV2Router02, ManagerUniswapV2Adapter } from '../typechain-types'
import { deployHousecat, deployUniswapV2Adapter } from './deploy-contracts'
import { IAmmWithMockTokens, ITokenWithPriceFeed, mockAssets } from './mock-defi'

interface IMockHousecatProps extends IAmmWithMockTokens {
  treasury?: string
}

interface IManagerAdapters {
  uniswapV2: ManagerUniswapV2Adapter
}

interface IWithdrawerAdapters {}

export interface IMockHousecat {
  management: HousecatManagement
  factory: HousecatFactory
  amm: IUniswapV2Router02
  weth: ITokenWithPriceFeed
  tokens: ITokenWithPriceFeed[]
  managerAdapters: IManagerAdapters
  withdrawerAdapters: IWithdrawerAdapters
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
  const managerAdapters = {
    uniswapV2: await deployUniswapV2Adapter(signer),
  }
  const withdrawerAdapters = {}
  const [management, factory] = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    tokens: tokenAddresses,
    tokensMeta,
    managerAdapters: [managerAdapters.uniswapV2.address],
    withdrawerAdapters: [],
    integrations: [amm.address],
  })
  return { management, factory, amm, weth: _weth, tokens: _tokens, managerAdapters, withdrawerAdapters }
}
