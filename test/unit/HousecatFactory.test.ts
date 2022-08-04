import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployHousecat } from '../../utils/deploy-contracts'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { mockPriceFeed, mockWETH } from '../../utils/mock-defi'
import mockHousecatAndPool from '../utils/mock-housecat-and-pool'
import { DAYS, increaseTime, SECONDS } from '../../utils/evm'

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
      const { factory, mgmt } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.updateMinInitialDepositAmount(0)
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const [poolAddress] = await factory.getPools(0, 1)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)

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
      const { factory, adapters, mgmt } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: weth.address,
        assets: [weth.address],
        assetsMeta: [
          {
            decimals: await weth.decimals(),
            priceFeed: wethPriceFeed.address,
            delisted: false,
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

      // user settings have default values
      const pendingUserSettings = await factory.getPendingUserSettings(mirrored.address)
      const userSettings = await factory.getUserSettings(mirrored.address)
      const defaultMgmtFee = (await mgmt.getManagementFee()).defaultFee
      const defaultPerfFee = (await mgmt.getPerformanceFee()).defaultFee

      expect(pendingUserSettings.managementFee).equal(defaultMgmtFee)
      expect(pendingUserSettings.performanceFee).equal(defaultPerfFee)
      expect(userSettings.managementFee).equal(defaultMgmtFee)
      expect(userSettings.performanceFee).equal(defaultPerfFee)
    })

    it('should fail to initialize a second time', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { mgmt, factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.updateMinInitialDepositAmount(0)
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const [poolAddress] = await factory.getPools(0, 1)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)
      const init = instance.initialize(factory.address, mgmt.address, mirrored.address, 0)
      await expect(init).revertedWith('HousecatPool: already initialized')
    })

    it('should fail to create a pool if the mirrored user already has a pool', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { factory, mgmt } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.updateMinInitialDepositAmount(0)
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const createSecond = factory.connect(mirrorer).createPool(mirrored.address, [])
      await expect(createSecond).revertedWith('HousecatFactory: already mirrored')
    })

    it('should fail to create a pool that mirrors another pool', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { factory, mgmt } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.updateMinInitialDepositAmount(0)
      await factory.connect(mirrorer).createPool(mirrored.address, [])
      const poolAddress = await factory.getPoolByMirrored(mirrored.address)
      const createSecond = factory.connect(mirrorer).createPool(poolAddress, [])
      await expect(createSecond).revertedWith('HousecatFactory: mirrored is pool')
    })

    it('should fail if initial deposit value is too small', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
      const { factory, mgmt } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.updateMinInitialDepositAmount(parseEther('1'))
      const createPool = factory.connect(mirrorer).createPool(mirrored.address, [])
      await expect(createPool).revertedWith('HousecatFactory: insuff. initial deposit')
    })
  })

  describe('initiateUpdateUserSettings', () => {
    it('should fail when paused', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mgmt, factory } = await mockHousecatAndPool({ signer, mirrored })
      await mgmt.connect(signer).emergencyPause()
      const update = factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: 0,
        performanceFee: 0,
      })
      await expect(update).revertedWith('HousecatFactory: paused')
    })

    it('should update pendingUserSettings of the caller when called with valid values', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mgmt, factory } = await mockHousecatAndPool({ signer, mirrored })
      const maxMgmtFee = (await mgmt.getManagementFee()).maxFee
      const maxPerfFee = (await mgmt.getPerformanceFee()).maxFee
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: maxMgmtFee,
        performanceFee: maxPerfFee,
      })
      const pendingSettings = await factory.getPendingUserSettings(mirrored.address)
      expect(pendingSettings.managementFee).equal(maxMgmtFee)
      expect(pendingSettings.performanceFee).equal(maxPerfFee)
      expect(pendingSettings.createdAt).gt(0)
    })

    it('should emit InitiateUpdateUserSettings event', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { mgmt, factory } = await mockHousecatAndPool({ signer, mirrored })
      const maxMgmtFee = (await mgmt.getManagementFee()).maxFee
      const maxPerfFee = (await mgmt.getPerformanceFee()).maxFee
      const tx = factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: maxMgmtFee,
        performanceFee: maxPerfFee,
      })
      await expect(tx).emit(factory, 'InitiateUpdateUserSettings')
    })

    it('should fail if managementFee is higher than maxManagementFee', async () => {
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

      const tx = factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: maxFee.add(1),
        performanceFee: 0,
      })
      await expect(tx).revertedWith('HousecatFactory: managementFee too high')
    })

    it('should fail if performanceFee is higher than maxPerformanceFee', async () => {
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
      const tx = factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: 0,
        performanceFee: maxFee.add(1),
      })
      await expect(tx).revertedWith('HousecatFactory: performanceFee too high')
    })
  })

  describe('updateUserSettings', () => {
    it('should fail if pending settings are time locked', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const maxFee = parseUnits('0.1', 8) // 10%
      const { factory, pool, adapters, mgmt } = await mockHousecatAndPool({ signer, mirrored })

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

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: 0,
        performanceFee: maxFee,
      })

      const timelock = await mgmt.userSettingsTimeLockSeconds()
      await increaseTime(timelock.toNumber() * SECONDS - 100)

      const tx = factory.connect(mirrored).updateUserSettings()
      await expect(tx).revertedWith('HousecatFactory: user settings locked')
    })

    it('should update userSettings if pending data is valid and not locked', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const maxFee = parseUnits('0.1', 8) // 10%
      const { factory, pool, adapters, mgmt } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.01', 8),
          maxFee,
          protocolTax: 0,
        },
        managementFee: {
          defaultFee: parseUnits('0.01', 8),
          maxFee,
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

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: maxFee,
        performanceFee: maxFee,
      })

      // wait until time lock opens
      const timelock = await mgmt.userSettingsTimeLockSeconds()
      await increaseTime(timelock.toNumber() * SECONDS + 1)

      // complete the update
      await factory.connect(mirrored).updateUserSettings()

      // check the results
      const userSettings = await factory.getUserSettings(mirrored.address)
      expect(userSettings.managementFee).eq(maxFee)
      expect(userSettings.performanceFee).eq(maxFee)
    })

    it('should ignore time lock if pool has 0 totalSupply', async () => {
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
        managementFee: {
          defaultFee: parseUnits('0.01', 8),
          maxFee,
          protocolTax: 0,
        },
      })

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: maxFee,
        performanceFee: maxFee,
      })

      // do not wait until time lock opens

      // complete the update
      await factory.connect(mirrored).updateUserSettings()

      // check the results
      const userSettings = await factory.getUserSettings(mirrored.address)
      expect(userSettings.managementFee).eq(maxFee)
      expect(userSettings.performanceFee).eq(maxFee)
    })

    it('should ignore time lock if none of the fees is increased', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const maxFee = parseUnits('0.1', 8) // 10%
      const { factory } = await mockHousecatAndPool({
        signer,
        mirrored,
        performanceFee: {
          defaultFee: parseUnits('0.1', 8),
          maxFee,
          protocolTax: 0,
        },
        managementFee: {
          defaultFee: parseUnits('0.1', 8),
          maxFee,
          protocolTax: 0,
        },
      })

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: parseUnits('0.05', 8),
        performanceFee: parseUnits('0.025', 8),
      })

      // do not wait until time lock opens

      // complete the update
      await factory.connect(mirrored).updateUserSettings()

      // check the results
      const userSettings = await factory.getUserSettings(mirrored.address)
      expect(userSettings.managementFee).eq(parseUnits('0.05', 8))
      expect(userSettings.performanceFee).eq(parseUnits('0.025', 8))
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

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: (await mgmt.getManagementFee()).maxFee,
        performanceFee: (await mgmt.getPerformanceFee()).maxFee,
      })

      // wait until time lock opens
      const timelock = await mgmt.userSettingsTimeLockSeconds()
      await increaseTime(timelock.toNumber() * SECONDS + 1)

      // complete update
      const update = factory.connect(mirrored).updateUserSettings()

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

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: (await mgmt.getManagementFee()).maxFee,
        performanceFee: (await mgmt.getPerformanceFee()).maxFee,
      })

      // wait until time lock opens
      const timelock = await mgmt.userSettingsTimeLockSeconds()
      await increaseTime(timelock.toNumber() * SECONDS + 1)

      // complete update
      const update = factory.connect(mirrored).updateUserSettings()

      // PerformanceFeeHighWatermarkUpdated shold be emitted
      await expect(update).emit(pool, 'PerformanceFeeHighWatermarkUpdated')

      // accrued fees shold be zero
      expect(await pool.getAccruedPerformanceFee()).equal(0)
    })

    it('should emit UpdateUserSettings event', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { factory } = await mockHousecatAndPool({ signer, mirrored })

      // initiate update
      await factory.connect(mirrored).initiateUpdateUserSettings({
        createdAt: 0,
        managementFee: parseUnits('0.05', 8),
        performanceFee: parseUnits('0.025', 8),
      })

      // complete the update
      const tx = await factory.connect(mirrored).updateUserSettings()

      await expect(tx).emit(factory, 'UpdateUserSettings')
    })
  })

  describe('getPool', async () => {
    const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
    const { mgmt, factory } = await deployHousecat({
      signer,
      treasury: treasury.address,
      weth: ethers.constants.AddressZero,
    })
    await mgmt.updateMinInitialDepositAmount(0)
    await factory.connect(mirrorer).createPool(mirrored.address, [])
    const [poolAddress] = await factory.getPools(0, 1)
    const instance = await ethers.getContractAt('HousecatPool', poolAddress)
    const init = instance.initialize(factory.address, mgmt.address, mirrored.address, 0)
    await expect(init).revertedWith('HousecatPool: already initialized')
  })
})
