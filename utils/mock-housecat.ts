import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  DepositAdapter,
  HousecatFactory,
  HousecatManagement,
  IUniswapV2Router02,
  ManagePositionsAdapter,
  WithdrawAdapter,
} from '../typechain-types'
import { deployHousecat } from './deploy-contracts'
import { ITokenWithPriceFeed, mockAssets, IToken, ITokenWithLiquidity } from './mock-defi'

interface IMockHousecatProps {
  signer: SignerWithAddress
  weth: IToken
  assets: ITokenWithLiquidity[]
  treasury?: string
}

export interface IMockHousecat {
  mgmt: HousecatManagement
  factory: HousecatFactory
  amm: IUniswapV2Router02
  weth: ITokenWithPriceFeed
  assets: ITokenWithPriceFeed[]
  managePositionsAdapter: ManagePositionsAdapter
  depositAdapter: DepositAdapter
  withdrawAdapter: WithdrawAdapter
}

export const mockHousecat = async ({ signer, treasury, weth, assets }: IMockHousecatProps): Promise<IMockHousecat> => {
  const [amm, _weth, _assets] = await mockAssets({
    signer,
    weth,
    tokens: assets,
  })
  const assetAddresses = [_weth.token.address, ..._assets.map((x) => x.token.address)]
  const assetsMeta = [
    { priceFeed: _weth.priceFeed.address, decimals: await _weth.token.decimals() },
    ...(await Promise.all(
      _assets.map(async (a) => ({
        priceFeed: a.priceFeed.address,
        decimals: await a.token.decimals(),
      }))
    )),
  ]
  const { mgmt, factory, managePositionsAdapter, depositAdapter, withdrawAdapter } = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    assets: assetAddresses,
    assetsMeta,
    integrations: [amm.address],
  })
  return {
    mgmt,
    factory,
    amm,
    weth: _weth,
    assets: _assets,
    managePositionsAdapter,
    depositAdapter,
    withdrawAdapter,
  }
}
