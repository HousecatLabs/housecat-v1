import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployHousecat } from '../../utils/deploy-contracts'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { mockPriceFeed, mockWETH } from '../../utils/mock-defi'
import mockHousecatAndPool from '../utils/mock-housecat-and-pool'
import { DAYS, increaseTime } from '../../utils/evm'

describe('HousecatFactory', () => {
  describe('createPool', () => {
    it('should fail when paused', async () => {
      const [signer, treasury, mirrored] = await ethers.getSigners()
      const { mgmt, factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.connect(signer).emergencyPause()
      const createPool = factory.createPool(mirrored.address, [])
      await expect(createPool).revertedWith('HousecatFactory: paused')
    })

    it('should create a pool instance with correct initial state', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const [poolAddress] = await factory.getPools(0, 1)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)

      // signer is the owner of the pool
      expect(await instance.owner()).equal(signer.address)

      // mirrored address
      expect(await instance.mirrored()).equal(mirrored.address)

      // name and symbol
      expect(await instance.name()).equal('Housecat Pool 1')
      expect(await instance.symbol()).equal('HCAT-PP')
    })

    it('should succeed to make an initial deposit on pool creation', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'WETH', 'WETH', 18, 0)
      await weth.mint(mirrored.address, parseEther('10'))
      const wethPriceFeed = await mockPriceFeed(signer, parseUnits('1', 8), 8)
      const { factory, adapters } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: weth.address,
        assets: [weth.address],
        assetsMeta: [
          {
            decimals: await weth.decimals(),
            priceFeed: wethPriceFeed.address,
          },
        ],
      })
      const amountDeposit = parseEther('5')
      const tx = factory.connect(mirrorer).createPool(
        mirrored.address,
        [
          {
            adapter: adapters.wethAdapter.address,
            data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
          },
        ],
        { value: amountDeposit }
      )

      await tx

      const [poolAddress] = await factory.getPools(0, 1)

      const pool = await ethers.getContractAt('HousecatPool', poolAddress)

      // tx should emit DepositToPool event with correct args
      expect(tx).emit(pool, 'DepositToPool').withArgs(parseEther('5'), parseEther('5'), mirrorer.address)

      // pool should hold 5 WETH
      expect(await weth.balanceOf(poolAddress)).equal(parseEther('5'))

      // sender should hold 5 pool tokens
      expect(await pool.balanceOf(mirrorer.address)).equal(parseEther('5'))
    })

    it('should fail to initialize a second time', async () => {
      const [signer, treasury, mirrorer, otherUser, mirrored] = await ethers.getSigners()
      const { mgmt, factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const [poolAddress] = await factory.getPools(0, 1)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)
      const init = instance.initialize(otherUser.address, factory.address, mgmt.address, mirrored.address, 0)
      await expect(init).revertedWith('HousecatPool: already initialized')
    })

    it('should fail to create a pool if the mirrored user already has a pool', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const createSecond = factory.connect(mirrorer).createPool(mirrored.address, [])
      await expect(createSecond).revertedWith('HousecatFactory: already mirrored')
    })

    it('should fail to create a pool that mirrors another pool', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const poolAddress = await factory.getPoolByMirrored(mirrored.address)
      const createSecond = factory.connect(mirrorer).createPool(poolAddress, [])
      await expect(createSecond).revertedWith('HousecatFactory: mirrored is pool')
    })
  })

  describe('updateUserSettings', () => {
    it('should fail when paused', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mgmt, factory } = await mockHousecatAndPool({ signer, mirrored })
      await mgmt.connect(signer).emergencyPause()
      const update = factory.connect(mirrored).updateUserSettings({
        managementFee: 0,
        performanceFee: 0,
      })
      await expect(update).revertedWith('HousecatFactory: paused')
    })

    it('should update settings of the caller when called with valid values', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mgmt, factory } = await mockHousecatAndPool({ signer, mirrored })
      const maxMgmtFee = (await mgmt.getManagementFee()).maxFee
      const maxPerfFee = (await mgmt.getPerformanceFee()).maxFee
      await factory.connect(mirrored).updateUserSettings({
        managementFee: maxMgmtFee,
        performanceFee: maxPerfFee,
      })
      const newSettings = await factory.getUserSettings(mirrored.address)
      expect(newSettings.managementFee).equal(maxMgmtFee)
      expect(newSettings.performanceFee).equal(maxPerfFee)
    })

    it('should emit UpdateUserSettings event', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mgmt, factory } = await mockHousecatAndPool({ signer, mirrored })
      const maxMgmtFee = (await mgmt.getManagementFee()).maxFee
      const maxPerfFee = (await mgmt.getPerformanceFee()).maxFee
      const update = factory.connect(mirrored).updateUserSettings({
        managementFee: maxMgmtFee,
        performanceFee: maxPerfFee,
      })
      await expect(update).emit(factory, 'UpdateUserSettings')
    })

    it('should settle management fee if user settings are updated', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, mgmt, factory, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8),
          maxFee: parseUnits('0.1', 8),
          protocolTax: 0,
        },
      })

      // make a deposit
      const depositAmount = parseEther('5')
      await pool.connect(signer).deposit(
        signer.address,
        [
          {
            adapter: adapters.wethAdapter.address,
            data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [depositAmount]),
          },
        ],
        { value: depositAmount }
      )

      // wait 10 days to accrue management fee
      await increaseTime(10 * DAYS)
      expect(await pool.getAccruedManagementFee()).not.equal(0)

      // update settings
      const update = factory.connect(mirrored).updateUserSettings({
        managementFee: (await mgmt.getManagementFee()).maxFee,
        performanceFee: (await mgmt.getPerformanceFee()).maxFee,
      })

      // ManagementFeeCheckpointUpdated should be emitted
      await expect(update).emit(pool, 'ManagementFeeCheckpointUpdated')

      // accrued fees shold be zero
      expect(await pool.getAccruedManagementFee()).equal(0)
    })

    it('should settle performance fee if user settings are updated', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, mgmt, factory, adapters } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.1', 8),
          maxFee: parseUnits('0.1', 8),
          protocolTax: 0,
        },
      })

      // make a deposit
      const depositAmount = parseEther('5')
      await pool.connect(signer).deposit(
        signer.address,
        [
          {
            adapter: adapters.wethAdapter.address,
            data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [depositAmount]),
          },
        ],
        { value: depositAmount }
      )

      // change price feed so that the value is 10% higher
      const priceFeed2 = await mockPriceFeed(signer, ethers.utils.parseEther('1.1'), 18)
      const weth = await mgmt.weth()
      const currentMeta = await mgmt.getTokenMeta(weth)
      await mgmt.connect(signer).setTokenMeta(weth, {
        ...currentMeta,
        priceFeed: priceFeed2.address,
      })

      // update settings
      const update = factory.connect(mirrored).updateUserSettings({
        managementFee: (await mgmt.getManagementFee()).maxFee,
        performanceFee: (await mgmt.getPerformanceFee()).maxFee,
      })

      // PerformanceFeeHighWatermarkUpdated shold be emitted
      await expect(update).emit(pool, 'PerformanceFeeHighWatermarkUpdated')

      // accrued fees shold be zero
      expect(await pool.getAccruedPerformanceFee()).equal(0)
    })

    it('should fail to update if managementFee is higher than maxManagementFee', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const maxFee = parseUnits('0.1', 8) // 10%
      const { factory } = await mockHousecatAndPool({
        signer,
        mirrored,
        managementFee: {
          defaultFee: parseUnits('0.01', 8),
          maxFee,
          protocolTax: 0,
        },
      })

      const update = factory.connect(mirrored).updateUserSettings({
        managementFee: maxFee.add(1),
        performanceFee: 0,
      })
      await expect(update).revertedWith('HousecatFactory: managementFee too high')
    })

    it('should fail to update if performanceFee is higher than maxPerformanceFee', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const maxFee = parseUnits('0.1', 8) // 10%
      const { factory } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.01', 8),
          maxFee,
          protocolTax: 0,
        },
      })
      const update = factory.connect(mirrored).updateUserSettings({
        managementFee: 0,
        performanceFee: maxFee.add(1),
      })
      await expect(update).revertedWith('HousecatFactory: performanceFee too high')
    })
  })

  describe('getPool', async () => {
    const [signer, treasury, mirrorer, otherUser, mirrored] = await ethers.getSigners()
    const { mgmt, factory } = await deployHousecat({
      signer,
      treasury: treasury.address,
      weth: ethers.constants.AddressZero,
    })
    await factory.connect(mirrorer).createPool(mirrored.address, [])
    const [poolAddress] = await factory.getPools(0, 1)
    const instance = await ethers.getContractAt('HousecatPool', poolAddress)
    const init = instance.initialize(otherUser.address, factory.address, mgmt.address, mirrored.address, 0)
    await expect(init).revertedWith('HousecatPool: already initialized')
  })
})
