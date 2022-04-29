import { ethers } from 'hardhat'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../test/mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { HousecatPool, IUniswapV2Router02 } from '../../typechain-types'
import { ITokenWithPriceFeed } from '../../utils/mock-defi'
import { IAdapters } from '../../utils/deploy-contracts'
import { expect } from 'chai'

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
  return pool.connect(manager).manage(buyTokenTxs)
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
    data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
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
  const [_, poolValue] = await pool.getAssetWeights()
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

describe('integration: deposit-manage-withdraw', () => {
  let owner: SignerWithAddress
  let treasury: SignerWithAddress
  let mirrored: SignerWithAddress
  let mirrorer1: SignerWithAddress
  let mirrorer2: SignerWithAddress
  let mock: IMockHousecatAndPool

  before(async () => {
    ;[owner, treasury, mirrorer1, mirrorer2, mirrored] = await ethers.getSigners()
    mock = await mockHousecatAndPool(owner, treasury, mirrored, { price: '1' }, [
      { price: '1', reserveToken: '10000', reserveWeth: '10000' },
      { price: '2', reserveToken: '5000', reserveWeth: '10000' },
      { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
    ])
  })

  describe('initial deposit of 10 ETH by mirrorer1', () => {
    before(async () => {
      const { pool } = mock
      await pool.connect(mirrorer1).deposit([], { value: parseEther('10') })
    })

    it('mirrorer1 pool token balance should equal the deposit value', async () => {
      expect(await mock.pool.balanceOf(mirrorer1.address)).equal(parseEther('10'))
    })

    it('pool value should increase by the value of the deposit', async () => {
      const [_, value] = await mock.pool.getAssetWeights()
      expect(value).equal(parseEther('10'))
    })

    it('pool total supply should equal the holdings of mirrorer1', async () => {
      expect(await mock.pool.totalSupply()).equal(await mock.pool.balanceOf(mirrorer1.address))
    })

    it('pool should hold 100% WETH', async () => {
      const [weights] = await mock.pool.getAssetWeights()
      expect(weights[0]).equal(await mock.pool.getPercent100())
    })
  })

  describe('pool manager trades from 100% weth to 25% of each four asset', () => {
    before(async () => {
      const { pool, adapters, amm, weth, assets } = mock
      await swapWethToTokens(pool, owner, adapters, amm, weth, assets, [
        parseEther('2.5'),
        parseEther('2.5'),
        parseEther('2.5'),
      ])
    })

    it('pool value should not decrease more than the amount of trade fees and slippage', async () => {
      const [_, poolValue] = await mock.pool.getAssetWeights()
      expect(poolValue).gt(parseEther('9.97'))
    })

    it('pool total supply should not change as a result of trading assets', async () => {
      const totalSupply = await mock.pool.totalSupply()
      expect(totalSupply).equal(parseEther('10'))
    })

    it('pool should hold 25% of each four asset', async () => {
      const [weights] = await mock.pool.getAssetWeights()
      weights.forEach((weight) => {
        const percent = parseFloat(formatUnits(weight, 8))
        expect(percent).approximately(0.25, 0.01)
      })
    })
  })

  describe('mirrorer2 deposits 10 ETH', () => {
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, adapters, amm, weth, assets } = mock
      poolValueBefore = (await pool.getAssetWeights())[1]
      await deposit(pool, mirrorer2, adapters, amm, weth, assets, parseEther('10'))
    })

    it('pool value should increase by the deposit value minus trade fees', async () => {
      const [_, poolValue] = await mock.pool.getAssetWeights()
      const change = parseFloat(formatEther(poolValue.sub(poolValueBefore)))
      expect(change).approximately(10, 0.03)
    })

    it('pool weights should not change (should still hold 25% of each asset)', async () => {
      const [weights] = await mock.pool.getAssetWeights()
      weights.forEach((weight) => {
        const percent = parseFloat(formatUnits(weight, 8))
        expect(percent).approximately(0.25, 0.01)
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
      poolValueBefore = (await pool.getAssetWeights())[1]
      await withdraw(pool, mirrorer2, adapters, amm, weth, assets, parseEther('5'))
    })

    it('mirrorer2 should receive ~5 ETH', async () => {
      const balance = await mirrorer2.getBalance()
      const balanceAdded = parseFloat(formatEther(balance.sub(mirrorerBalanceBefore)))
      expect(balanceAdded).approximately(5.0, 0.01)
    })

    it('pool value should decrease by the withdrawn value plus trade fees', async () => {
      const [_, poolValue] = await mock.pool.getAssetWeights()
      const change = parseFloat(formatEther(poolValueBefore.sub(poolValue)))
      expect(change).approximately(5, 0.01)
    })

    it('pool weights should not change (should still hold 25% of each asset)', async () => {
      const [weights] = await mock.pool.getAssetWeights()
      weights.forEach((weight) => {
        const percent = parseFloat(formatUnits(weight, 8))
        expect(percent).approximately(0.25, 0.01)
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
