import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { HousecatManagement } from '../typechain-types'
import { deployManagement } from '../utils/deploy-contracts'
import { mockToken, mockWETH } from '../utils/mock-contracts'

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
      const tokenData = await mgmt.getTokenMeta(weth)
      expect(tokenData.priceFeed).equal(otherAccount.address)
      expect(tokenData.maxSlippage).equal(percent100.div(100))
    })
  })
})
