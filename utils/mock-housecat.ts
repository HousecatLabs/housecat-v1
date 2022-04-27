import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { HousecatFactory, HousecatManagement, IUniswapV2Router02 } from '../typechain-types'
import { deployHousecat, IAdapters } from './deploy-contracts'
import { ITokenWithPriceFeed, mockAssets, IToken, ITokenWithLiquidity, mockLoans } from './mock-defi'

interface IMockHousecatProps {
  signer: SignerWithAddress
  weth: IToken
  assets: ITokenWithLiquidity[]
  loans: IToken[]
  treasury?: string
}

export interface IMockHousecat {
  mgmt: HousecatManagement
  factory: HousecatFactory
  amm: IUniswapV2Router02
  weth: ITokenWithPriceFeed
  assets: ITokenWithPriceFeed[]
  loans: ITokenWithPriceFeed[]
  adapters: IAdapters
}

export const mockHousecat = async ({ signer, treasury, weth, assets, loans }: IMockHousecatProps): Promise<IMockHousecat> => {
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

  const _loans = await mockLoans({ signer, tokens: loans })
  const loanAddresses = _loans.map(x => x.token.address)
  const loansMeta = await Promise.all(
    _loans.map(async (l) => ({
      priceFeed: l.priceFeed.address,
      decimals: await l.token.decimals(),
    }))
  )

  const { mgmt, factory, adapters } = await deployHousecat({
    signer,
    treasury: treasury || signer.address,
    weth: _weth.token.address,
    assets: assetAddresses,
    assetsMeta,
    loans: loanAddresses,
    loansMeta,
    integrations: [amm.address],
  })
  return {
    mgmt,
    factory,
    amm,
    weth: _weth,
    assets: _assets,
    loans: _loans,
    adapters,
  }
}
