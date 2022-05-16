import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { formatUnits, parseEther } from 'ethers/lib/utils'
import { deposit } from '../../utils/deposit-withdraw'
import { DAYS, increaseTime, SECONDS } from '../../../utils/evm'

describe('HousecatPool: rebalance', () => {
  it('only owner allowed to call', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({ signer, mirrored })
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const rebalance = pool.connect(mirrored).rebalance([{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(rebalance).revertedWith('Ownable: caller is not the owner')
  })

  it('should emit RebalancePool event', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
      rebalanceSettings: {
        minSecondsBetweenRebalances: 60,
        maxSlippage: 1e6,
        maxCumulativeSlippage: 3e6,
        cumulativeSlippagePeriodSeconds: 0,
        tradeTax: 0,
      },
    })

    // initial deposit
    await deposit(pool, adapters, signer, parseEther('1'))

    // rebalance
    const rebalance = pool.rebalance([])
    await expect(rebalance).emit(pool, 'RebalancePool')
  })

  it('TODO: should fail to increase the weight difference', () => {
    // TODO
  })

  describe('slippage limits', () => {
    it('should fail to exceed slippage limit', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        weth: { price: '1', amountToMirrored: '10' },
        assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 0,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          tradeTax: 0,
        },
      })

      // send initial deposit of 10 ETH
      await deposit(pool, adapters, signer, parseEther('10'))

      // send a low liquidity Asset0 to the mirrored
      assets[0].token.mint(mirrored.address, parseEther('10'))

      // try to rebalance when slippage limit is 1%
      const tx = pool.connect(signer).rebalance([
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('5'),
            1,
          ]),
        },
      ])
      await expect(tx).revertedWith('HousecatPool: slippage exceeded')
    })

    it('should fail to exceed cumulative slippage limit', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        weth: { price: '1', amountToMirrored: '10' },
        assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 0,
          maxSlippage: 0.5e8,
          maxCumulativeSlippage: 1e6,
          cumulativeSlippagePeriodSeconds: 60,
          tradeTax: 0,
        },
      })

      // send initial deposit of 10 ETH
      await deposit(pool, adapters, signer, parseEther('10'))

      // send a low liquidity Asset0 to the mirrored
      assets[0].token.mint(mirrored.address, parseEther('10'))

      // try to rebalance when slippage limit is high (50%) but cumulative slippage limit is low (1%)
      const tx = pool.connect(signer).rebalance([
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('5'),
            1,
          ]),
        },
      ])

      await expect(tx).revertedWith('HousecatPool: cum. slippage exceeded')
    })

    it('should accumulate and reduce the cumulative slippage limit on rebalance', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, weth, adapters, amm, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        weth: { price: '1', amountToMirrored: '10' },
        assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 0,
          maxSlippage: 0.5e8,
          maxCumulativeSlippage: 12e6,
          cumulativeSlippagePeriodSeconds: 60 * 60 * 24 * 60, // 60 days
          tradeTax: 0,
        },
      })

      // send initial deposit of 10 ETH
      await deposit(pool, adapters, signer, parseEther('10'))

      // send a low liquidity Asset0 to the mirrored
      assets[0].token.mint(mirrored.address, parseEther('10'))

      // rebalance and check the slippage
      const percent100 = await pool.getPercent100()
      const start = await pool.getPoolContent()
      await pool.connect(signer).rebalance([
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('5'),
            1,
          ]),
        },
      ])
      const afterRebalance1 = await pool.getPoolContent()
      const slippage1 = start.netValue.sub(afterRebalance1.netValue).mul(percent100).div(start.netValue)

      const [cumulativeSlippage1] = await pool.getCumulativeSlippage()
      expect(cumulativeSlippage1).equal(slippage1)

      // wait 30 days and rebalance -> the cumulative value should reduce by ~6% (50% of the max cumulative limit)
      await increaseTime(30 * DAYS)

      await pool.connect(signer).rebalance([])
      const [cumulativeSlippage2] = await pool.getCumulativeSlippage()
      expect(parseFloat(formatUnits(cumulativeSlippage2, 8))).approximately(
        parseFloat(formatUnits(cumulativeSlippage1.sub(6e6), 8)),
        0.02
      )

      // send more Asset0 to the mirrored and rebalance
      assets[0].token.mint(mirrored.address, parseEther('2'))
      await pool.connect(signer).rebalance([
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('0.45'),
            1,
          ]),
        },
      ])

      // cumulative slippage value should increase by the realized slippage value
      const afterRebalance2 = await pool.getPoolContent()
      const slippage2 = afterRebalance1.netValue
        .sub(afterRebalance2.netValue)
        .mul(percent100)
        .div(afterRebalance1.netValue)
      const [cumulativeSlippage3] = await pool.getCumulativeSlippage()
      expect(parseFloat(formatUnits(cumulativeSlippage3, 8))).approximately(
        parseFloat(formatUnits(cumulativeSlippage2.add(slippage2), 8)),
        0.02
      )

      // wait more time and check the cumulative slippage value reduces to zero after rebalance
      await increaseTime(30 * DAYS)
      await pool.connect(signer).rebalance([])
      const [cumulativeSlippage4] = await pool.getCumulativeSlippage()
      expect(cumulativeSlippage4).equal(0)
    })
  })

  describe('rebalance time lock', () => {
    it('should fail if rebalance is locked due to a recent rebalance', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        weth: { price: '1', amountToMirrored: '10' },
        assets: [{ price: '1', reserveToken: '20', reserveWeth: '20' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 60,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          tradeTax: 0,
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('1'))

      // rebalance
      await pool.rebalance([])

      // wait 50 seconds when 60 seconds is the lock period
      await increaseTime(50 * SECONDS)

      // try rebalance
      const rebalance2 = pool.rebalance([])
      await expect(rebalance2).revertedWith('HousecatPool: rebalance locked')

      await increaseTime(10 * SECONDS)

      // try rebalance again when time has passed
      const rebalance3 = pool.rebalance([])
      await expect(rebalance3).not.reverted
    })
  })
})
