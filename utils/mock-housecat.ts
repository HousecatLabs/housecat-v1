import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  DepositAdapter,
  HousecatFactory,
  HousecatManagement,
  IUniswapV2Router02,
  ManageAssetsAdapter,
  WithdrawAdapter,
} from '../typechain-types'
import {
  deployDepositAdapter,
  deployHousecat,
  deployManageAssetsAdapter,
  deployWithdrawAdapter,
} from './deploy-contracts'
import { IWeth, ITokenWithPriceFeed, mockAssets, IToken } from './mock-defi'

interface IMockHousecatProps {
  signer: SignerWithAddress
  weth: IWeth
  assets: IToken[]
  treasury?: string
}

export interface IMockHousecat {
  management: HousecatManagement
  factory: HousecatFactory
  amm: IUniswapV2Router02
  weth: ITokenWithPriceFeed
  assets: ITokenWithPriceFeed[]
  manageAssetsAdapter: ManageAssetsAdapter
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
  const manageAssetsAdapter = await deployManageAssetsAdapter(signer)
  const depositAdapter = await deployDepositAdapter(signer)
  const withdrawAdapter = await deployWithdrawAdapter(signer)
  const [management, factory] = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    assets: assetAddresses,
    assetsMeta,
    manageAssetsAdapter: manageAssetsAdapter.address,
    depositAdapter: depositAdapter.address,
    withdrawAdapter: withdrawAdapter.address,
    integrations: [amm.address],
  })
  return {
    management,
    factory,
    amm,
    weth: _weth,
    assets: _assets,
    manageAssetsAdapter,
    depositAdapter,
    withdrawAdapter,
  }
}
