import { ethers } from 'hardhat'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../utils/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, BigNumberish } from 'ethers'
import { HousecatPool, IUniswapV2Router02, UniswapV2Adapter } from '../../typechain-types'
import { ITokenWithPriceFeed } from '../../utils/mock-defi'
import { IAdapters } from '../../utils/deploy-contracts'
import { expect } from 'chai'
import { PoolTransactionStruct } from '../../typechain-types/HousecatFactory'

const getTrade = async (
  tokenIn: string,
  tokenOut: string,
  amm: IUniswapV2Router02,
  amountIn: BigNumber,
  adapter: UniswapV2Adapter
): Promise<{ tx: PoolTransactionStruct; amountOut: BigNumber }> => {
  const path = [tokenIn, tokenOut]
  const amountsOut = await amm.getAmountsOut(amountIn, path)
  const amountOut = amountsOut[amountsOut.length - 1]
  const tx = {
    adapter: adapter.address,
    data: adapter.interface.encodeFunctionData('swapTokens', [amm.address, path, amountIn, amountOut.mul(99).div(100)]),
  }
  return { tx, amountOut }
}

const getRebalanceTxs = async (
  pool: HousecatPool,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  assets: ITokenWithPriceFeed[],
  adapter: UniswapV2Adapter,
  amountDeposit: BigNumberish
): Promise<PoolTransactionStruct[]> => {
  // TODO: optimize trade and gas fees by executing only the required swaps

  // swap all assets to weth
  const poolContent = await pool.getPoolContent()
  const sellTrades = (
    await Promise.all(
      [weth, ...assets].map(async (asset, idx) => {
        const amountIn = poolContent.assetBalances[idx]
        if (idx === 0 || amountIn.eq(0)) {
          return null
        }
        return getTrade(asset.token.address, weth.token.address, amm, amountIn, adapter)
      })
    )
  ).filter((x) => x !== null)

  const amountWethBought = sellTrades.reduce((total, x) => total.add(x?.amountOut as BigNumber), BigNumber.from(0))
  const totalAmountWeth = (await weth.token.balanceOf(pool.address)).add(amountWethBought).add(amountDeposit)

  // spend purchased weth to target assets
  const mirroredContent = await pool.getMirroredContent()
  const percent100 = await pool.getPercent100()
  const buyTrades = await Promise.all(
    [weth, ...assets]
      .map((asset, idx) => {
        const targetWeight = mirroredContent.assetWeights[idx]
        const amountIn = totalAmountWeth.mul(targetWeight).div(percent100)
        if (idx === 0 || amountIn.eq(0)) {
          return null
        }
        return getTrade(weth.token.address, asset.token.address, amm, amountIn, adapter)
      })
      .filter((x) => x !== null)
  )
  return [...sellTrades.map((x) => x!.tx), ...buyTrades.map((x) => x!.tx)]
}

export const deposit = async (
  pool: HousecatPool,
  mirrorer: SignerWithAddress,
  adapters: IAdapters,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  assets: ITokenWithPriceFeed[],
  amountDeposit: BigNumber
) => {
  const buyWethTx = {
    adapter: adapters.wethAdapter.address,
    data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
  }
  const rebalanceTxs = await getRebalanceTxs(pool, amm, weth, assets, adapters.uniswapV2Adapter, amountDeposit)
  return pool.connect(mirrorer).deposit(mirrorer.address, [buyWethTx, ...rebalanceTxs], { value: amountDeposit })
}

export const rebalance = async (
  pool: HousecatPool,
  owner: SignerWithAddress,
  adapters: IAdapters,
  amm: IUniswapV2Router02,
  weth: ITokenWithPriceFeed,
  assets: ITokenWithPriceFeed[]
) => {
  const transactions = await getRebalanceTxs(pool, amm, weth, assets, adapters.uniswapV2Adapter, 0)
  return pool.connect(owner).rebalance(owner.address, transactions)
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
  const figures = await pool.getPoolContent()
  const percent100 = await pool.getPercent100()
  const withdrawPercentage = amountWithdraw.mul(percent100).div(figures.assetValue)
  const sellTokenTxs = [weth, ...tokens].map((token, idx) => ({
    adapter: adapters.uniswapV2Adapter.address,
    data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokenToETH', [
      amm.address,
      [token.token.address, weth.token.address],
      figures.assetBalances[idx].mul(withdrawPercentage).div(percent100),
      1,
    ]),
  }))
  return pool.connect(withdrawer).withdraw(withdrawer.address, sellTokenTxs)
}

