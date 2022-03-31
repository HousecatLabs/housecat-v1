import { ethers } from 'hardhat'
import { expect } from 'chai'
import mockHousecat from '../utils/mock-housecat'


describe('HousecatFactory', () => {
  describe('createPool', () => {
    it('should fail when paused', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const [management, factory] = await mockHousecat({ signer, treasury: treasury.address })
      await management.connect(signer).emergencyPause()
      const createPool = factory.createPool()
      await expect(createPool).revertedWith('HousecatFactory: paused')
    })

    it('should create a pool instance with correct initial state', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const factory = (await mockHousecat({ signer, treasury: treasury.address }))[1]
      await factory.connect(manager).createPool()
      const poolAddress = await factory.getPool(0)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)

      // manager is the owner
      expect(await instance.owner()).equal(manager.address)

      // name and symbol
      expect(await instance.name()).equal('Housecat Pool Position')
      expect(await instance.symbol()).equal('HCAT-PP')
    })

    it('should fail to initialize a second time', async () => {
      const [signer, treasury, manager, otherUser] = await ethers.getSigners()
      const [management, factory] = await mockHousecat({ signer, treasury: treasury.address })
      await factory.connect(manager).createPool()
      const poolAddress = await factory.getPool(0)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)
      const init = instance.initialize(otherUser.address, factory.address, management.address)
      await expect(init).revertedWith('HousecatPool: already initialized')
    })
  })

  describe('getPool', async () => {
    const [signer, treasury, manager, otherUser] = await ethers.getSigners()
    const [management, factory] = await mockHousecat({ signer, treasury: treasury.address })
    await factory.connect(manager).createPool()
    const poolAddress = await factory.getPool(0)
    const instance = await ethers.getContractAt('HousecatPool', poolAddress)
    const init = instance.initialize(otherUser.address, factory.address, management.address)
    await expect(init).revertedWith('HousecatPool: already initialized')
  })
})
