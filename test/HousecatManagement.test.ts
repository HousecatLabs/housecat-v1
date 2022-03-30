import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { HousecatManagement } from '../typechain-types'
import { deployManagement } from '../utils/deploy-contracts'
import { mockPriceFeed, mockToken, mockWETH } from '../utils/mock-contracts'

const deploy = async (signer: SignerWithAddress, treasury: SignerWithAddress): Promise<HousecatManagement> => {
  const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
  return await deployManagement(signer, treasury.address, weth.address)
}

describe('HousecatManagement', () => {
  describe('deploy', () => {
    it('should deploy successfully', async () => {
      const [signer, treasury] = await ethers.getSigners()
      await deploy(signer, treasury)
    })
  })

  describe('public state variables', () => {
    it('should have correct address for weth', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      expect(await mgmt.weth()).equal(weth.address)
    })

    it('should have correct address for treasury', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      expect(await mgmt.treasury()).equal(treasury.address)
    })
  })

  describe('emergencyPause', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const pause = mgmt.connect(otherUser).emergencyPause()
      await expect(pause).revertedWith('Ownable: caller is not the owner')
    })

    it('sets paused to true', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      await mgmt.connect(signer).emergencyPause()
      expect(await mgmt.paused()).equal(true)
    })
  })

  describe('emergencyUnpause', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const pause = mgmt.connect(otherUser).emergencyUnpause()
      await expect(pause).revertedWith('Ownable: caller is not the owner')
    })

    it('sets paused to false', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      await mgmt.connect(signer).emergencyPause()
      await mgmt.connect(signer).emergencyUnpause()
      expect(await mgmt.paused()).equal(false)
    })
  })

  describe('getTokenMeta', () => {
    it('should be empty for any unset token', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tokenMeta = await mgmt.getTokenMeta(weth.address)
      expect(tokenMeta.priceFeed).equal(ethers.constants.AddressZero)
      expect(tokenMeta.maxSlippage).equal(0)
    })
  })

  describe('setSupportedTokens', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const weth = await mgmt.weth()
      const tx = mgmt.connect(otherUser).setSupportedTokens([weth])
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it('should set the list of supported tokens if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const weth = await mgmt.weth()
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedTokens([weth, otherToken.address])
      expect(await mgmt.getSupportedTokens()).have.members([weth, otherToken.address])

      await mgmt.connect(signer).setSupportedTokens([weth])
      expect(await mgmt.getSupportedTokens()).have.members([weth])
    })
  })

  describe('setTokenMeta', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const weth = await mgmt.weth()
      const setTokenMeta = mgmt.connect(otherUser).setTokenMeta(weth, {
        priceFeed: ethers.constants.AddressZero,
        maxSlippage: 0,
        decimals: 18,
      })
      await expect(setTokenMeta).revertedWith('Ownable: caller is not the owner')
    })

    it('sets values correctly if called by the owner', async () => {
      const [signer, treasury, otherAccount] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const percent100 = await mgmt.getPercent100()
      const weth = await mgmt.weth()
      await mgmt.connect(signer).setTokenMeta(weth, {
        priceFeed: otherAccount.address,
        maxSlippage: percent100.div(100),
        decimals: 18,
      })
      const tokenMeta = await mgmt.getTokenMeta(weth)
      expect(tokenMeta.priceFeed).equal(otherAccount.address)
      expect(tokenMeta.maxSlippage).equal(percent100.div(100))
    })
  })

  describe('setTokenMetaMany', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const weth = await mgmt.weth()
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      const setTokenMetaMany = mgmt.connect(otherUser).setTokenMetaMany([weth, otherToken.address], [
        {
          priceFeed: ethers.constants.AddressZero,
          maxSlippage: 0,
          decimals: 18,
        },
        {
          priceFeed: ethers.constants.AddressZero,
          maxSlippage: 0,
          decimals: 18,
        },
      ])
      await expect(setTokenMetaMany).revertedWith('Ownable: caller is not the owner')
    })

    it('fails if arrays have different lengths', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const weth = await mgmt.weth()
      const setTokenMetaMany = mgmt.connect(signer).setTokenMetaMany([weth], [
        {
          priceFeed: ethers.constants.AddressZero,
          maxSlippage: 0,
          decimals: 18,
        },
        {
          priceFeed: ethers.constants.AddressZero,
          maxSlippage: 0,
          decimals: 18,
        },
      ])
      await expect(setTokenMetaMany).revertedWith('array size mismatch')
    })

    it('sets values correctly if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const mgmt = await deploy(signer, treasury)
      const weth = await mgmt.weth()
      const feed1 = await mockPriceFeed(signer, 1e8, 8)
      const feed2 = await mockPriceFeed(signer, 2e8, 8)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setTokenMetaMany([weth, otherToken.address], [
        {
          priceFeed: feed1.address,
          maxSlippage: 0,
          decimals: 18,
        },
        {
          priceFeed: feed2.address,
          maxSlippage: 0,
          decimals: 6,
        },
      ])

      const meta1 = await mgmt.getTokenMeta(weth)
      expect(meta1.priceFeed).equal(feed1.address)
      expect(meta1.decimals).equal(18)

      const meta2 = await mgmt.getTokenMeta(otherToken.address)
      expect(meta2.decimals).equal(6)
    })
  })
})
