import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecatAndPool from '../../utils/mock-housecat-and-pool'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { mockPriceFeed } from '../../../utils/mock-defi'
import { deposit, withdraw } from '../../utils/deposit-withdraw'

describe('HousecatPool: performance fee', () => {
  describe('getAccruedPerformanceFee', () => {
    it('accrued amount should be zero right after the first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee  amount right after deposit
      const accruedFee = await pool.getAccruedPerformanceFee()
      expect(accruedFee).equal(0)
    })

    it('accrued amount should be zero right after a subsequent deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      expect(await pool.getAccruedPerformanceFee()).not.equal(0)

      // deposit 1 ether => accrued amount resets
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee  amount right after deposit
      expect(await pool.getAccruedPerformanceFee()).equal(0)
    })

    it('accrued amount should be zero right after a subsequent withdrawal', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      expect(await pool.getAccruedPerformanceFee()).not.equal(0)

      // withdraw 1 ether => accrued amount resets
      await withdraw(pool, adapters, mirrorer, parseEther('1'))

      // get fee  amount right after withdrawal
      const accruedFee = await pool.getAccruedPerformanceFee()
      expect(accruedFee).equal(0)
    })

    it('accrued amount should be correct when pool value has increased by 10% since first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, factory, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      expect(await pool.getAccruedPerformanceFee()).not.equal(0)

      // get accrued value
      const percent100 = await mgmt.getPercent100()
      const feePercent = (await factory.getUserSettings(mirrored.address)).performanceFee
      const accruedFee = await pool.getAccruedPerformanceFee()
      const totalSupply = await pool.totalSupply()
      const expected = totalSupply.mul(10).div(100).mul(feePercent).div(percent100)
      expect(accruedFee).equal(expected)
      expect(accruedFee).gt(0)
    })

    it('accrued amount should be 0 when pool value has decreased by 10% since first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% lower
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('0.9'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      // get accrued value
      const accruedFee = await pool.getAccruedPerformanceFee()
      expect(accruedFee).equal(0)
    })

    it('accrued amount should be correct when pool value has increased, then settled, and again increased', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, factory, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      expect(await pool.getAccruedPerformanceFee()).not.equal(0)

      // settle performance fee
      await pool.connect(mirrorer).settlePerformanceFee()

      // change price feed so that the value is 10% higher from previous settlement
      const priceFeed3 = await mockPriceFeed(signer, ethers.utils.parseEther('1.21'), 18)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed3.address,
      })

      // get accrued value
      const percent100 = await mgmt.getPercent100()
      const feePercent = (await factory.getUserSettings(mirrored.address)).performanceFee
      const accruedFee = await pool.getAccruedPerformanceFee()
      const totalSupply = await pool.totalSupply()
      const expected = totalSupply.mul(10).div(100).mul(feePercent).div(percent100)
      expect(accruedFee).equal(expected)
      expect(accruedFee).gt(0)
    })
  })

  describe('settlePerformanceFee', () => {
    it('should fail when paused', async () => {
      const [signer, mirrored, otherUser] = await ethers.getSigners()
      const { pool, mgmt } = await mockHousecatAndPool({ signer, mirrored })
      await mgmt.connect(signer).emergencyPause()
      const settle = pool.connect(otherUser).settlePerformanceFee()
      await expect(settle).revertedWith('HousecatPool: paused')
    })

    it('should mint accrued performance fee minus protocol tax to mirrored account and tax to treasury', async () => {
      const [signer, mirrored, mirrorer, treasury] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      // check accrued amount and tax
      const accruedAmount = await pool.getAccruedPerformanceFee()
      const protocolTax = (await mgmt.getPerformanceFee()).protocolTax
      const taxAmount = accruedAmount.mul(protocolTax).div(await mgmt.getPercent100())
      const mirroredFeeAmount = accruedAmount.sub(taxAmount)

      // settle
      await pool.connect(mirrorer).settlePerformanceFee()

      const mirroredPoolBalance = await pool.balanceOf(mirrored.address)
      const treasuryPoolBalance = await pool.balanceOf(treasury.address)

      expect(mirroredPoolBalance).equal(mirroredFeeAmount)
      expect(treasuryPoolBalance).equal(taxAmount)
    })

    it('settlement should reset the accrued amount', async () => {
      const [signer, mirrored, mirrorer, treasury] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      // settle
      await pool.connect(mirrorer).settlePerformanceFee()

      const accruedAmount = await pool.getAccruedPerformanceFee()
      expect(accruedAmount).equal(0)
    })

    it('emits PerformanceFeeSettled event', async () => {
      const [signer, mirrored, mirrorer, treasury] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        performanceFee: {
          defaultFee: parseUnits('0.10', 8), // 10%
          maxFee: parseUnits('0.2', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      // check accrued amount and tax
      const accruedAmount = await pool.getAccruedPerformanceFee()
      const protocolTax = (await mgmt.getPerformanceFee()).protocolTax
      const taxAmount = accruedAmount.mul(protocolTax).div(await mgmt.getPercent100())
      const mirroredFeeAmount = accruedAmount.sub(taxAmount)

      // settle
      const settle = await pool.connect(mirrorer).settlePerformanceFee()

      await expect(settle).emit(pool, 'PerformanceFeeSettled').withArgs(mirroredFeeAmount, taxAmount)
    })
  })
})
