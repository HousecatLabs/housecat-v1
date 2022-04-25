import { ethers } from 'hardhat'
import { formatEther, formatUnits, parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../test/mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'
import { expect } from 'chai'
import { deposit, withdraw, swapWethToTokens } from '../utils/pool-actions'

describe('integration: deposit-manage-withdraw', () => {
  let owner: SignerWithAddress
  let treasury: SignerWithAddress
  let manager: SignerWithAddress
  let mirrorer: SignerWithAddress
  let mock: IMockHousecatAndPool

  before(async () => {
    ;[owner, treasury, manager, mirrorer] = await ethers.getSigners()
    mock = await mockHousecatAndPool(owner, treasury, manager, { price: '1' }, [
      { price: '1', reserveToken: '10000', reserveWeth: '10000' },
      { price: '2', reserveToken: '5000', reserveWeth: '10000' },
      { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
    ])
  })

  describe('initial deposit of 10 ETH by pool manager', () => {
    before(async () => {
      const { pool } = mock
      await pool.connect(manager).deposit([], { value: parseEther('10') })
    })

    it('managers pool token balance should equal the deposit value', async () => {
      expect(await mock.pool.balanceOf(manager.address)).equal(parseEther('10'))
    })

    it('pool value should increase by the value of the deposit', async () => {
      expect(await mock.pool.getAssetValue()).equal(parseEther('10'))
    })

    it('pool total supply should equal the holdings of the manager', async () => {
      expect(await mock.pool.totalSupply()).equal(await mock.pool.balanceOf(manager.address))
    })

    it('pool should hold 100% WETH', async () => {
      const [weights] = await mock.pool.getAssetWeights()
      expect(weights[0]).equal(await mock.pool.getPercent100())
    })
  })

  describe('pool manager trades from 100% weth to 25% of each four asset', () => {
    before(async () => {
      const { pool, manageAssetsAdapter, amm, weth, assets } = mock
      await swapWethToTokens(pool, manager, manageAssetsAdapter, amm, weth, assets, [
        parseEther('2.5'),
        parseEther('2.5'),
        parseEther('2.5'),
      ])
    })

    it('pool value should not decrease more than the amount of trade fees and slippage', async () => {
      const poolValue = await mock.pool.getAssetValue()
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

  describe('mirrorer deposits 10 ETH', () => {
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, depositAdapter, amm, weth, assets } = mock
      poolValueBefore = await pool.getAssetValue()
      await deposit(pool, mirrorer, depositAdapter, amm, weth, assets, parseEther('10'))
    })

    it('pool value should increase by the deposit value minus trade fees', async () => {
      const poolValue = await mock.pool.getAssetValue()
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

    it('mirrorer should hold ~50% of the pool token supply after the deposit', async () => {
      const totalSupply = parseFloat(formatEther(await mock.pool.totalSupply()))
      const mirrorerBalance = parseFloat(formatEther(await mock.pool.balanceOf(mirrorer.address)))
      const share = mirrorerBalance / totalSupply
      expect(share).approximately(0.5, 0.01)
    })
  })

  describe('mirrorer withdraws 5 ETH', () => {
    let mirrorerBalanceBefore: BigNumber
    let poolValueBefore: BigNumber

    before(async () => {
      const { pool, withdrawAdapter, amm, weth, assets } = mock
      mirrorerBalanceBefore = await mirrorer.getBalance()
      poolValueBefore = await pool.getAssetValue()
      await withdraw(pool, mirrorer, withdrawAdapter, amm, weth, assets, parseEther('5'))
    })

    it('withdrawer should receive ~5 ETH', async () => {
      const balance = await mirrorer.getBalance()
      const balanceAdded = parseFloat(formatEther(balance.sub(mirrorerBalanceBefore)))
      expect(balanceAdded).approximately(5.0, 0.01)
    })

    it('pool value should decrease by the withdrawn value plus trade fees', async () => {
      const poolValue = await mock.pool.getAssetValue()
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

    it('mirrorer should hold 1/3 of the pool asset supply after the withdrawal', async () => {
      const totalSupply = parseFloat(formatEther(await mock.pool.totalSupply()))
      const mirrorerBalance = parseFloat(formatEther(await mock.pool.balanceOf(mirrorer.address)))
      const share = mirrorerBalance / totalSupply
      expect(share).approximately(1 / 3, 0.01)
    })
  })
})
