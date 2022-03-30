import { ethers } from 'hardhat'
import { expect } from 'chai'
import { deployFactory, deployManagement, deployPool } from '../utils/deploy-contracts'
import { mockWETH } from '../utils/mock-contracts'
import { HousecatFactory, HousecatManagement } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

const deploy = async (
  signer: SignerWithAddress,
  treasury: SignerWithAddress
): Promise<[HousecatManagement, HousecatFactory]> => {
  const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
  const pool = await deployPool(signer)
  const management = await deployManagement(signer, treasury.address, weth.address)
  const factory = await deployFactory(signer, management.address, pool.address)
  return [management, factory]
}

describe('HousecatFactory', () => {
  describe('deploy', () => {
    it('should deploy successfully', async () => {
      const [signer, treasury] = await ethers.getSigners()
      await deploy(signer, treasury)
    })
  })

  describe('createPool', () => {
    it('should fail when paused', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const [management, factory] = await deploy(signer, treasury)
      await management.connect(signer).emergencyPause()
      const createPool = factory.createPool()
      await expect(createPool).revertedWith('HousecatFactory: paused')
    })

    it('should create a pool instance with correct initial state', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const factory = (await deploy(signer, treasury))[1]
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
      const [management, factory] = await deploy(signer, treasury)
      await factory.connect(manager).createPool()
      const poolAddress = await factory.getPool(0)
      const instance = await ethers.getContractAt('HousecatPool', poolAddress)
      const init = instance.initialize(otherUser.address, factory.address, management.address)
      await expect(init).revertedWith('HousecatPool: already initialized')
    })
  })

  describe('getPool', async () => {
    const [signer, treasury, manager, otherUser] = await ethers.getSigners()
    const [management, factory] = await deploy(signer, treasury)
    await factory.connect(manager).createPool()
    const poolAddress = await factory.getPool(0)
    const instance = await ethers.getContractAt('HousecatPool', poolAddress)
    const init = instance.initialize(otherUser.address, factory.address, management.address)
    await expect(init).revertedWith('HousecatPool: already initialized')
  })
})
