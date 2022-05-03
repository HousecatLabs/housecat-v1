import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployHousecat } from '../../utils/deploy-contracts'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import { mockPriceFeed, mockWETH } from '../../utils/mock-defi'

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
      expect(await instance.name()).equal('Housecat Pool Position')
      expect(await instance.symbol()).equal('HCAT-PP')
    })

    it('should succeed to make an initial deposit on pool creation', async () => {
      const [signer, treasury, mirrorer, mirrored] = await ethers.getSigners()
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
      const tx = factory.connect(mirrorer).createPool(mirrored.address, [], { value: parseEther('5') })

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
      const init = instance.initialize(otherUser.address, factory.address, mgmt.address, mirrored.address)
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
    const init = instance.initialize(otherUser.address, factory.address, mgmt.address, mirrored.address)
    await expect(init).revertedWith('HousecatPool: already initialized')
  })
})
