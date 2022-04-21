import {
  DepositAdapter,
  HousecatFactory,
  HousecatManagement,
  IUniswapV2Router02,
  ManageAssetsAdapter,
  WithdrawAdapter,
} from '../typechain-types'
import { deployDepositAdapter, deployHousecat, deployManageAssetsAdapter, deployWithdrawAdapter } from './deploy-contracts'
import { IAmmWithMockTokens, ITokenWithPriceFeed, mockAssets } from './mock-defi'

interface IMockHousecatProps extends IAmmWithMockTokens {
  treasury?: string
}

export interface IMockHousecat {
  management: HousecatManagement
  factory: HousecatFactory
  amm: IUniswapV2Router02
  weth: ITokenWithPriceFeed
  tokens: ITokenWithPriceFeed[]
  manageAssetsAdapter: ManageAssetsAdapter
  depositAdapter: DepositAdapter
  withdrawAdapter: WithdrawAdapter
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
  const manageAssetsAdapter = await deployManageAssetsAdapter(signer)
  const depositAdapter = await deployDepositAdapter(signer)
  const withdrawAdapter = await deployWithdrawAdapter(signer)
  const [management, factory] = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    tokens: tokenAddresses,
    tokensMeta,
    manageAssetsAdapter: manageAssetsAdapter.address,
    depositAdapter: depositAdapter.address,
    withdrawAdapter: withdrawAdapter.address,
    integrations: [amm.address],
  })
  return { management, factory, amm, weth: _weth, tokens: _tokens, manageAssetsAdapter, depositAdapter, withdrawAdapter }
}
