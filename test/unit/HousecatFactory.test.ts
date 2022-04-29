import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployHousecat } from '../../utils/deploy-contracts'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { mockPriceFeed, mockWETH } from '../../utils/mock-defi'

describe('HousecatFactory', () => {
  describe('createPool', () => {
    it('should fail when paused', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const { mgmt, factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await mgmt.connect(signer).emergencyPause()
      const createPool = factory.createPool([])
      await expect(createPool).revertedWith('HousecatFactory: paused')
    })

    it('should create a pool instance with correct initial state', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await factory.connect(manager).createPool([])
      const poolAddress = await factory.getPool(0)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)

      // manager is the owner
      expect(await instance.owner()).equal(manager.address)

      // name and symbol
      expect(await instance.name()).equal('Housecat Pool Position')
      expect(await instance.symbol()).equal('HCAT-PP')
    })

    it('should succeed to make an initial deposit on pool creation', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'WETH', 'WETH', 18, 0)
      const wethPriceFeed = await mockPriceFeed(signer, parseUnits('1', 8), 8)
      const { factory } = await deployHousecat({
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
      await factory.connect(manager).createPool([], { value: parseEther('5') })
      const poolAddress = await factory.getPool(0)

      // pool should hold 5 WETH
      expect(await weth.balanceOf(poolAddress)).equal(parseEther('5'))

      // sender should hold 5 pool tokens
      const pool = await ethers.getContractAt('HousecatPool', poolAddress)
      console.log(await pool.totalSupply())
      expect(await pool.balanceOf(manager.address)).equal(parseEther('5'))
    })

    it('should fail to initialize a second time', async () => {
      const [signer, treasury, manager, otherUser] = await ethers.getSigners()
      const { mgmt, factory } = await deployHousecat({
        signer,
        treasury: treasury.address,
        weth: ethers.constants.AddressZero,
      })
      await factory.connect(manager).createPool([])
      const poolAddress = await factory.getPool(0)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)
      const init = instance.initialize(otherUser.address, factory.address, mgmt.address)
      await expect(init).revertedWith('HousecatPool: already initialized')
    })
  })

  describe('getPool', async () => {
    const [signer, treasury, manager, otherUser] = await ethers.getSigners()
    const { mgmt, factory } = await deployHousecat({
      signer,
      treasury: treasury.address,
      weth: ethers.constants.AddressZero,
    })
    await factory.connect(manager).createPool([])
    const poolAddress = await factory.getPool(0)
    const instance = await ethers.getContractAt('HousecatPool', poolAddress)
    const init = instance.initialize(otherUser.address, factory.address, mgmt.address)
    await expect(init).revertedWith('HousecatPool: already initialized')
  })
})
