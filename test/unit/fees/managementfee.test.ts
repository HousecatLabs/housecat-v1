import { ethers } from 'hardhat'
import { expect } from 'chai'
import { DAYS, increaseTime, MINUTES, SECONDS } from '../../../utils/evm'
import { BigNumber } from 'ethers'
import mockHousecatAndPool from '../../mock/mock-housecat-and-pool'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { deposit, withdraw } from '../../test-utils'

const ethToFloat = (value: BigNumber): number => {
  return parseFloat(ethers.utils.formatEther(value))
}

describe('HousecatPool: management fee', () => {
  describe('getAccruedManagementFee', () => {
    it('accrued amount should be zero right after the first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee  amount right after deposit
      const accruedFee = await pool.getAccruedManagementFee()
      expect(ethToFloat(accruedFee)).approximately(0, 1e-8)
    })

    it('accrued amount should be zero right after a subsequent deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 10 days
      await increaseTime(10 * DAYS)

      // deposit 1 ether => accrued amount resets
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee  amount right after deposit
      const accruedFee = await pool.getAccruedManagementFee()
      expect(accruedFee).equal(0)
    })

    it('accrued amount should be zero right after a subsequent withdrawal', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 10 days
      await increaseTime(10 * DAYS)

      // withdraw 1 ether => accrued amount resets
      await withdraw(pool, adapters, mirrorer, parseEther('1'))

      // get fee  amount right after withdrawal
      const accruedFee = await pool.getAccruedManagementFee()
      expect(accruedFee).equal(0)
    })

    it('accrued amount should be correct when 1 second has passed since the first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, factory, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee amount after 1 second
      await increaseTime(1 * SECONDS)

      const percent100 = await mgmt.getPercent100()
      const feePercent = (await factory.getUserSettings(mirrored.address)).managementFee
      const accruedFee = await pool.getAccruedManagementFee()
      const totalSupply = await pool.totalSupply()
      const expected = totalSupply
        .mul(feePercent)
        .mul(1)
        .div(365 * 24 * 60 * 60)
        .div(percent100)
      expect(ethToFloat(accruedFee)).approximately(ethToFloat(expected), 1e-8)
    })

    it('accrued amount should be correct when 5 minutes has passed since the first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, factory, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee amount after 5 minutes
      await increaseTime(5 * MINUTES)

      const percent100 = await mgmt.getPercent100()
      const feePercent = (await factory.getUserSettings(mirrored.address)).managementFee
      const accruedFee = await pool.getAccruedManagementFee()
      const totalSupply = await pool.totalSupply()
      const expected = totalSupply
        .mul(feePercent)
        .mul(5)
        .div(365 * 24 * 60)
        .div(percent100)
      expect(ethToFloat(accruedFee)).approximately(ethToFloat(expected), 1e-8)
    })

    it('accrued amount should be correct when 10 days has passed since the first deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, factory, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // get fee amount after 10 days
      await increaseTime(10 * DAYS)

      const percent100 = await mgmt.getPercent100()
      const feePercent = (await factory.getUserSettings(mirrored.address)).managementFee
      const accruedFee = await pool.getAccruedManagementFee()
      const totalSupply = await pool.totalSupply()
      const expected = totalSupply.mul(feePercent).mul(10).div(365).div(percent100)
      expect(parseFloat(ethers.utils.formatEther(accruedFee))).approximately(
        parseFloat(ethers.utils.formatEther(expected)),
        1e-8
      )
    })

    it('accrued amount should be correct when 10 days has passed since a subsequent deposit', async () => {
      const [signer, mirrored, mirrorer] = await ethers.getSigners()
      const { pool, mgmt, factory, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 5 days
      await increaseTime(5 * DAYS)

      // deposit 1 ether => accrued amount resets
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 10 days
      await increaseTime(10 * DAYS)

      const percent100 = await mgmt.getPercent100()
      const feePercent = (await factory.getUserSettings(mirrored.address)).managementFee
      const accruedFee = await pool.getAccruedManagementFee()
      const totalSupply = await pool.totalSupply()
      const expected = totalSupply.mul(feePercent).mul(10).div(365).div(percent100)
      expect(parseFloat(ethers.utils.formatEther(accruedFee))).approximately(
        parseFloat(ethers.utils.formatEther(expected)),
        1e-8
      )
    })
  })

  describe('settleManagementFee', () => {
    it('should fail when paused', async () => {
      const [signer, mirrored, otherUser] = await ethers.getSigners()
      const { pool, mgmt } = await mockHousecatAndPool({ signer, mirrored })
      await mgmt.connect(signer).emergencyPause()
      const settle = pool.connect(otherUser).settleManagementFee()
      await expect(settle).revertedWith('HousecatPool: paused')
    })

    it('should mint accrued management fee minus housecat rake to mirrored account and rake to treasury', async () => {
      const [signer, mirrored, mirrorer, treasury] = await ethers.getSigners()
      const { pool, mgmt, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 10 days
      await increaseTime(10 * DAYS)

      // check accrued amount and rake
      const percent100 = await mgmt.getPercent100()
      const taxPercent = (await mgmt.getManagementFee()).protocolTax
      const accruedAmount = await pool.getAccruedManagementFee()
      const rakeAmount = accruedAmount.mul(taxPercent).div(percent100)
      const mirroredFeeAmount = accruedAmount.sub(rakeAmount)

      // settle
      await pool.connect(mirrorer).settleManagementFee()

      const balanceOfMirrored = await pool.balanceOf(mirrored.address)
      const balanceOfTreasury = await pool.balanceOf(treasury.address)

      expect(ethToFloat(balanceOfMirrored)).approximately(ethToFloat(mirroredFeeAmount), 1e-8)
      expect(ethToFloat(balanceOfTreasury)).approximately(ethToFloat(rakeAmount), 1e-8)
    })

    it('settlement should reset the accrued amount', async () => {
      const [signer, mirrored, mirrorer, treasury] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 10 days and settle
      await increaseTime(10 * DAYS)
      await pool.connect(mirrorer).settleManagementFee()

      const accruedAmount = await pool.getAccruedManagementFee()
      expect(accruedAmount).equal(0)
    })

    it('emits ManagementFeeSettled event', async () => {
      const [signer, mirrored, mirrorer, treasury] = await ethers.getSigners()
      const { pool, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        treasury,
        managementFee: {
          defaultFee: parseUnits('0.01', 8), // 1%
          maxFee: parseUnits('0.1', 8),
          protocolTax: parseUnits('0.25', 8),
        },
      })

      // deposit 1 ether
      await deposit(pool, adapters, mirrorer, parseEther('1'))

      // wait 10 days
      await increaseTime(10 * DAYS)

      // settle
      const settle = pool.connect(mirrorer).settleManagementFee()
      await expect(settle).emit(pool, 'ManagementFeeSettled')
    })
  })
})
