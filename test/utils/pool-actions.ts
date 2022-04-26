import { HousecatPool, IUniswapV2Router02 } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { ITokenWithPriceFeed } from '../../utils/mock-defi'
import { IAdapters } from '../../utils/deploy-contracts'

export const swapWethToTokens = async (
  pool: HousecatPool,
  manager: SignerWithAddress,
  adapters: IAdapters,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  tokens: ITokenWithPriceFeed[],
  amountsWeth: BigNumber[]
) => {
  const buyTokenTxs = tokens.map((token, idx) => ({
    adapter: adapters.uniswapV2Adapter.address,
    data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
      amm.address,
      [weth.token.address, token.token.address],
      amountsWeth[idx],
      1,
    ]),
  }))
  return pool.connect(manager).managePositions(buyTokenTxs)
}

export const deposit = async (
  pool: HousecatPool,
  mirrorer: SignerWithAddress,
  adapters: IAdapters,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  tokens: ITokenWithPriceFeed[],
  amountDeposit: BigNumber
) => {
  const [weights] = await pool.getAssetWeights()
  const [, ...tokenWeights] = weights
  const percent100 = await pool.getPercent100()
  const buyTokenTxs = tokens.map((token, idx) => ({
    adapter: adapters.uniswapV2Adapter.address,
    data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapWETHToToken', [
      amm.address,
      [weth.token.address, token.token.address],
      amountDeposit.mul(tokenWeights[idx]).div(percent100),
      1,
    ]),
  }))
  return pool.connect(mirrorer).deposit(buyTokenTxs, { value: amountDeposit })
}

export const withdraw = async (
  pool: HousecatPool,
  withdrawer: SignerWithAddress,
  adapters: IAdapters,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  tokens: ITokenWithPriceFeed[],
  amountWithdraw: BigNumber
) => {
  const poolValue = await pool.getAssetValue()
  const percent100 = await pool.getPercent100()
  const withdrawPercentage = amountWithdraw.mul(percent100).div(poolValue)
  const balances = await pool.getAssetBalances()
  const sellTokenTxs = [weth, ...tokens].map((token, idx) => ({
    adapter: adapters.uniswapV2Adapter.address,
    data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
      amm.address,
      [token.token.address, weth.token.address],
      balances[idx].mul(withdrawPercentage).div(percent100),
      1,
    ]),
  }))
  return pool.connect(withdrawer).withdraw(sellTokenTxs)
}