describe('integration: deposit-rebalance-withdraw', () => {
  let owner: SignerWithAddress
  let treasury: SignerWithAddress
  let mirrored: SignerWithAddress
  let mirrorer1: SignerWithAddress
  let mirrorer2: SignerWithAddress
  let mock: IMockHousecatAndPool

  before(async () => {
    ;[owner, treasury, mirrorer1, mirrorer2, mirrored] = await ethers.getSigners()
    mock = await mockHousecatAndPool({
      signer: owner,
      treasury,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [
        { price: '1', reserveToken: '10000', reserveWeth: '10000' },
        { price: '2', reserveToken: '5000', reserveWeth: '10000' },
        { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
      ],
    })
  })

  describe('initial deposit of 10 ETH by mirrorer1', () => {
    before(async () => {
      const { pool, adapters } = mock
      const buyWethTx = {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [parseEther('10')]),
      }
      await pool.connect(mirrorer1).deposit(mirrorer1.address, [buyWethTx], { value: parseEther('10') })
    })

    it('mirrorer1 pool token balance should equal the deposit value', async () => {
      expect(await mock.pool.balanceOf(mirrorer1.address)).equal(parseEther('10'))
    })

    it('pool value should increase by the value of the deposit', async () => {
      const value = (await mock.pool.getPoolContent()).assetValue
      expect(value).equal(parseEther('10'))
    })

    it('pool total supply should equal the holdings of mirrorer1', async () => {
      expect(await mock.pool.totalSupply()).equal(await mock.pool.balanceOf(mirrorer1.address))
    })

    it('pool should hold 100% WETH', async () => {
      const weights = (await mock.pool.getPoolContent()).assetWeights
      expect(weights[0]).equal(await mock.pool.getPercent100())
    })
  })

  describe('mirrored account trades from 10 weth to 2.5 of each four asset', () => {
    before(async () => {
      // change mirrored account allocations
      await mock.weth.token.connect(mirrored).burn(parseEther('7.5'))
      await Promise.all(
        mock.assets.map(async (asset) => {
          await asset.token.connect(owner).mint(mirrored.address, parseEther('2.5'))
        })
      )
    })

    it('manager should be able to rebalance', async () => {
      const { pool, adapters, amm, weth, assets } = mock
      await rebalance(pool, owner, adapters, amm, weth, assets)
    })

    it('pool value should not decrease more than the amount of trade fees and slippage', async () => {
      const poolValue = (await mock.pool.getPoolContent()).assetValue
      expect(poolValue).gt(parseEther('9.97'))
    })

    it('pool total supply should not change as a result of rebalance', async () => {
      const totalSupply = await mock.pool.totalSupply()
      expect(totalSupply).equal(parseEther('10'))
    })

    it('pool should have weights equal to the mirrored weights', async () => {
      const poolWeights = (await mock.pool.getPoolContent()).assetWeights
      const mirroredWeights = (await mock.pool.getMirroredContent()).assetWeights
      poolWeights.forEach((weight, idx) => {
        const diff = parseFloat(formatUnits(weight.sub(mirroredWeights[idx]).abs(), 8))
        expect(diff).lt(0.01)
      })
    })
  })

  describe('mirrorer2 deposits 10 ETH', () => {
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, adapters, amm, weth, assets } = mock
      const figures = await mock.pool.getPoolContent()
      poolValueBefore = figures.assetValue
      await deposit(pool, mirrorer2, adapters, amm, weth, assets, parseEther('10'))
    })

    it('pool value should increase by the deposit value minus trade fees', async () => {
      const figures = await mock.pool.getPoolContent()
      const change = parseFloat(formatEther(figures.assetValue.sub(poolValueBefore)))
      expect(change).approximately(10, 0.08)
    })

    it('pool weights should not change (should still be balanced with the mirrored)', async () => {
      const poolWeights = (await mock.pool.getPoolContent()).assetWeights
      const mirroredWeights = (await mock.pool.getMirroredContent()).assetWeights
      poolWeights.forEach((weight, idx) => {
        const diff = parseFloat(formatUnits(weight.sub(mirroredWeights[idx]).abs(), 8))
        expect(diff).lt(0.01)
      })
    })

    it('mirrorer2 should hold ~50% of the pool token supply after the deposit', async () => {
      const totalSupply = parseFloat(formatEther(await mock.pool.totalSupply()))
      const mirrorerBalance = parseFloat(formatEther(await mock.pool.balanceOf(mirrorer2.address)))
      const share = mirrorerBalance / totalSupply
      expect(share).approximately(0.5, 0.01)
    })
  })

  describe('mirrorer2 withdraws 5 ETH', () => {
    let mirrorerBalanceBefore: BigNumber
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, adapters, amm, weth, assets } = mock
      mirrorerBalanceBefore = await mirrorer2.getBalance()
      poolValueBefore = (await mock.pool.getPoolContent()).assetValue
      await withdraw(pool, mirrorer2, adapters, amm, weth, assets, parseEther('5'))
    })

    it('mirrorer2 should receive ~5 ETH', async () => {
      const balance = await mirrorer2.getBalance()
      const balanceAdded = parseFloat(formatEther(balance.sub(mirrorerBalanceBefore)))
      expect(balanceAdded).approximately(5.0, 0.01)
    })

    it('pool value should decrease by the withdrawn value plus trade fees', async () => {
      const poolValue = (await mock.pool.getPoolContent()).assetValue
      const change = parseFloat(formatEther(poolValueBefore.sub(poolValue)))
      expect(change).approximately(5, 0.01)
    })

    it('pool weights should not change (should still be balanced with the mirrored)', async () => {
      const poolWeights = (await mock.pool.getPoolContent()).assetWeights
      const mirroredWeights = (await mock.pool.getMirroredContent()).assetWeights
      poolWeights.forEach((weight, idx) => {
        const diff = parseFloat(formatUnits(weight.sub(mirroredWeights[idx]).abs(), 8))
        expect(diff).lt(0.01)
      })
    })

    it('mirrorer2 should hold 1/3 of the pool asset supply after the withdrawal', async () => {
      const totalSupply = parseFloat(formatEther(await mock.pool.totalSupply()))
      const mirrorerBalance = parseFloat(formatEther(await mock.pool.balanceOf(mirrorer2.address)))
      const share = mirrorerBalance / totalSupply
      expect(share).approximately(1 / 3, 0.01)
    })
  })
})
