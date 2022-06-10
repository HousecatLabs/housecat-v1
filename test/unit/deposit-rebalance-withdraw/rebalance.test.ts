import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { formatUnits, parseEther } from 'ethers/lib/utils'
import { deposit } from '../../utils/deposit-withdraw'
import { DAYS, increaseTime, SECONDS } from '../../../utils/evm'

describe('HousecatPool: rebalance', () => {
  it('only whitelisted rebalancer allowed to call if rebalancers list has items', async () => {
    const [signer, mirrored, rebalancer] = await ethers.getSigners()
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
        reward: 0,
        protocolTax: 0,
        rebalancers: [rebalancer.address],
      },
    })
    const encoder = new ethers.utils.AbiCoder()
    const data = encoder.encode(['string'], ['foobar'])
    const rebalance = pool
      .connect(mirrored)
      .rebalance(mirrored.address, [{ adapter: adapters.uniswapV2Adapter.address, data }])
    await expect(rebalance).revertedWith('HousecatPool: only rebalancer')
  })

  it('anyone allowed to call if rebalancers list is empty', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool, adapters } = await mockHousecatAndPool({
      signer,
      mirrored,
      weth: { price: '1', amountToMirrored: '10' },
      assets: [],
      rebalanceSettings: {
        minSecondsBetweenRebalances: 60,
        maxSlippage: 1e6,
        maxCumulativeSlippage: 3e6,
        cumulativeSlippagePeriodSeconds: 0,
        reward: 0,
        protocolTax: 0,
        rebalancers: [],
      },
    })
    await deposit(pool, adapters, signer, parseEther('10'))
    const rebalance = pool.connect(mirrored).rebalance(signer.address, [])
    await expect(rebalance).not.reverted
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
        reward: 0,
        protocolTax: 0,
        rebalancers: [],
      },
    })

    // initial deposit
    await deposit(pool, adapters, signer, parseEther('1'))

    // rebalance
    const rebalance = pool.rebalance(signer.address, [])
    await expect(rebalance).emit(pool, 'RebalancePool')
  })

  it('should fail to increase the weight difference', async () => {
    const [signer, mirrored, mirrorer] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool({ signer, mirrored })

    // initial deposit
    await deposit(pool, adapters, mirrorer, parseEther('5'))

    // make pool unbalanced by adding asset0 to mirrored
    await assets[0].token.mint(mirrored.address, parseEther('1'))

    // try to trade too much weth -> asset0
    const rebalance = pool.connect(signer).rebalance(signer.address, [
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
    await expect(rebalance).revertedWith('HousecatPool: weight diff increased')
  })

  it('should fail to change current weights of the pool if the mirrored value is less than minMirroredValue', () => {
    //
  })

  it('should fail to reduce pool value through slippage if pool is already within max weight difference limits', async () => {
    const [signer, mirrored, mirrorer] = await ethers.getSigners()
    const { pool, adapters, amm, assets, weth } = await mockHousecatAndPool({ signer, mirrored })

    // initial deposit
    await deposit(pool, adapters, mirrorer, parseEther('5'))

    // add small amount of asset0 to mirrored
    await assets[0].token.mint(mirrored.address, parseEther('0.01'))

    // try to trade weth -> asset0
    const rebalance = pool.connect(signer).rebalance(signer.address, [
      {
        adapter: adapters.uniswapV2Adapter.address,
        data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
          amm.address,
          [weth.token.address, assets[0].token.address],
          parseEther('0.005'),
          1,
        ]),
      },
    ])
    await expect(rebalance).revertedWith('HousecatPool: already balanced')
  })

  it('should fail if pool is suspended', async () => {
    const [signer, mirrored] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool({ signer, mirrored })
    await pool.connect(signer).setSuspended(true)
    const tx = pool.rebalance(signer.address, [])
    await expect(tx).revertedWith('HousecatPool: suspended')
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
          reward: 0,
          protocolTax: 0,
          rebalancers: [],
        },
      })

      // send initial deposit of 10 ETH
      await deposit(pool, adapters, signer, parseEther('10'))

      // send a low liquidity Asset0 to the mirrored
      await assets[0].token.mint(mirrored.address, parseEther('10'))

      // try to rebalance when slippage limit is 1%
      const tx = pool.connect(signer).rebalance(signer.address, [
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
          reward: 0,
          protocolTax: 0,
          rebalancers: [],
        },
      })

      // send initial deposit of 10 ETH
      await deposit(pool, adapters, signer, parseEther('10'))

      // send a low liquidity Asset0 to the mirrored
      await assets[0].token.mint(mirrored.address, parseEther('10'))

      // try to rebalance when slippage limit is high (50%) but cumulative slippage limit is low (1%)
      const tx = pool.connect(signer).rebalance(signer.address, [
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
          reward: 0,
          protocolTax: 0,
          rebalancers: [],
        },
      })

      // send initial deposit of 10 ETH
      await deposit(pool, adapters, signer, parseEther('10'))

      // send a low liquidity Asset0 to the mirrored
      assets[0].token.mint(mirrored.address, parseEther('10'))

      // rebalance and check the slippage
      const percent100 = await pool.getPercent100()
      const start = await pool.getPoolContent()
      await pool.connect(signer).rebalance(signer.address, [
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

      await pool.connect(signer).rebalance(signer.address, [])
      const [cumulativeSlippage2] = await pool.getCumulativeSlippage()
      expect(parseFloat(formatUnits(cumulativeSlippage2, 8))).approximately(
        parseFloat(formatUnits(cumulativeSlippage1.sub(6e6), 8)),
        0.02
      )

      // send more Asset0 to the mirrored and rebalance
      assets[0].token.mint(mirrored.address, parseEther('2'))
      await pool.connect(signer).rebalance(signer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('0.4545'),
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
      await pool.connect(signer).rebalance(signer.address, [])
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
          reward: 0,
          protocolTax: 0,
          rebalancers: [],
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('1'))

      // rebalance
      await pool.rebalance(signer.address, [])

      // wait 50 seconds when 60 seconds is the lock period
      await increaseTime(50 * SECONDS)

      // try rebalance
      const rebalance2 = pool.rebalance(signer.address, [])
      await expect(rebalance2).revertedWith('HousecatPool: rebalance locked')

      await increaseTime(10 * SECONDS)

      // try rebalance again when time has passed
      const rebalance3 = pool.rebalance(signer.address, [])
      await expect(rebalance3).not.reverted
    })
  })

  describe('rebalance reward', () => {
    it('should collect reward based on how much the weight difference decreased on rebalance', async () => {
      const [signer, treasury, rebalancer] = await ethers.getSigners()
      const mirrored = ethers.Wallet.createRandom()
      const { pool, adapters, amm, weth, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        weth: { price: '1', amountToMirrored: '1' },
        assets: [{ price: '1', reserveToken: '1000', reserveWeth: '1000', amountToMirrored: '0' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 60,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          reward: 0.25e6, // 0.25%
          protocolTax: 25e6, // 25%
          rebalancers: [],
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('2'))

      // send asset0 to mirrored
      await assets[0].token.mint(mirrored.address, parseEther('1'))

      // rebalance
      const before = await pool.getWeightDifference()
      await pool.connect(rebalancer).rebalance(rebalancer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('2'), // pool total supply
            1,
          ]),
        },
      ])
      const after = await pool.getWeightDifference()
      const change = before.sub(after)
      const rewardAmount = parseEther('1')
        .mul(change)
        .mul(25)
        .div(10000)
        .div(await pool.getPercent100())
      const amountTax = rewardAmount.mul(25).div(100)
      const amountBeneficiary = rewardAmount.mul(75).div(100)

      expect(await pool.balanceOf(treasury.address)).eq(amountTax)
      expect(await pool.balanceOf(rebalancer.address)).eq(amountBeneficiary)
    })

    it('should emit RebalanceRewardCollected event', async () => {
      const [signer, mirrored, treasury, rebalancer] = (await ethers.getSigners()).slice(10)
      const { pool, adapters, amm, weth, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        weth: { price: '1', amountToMirrored: '1' },
        assets: [{ price: '1', reserveToken: '1000', reserveWeth: '1000', amountToMirrored: '0' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 60,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          reward: 0.25e6, // 0.25%
          protocolTax: 25e6, // 25%
          rebalancers: [],
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('2'))

      // send asset0 to mirrored
      await assets[0].token.mint(mirrored.address, parseEther('1'))

      // rebalance
      const tx = await pool.connect(rebalancer).rebalance(rebalancer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('1'),
            1,
          ]),
        },
      ])
      const amountTax = await pool.balanceOf(treasury.address)
      const amountBeneficiary = await pool.balanceOf(rebalancer.address)
      await expect(tx).emit(pool, 'RebalanceRewardCollected').withArgs(amountBeneficiary, amountTax)
    })

    it('should forward all rewards to treasury if protocolTax is 100%', async () => {
      const [signer, mirrored, treasury, rebalancer] = await ethers.getSigners()
      const { pool, adapters, amm, weth, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        weth: { price: '1', amountToMirrored: '1' },
        assets: [{ price: '1', reserveToken: '1000', reserveWeth: '1000', amountToMirrored: '0' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 60,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          reward: 0.25e6, // 0.25%
          protocolTax: 100e6, // 100%
          rebalancers: [],
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('2'))

      // send asset0 to mirrored
      await assets[0].token.mint(mirrored.address, parseEther('1'))

      // rebalance
      const before = await pool.getWeightDifference()
      await pool.connect(rebalancer).rebalance(rebalancer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('1'),
            1,
          ]),
        },
      ])
      const after = await pool.getWeightDifference()
      const change = before.sub(after)
      const rewardAmount = parseEther('2')
        .mul(change)
        .mul(25)
        .div(10000)
        .div(await pool.getPercent100())

      expect(await pool.balanceOf(treasury.address)).eq(rewardAmount)
      expect(await pool.balanceOf(rebalancer.address)).eq(0)
    })

    it('should forward all rewards to beneficiary if protocolTax is 0%', async () => {
      const [signer, mirrored, treasury, rebalancer] = await ethers.getSigners()
      const { pool, adapters, amm, weth, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        weth: { price: '1', amountToMirrored: '1' },
        assets: [{ price: '1', reserveToken: '1000', reserveWeth: '1000', amountToMirrored: '0' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 60,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          reward: 0.25e6, // 0.25%
          protocolTax: 0,
          rebalancers: [],
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('2'))

      // send asset0 to mirrored
      await assets[0].token.mint(mirrored.address, parseEther('1'))

      // rebalance
      const before = await pool.getWeightDifference()
      await pool.connect(rebalancer).rebalance(rebalancer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('1'),
            1,
          ]),
        },
      ])
      const after = await pool.getWeightDifference()
      const change = before.sub(after)
      const rewardAmount = parseEther('2')
        .mul(change)
        .mul(25)
        .div(10000)
        .div(await pool.getPercent100())

      expect(await pool.balanceOf(treasury.address)).eq(0)
      expect(await pool.balanceOf(rebalancer.address)).eq(rewardAmount)
    })

    it('should forward rewards when the beneficiary address is other than msg.sender', async () => {
      const [signer, mirrored, treasury, rebalancer, beneficiary] = await ethers.getSigners()
      const { pool, adapters, amm, weth, assets } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        weth: { price: '1', amountToMirrored: '1' },
        assets: [{ price: '1', reserveToken: '1000', reserveWeth: '1000', amountToMirrored: '0' }],
        rebalanceSettings: {
          minSecondsBetweenRebalances: 60,
          maxSlippage: 1e6,
          maxCumulativeSlippage: 3e6,
          cumulativeSlippagePeriodSeconds: 0,
          reward: 0.25e6, // 0.25%
          protocolTax: 0,
          rebalancers: [],
        },
      })

      // initial deposit
      await deposit(pool, adapters, signer, parseEther('2'))

      // send asset0 to mirrored
      await assets[0].token.mint(mirrored.address, parseEther('1'))

      // rebalance
      const before = await pool.getWeightDifference()
      await pool.connect(rebalancer).rebalance(beneficiary.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[0].token.address],
            parseEther('1'),
            1,
          ]),
        },
      ])
      const after = await pool.getWeightDifference()
      const change = before.sub(after)
      const rewardAmount = parseEther('2')
        .mul(change)
        .mul(25)
        .div(10000)
        .div(await pool.getPercent100())

      expect(await pool.balanceOf(treasury.address)).eq(0)
      expect(await pool.balanceOf(rebalancer.address)).eq(0)
      expect(await pool.balanceOf(beneficiary.address)).eq(rewardAmount)
    })
  })

  describe('rebalance when a token is delisted', () => {
    it('should be able to unwind position in a delisted token', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { pool, adapters, mgmt, assets, amm, weth } = await mockHousecatAndPool({
        signer,
        treasury,
        mirrored,
        weth: { price: '1', amountToMirrored: '0' },
        assets: [
          { price: '1', reserveToken: '100000', reserveWeth: '100000', amountToMirrored: '10' },
          { price: '1', reserveToken: '100000', reserveWeth: '100000', amountToMirrored: '10' },
        ],
      })

      // deposit 10 ETH by mirrorer (trade WETH to 50/50 Asset0 and Asset1)
      const amountDeposit = parseEther('10')
      await pool.connect(mirrorer).deposit(
        mirrorer.address,
        [
          {
            adapter: adapters.wethAdapter.address,
            data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
          },
          {
            adapter: adapters.uniswapV2Adapter.address,
            data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
              amm.address,
              [weth.token.address, assets[0].token.address],
              amountDeposit.div(2),
              1,
            ]),
          },
          {
            adapter: adapters.uniswapV2Adapter.address,
            data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
              amm.address,
              [weth.token.address, assets[1].token.address],
              amountDeposit.div(2),
              1,
            ]),
          },
        ],
        { value: amountDeposit }
      )

      // weight difference should be 0 %
      expect(await pool.getWeightDifference()).eq(0)

      // delist token 0
      await mgmt.setTokenMeta(assets[0].token.address, {
        ...(await mgmt.getTokenMeta(assets[0].token.address)),
        delisted: true,
      })

      // weight difference should be 100 %
      expect(await pool.getWeightDifference()).eq(await pool.getPercent100())

      // rebalance and swap the position in Asset0 to Asset1
      await pool.connect(signer).rebalance(mirrorer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [assets[0].token.address, weth.token.address],
            await assets[0].token.balanceOf(pool.address),
            1,
          ]),
        },
      ])
      await pool.connect(signer).rebalance(mirrorer.address, [
        {
          adapter: adapters.uniswapV2Adapter.address,
          data: adapters.uniswapV2Adapter.interface.encodeFunctionData('swapTokens', [
            amm.address,
            [weth.token.address, assets[1].token.address],
            await weth.token.balanceOf(pool.address),
            1,
          ]),
        },
      ])

      // weight difference should be 0
      expect(await pool.getWeightDifference()).eq(0)
    })
  })
})
