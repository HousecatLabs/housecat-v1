import { expect } from 'chai'
import { ethers } from 'hardhat'
import { deployManagement } from '../utils/deploy-contracts'
import { mockPriceFeed, mockToken, mockWETH } from '../utils/mock-defi'

describe('HousecatManagement', () => {
  describe('public state variables', () => {
    it('should have correct address for weth', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      expect(await mgmt.weth()).equal(weth.address)
    })

    it('should have correct address for treasury', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      expect(await mgmt.treasury()).equal(treasury.address)
    })
  })

  describe('emergencyPause', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const pause = mgmt.connect(otherUser).emergencyPause()
      await expect(pause).revertedWith('Ownable: caller is not the owner')
    })

    it('sets paused to true', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      await mgmt.connect(signer).emergencyPause()
      expect(await mgmt.paused()).equal(true)
    })
  })

  describe('emergencyUnpause', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const pause = mgmt.connect(otherUser).emergencyUnpause()
      await expect(pause).revertedWith('Ownable: caller is not the owner')
    })

    it('sets paused to false', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      await mgmt.connect(signer).emergencyPause()
      await mgmt.connect(signer).emergencyUnpause()
      expect(await mgmt.paused()).equal(false)
    })
  })

  describe('updateTreasury', async () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tx = mgmt.connect(otherUser).updateTreasury(otherUser.address)
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })
    it('updates treasury address and emits UpdateTreasury event', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tx = mgmt.connect(signer).updateTreasury(otherUser.address)
      await expect(tx).emit(mgmt, 'UpdateTreasury').withArgs(otherUser.address)
      expect(await mgmt.treasury()).equal(otherUser.address)
    })
  })

  describe('updateWETH', async () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth1 = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const weth2 = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth1.address)
      const tx = mgmt.connect(otherUser).updateWETH(weth2.address)
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })
    it('updates weth address and emits UpdateWETH event', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth1 = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const weth2 = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth1.address)
      const tx = mgmt.connect(signer).updateWETH(weth2.address)
      await expect(tx).emit(mgmt, 'UpdateWETH').withArgs(weth2.address)
      expect(await mgmt.weth()).equal(weth2.address)
    })
  })

  describe('getTokenMeta', () => {
    it('should be empty for any unset token', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tokenMeta = await mgmt.getTokenMeta(weth.address)
      expect(tokenMeta.priceFeed).equal(ethers.constants.AddressZero)
    })
  })

  describe('setSupportedTokens', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tx = mgmt.connect(otherUser).setSupportedTokens([weth.address])
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it('should set the list of supported tokens if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedTokens([weth.address, otherToken.address])
      expect(await mgmt.getSupportedTokens()).have.members([weth.address, otherToken.address])

      await mgmt.connect(signer).setSupportedTokens([weth.address])
      expect(await mgmt.getSupportedTokens()).have.members([weth.address])
    })
  })

  describe('isTokenSupported', () => {
    it('should return correctly whether or not token is included in supportedTokens list', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      expect(await mgmt.isTokenSupported(otherToken.address)).equal(false)
      await mgmt.connect(signer).setSupportedTokens([weth.address, otherToken.address])
      expect(await mgmt.isTokenSupported(otherToken.address)).equal(true)
    })
  })

  describe('setTokenMeta', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const setTokenMeta = mgmt.connect(otherUser).setTokenMeta(weth.address, {
        priceFeed: ethers.constants.AddressZero,
        decimals: 18,
      })
      await expect(setTokenMeta).revertedWith('Ownable: caller is not the owner')
    })

    it('sets values correctly if called by the owner', async () => {
      const [signer, treasury, otherAccount] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      await mgmt.connect(signer).setTokenMeta(weth.address, {
        priceFeed: otherAccount.address,
        decimals: 18,
      })
      const tokenMeta = await mgmt.getTokenMeta(weth.address)
      expect(tokenMeta.priceFeed).equal(otherAccount.address)
    })
  })

  describe('setTokenMetaMany', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      const setTokenMetaMany = mgmt.connect(otherUser).setTokenMetaMany(
        [weth.address, otherToken.address],
        [
          {
            priceFeed: ethers.constants.AddressZero,
            decimals: 18,
          },
          {
            priceFeed: ethers.constants.AddressZero,
            decimals: 18,
          },
        ]
      )
      await expect(setTokenMetaMany).revertedWith('Ownable: caller is not the owner')
    })

    it('fails if arrays have different lengths', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const setTokenMetaMany = mgmt.connect(signer).setTokenMetaMany(
        [weth.address],
        [
          {
            priceFeed: ethers.constants.AddressZero,
            decimals: 18,
          },
          {
            priceFeed: ethers.constants.AddressZero,
            decimals: 18,
          },
        ]
      )
      await expect(setTokenMetaMany).revertedWith('array size mismatch')
    })

    it('sets values correctly if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const feed1 = await mockPriceFeed(signer, 1e8, 8)
      const feed2 = await mockPriceFeed(signer, 2e8, 8)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setTokenMetaMany(
        [weth.address, otherToken.address],
        [
          {
            priceFeed: feed1.address,
            decimals: 18,
          },
          {
            priceFeed: feed2.address,
            decimals: 6,
          },
        ]
      )

      const meta1 = await mgmt.getTokenMeta(weth.address)
      expect(meta1.priceFeed).equal(feed1.address)
      expect(meta1.decimals).equal(18)

      const meta2 = await mgmt.getTokenMeta(otherToken.address)
      expect(meta2.decimals).equal(6)
    })

    describe('setAdapterEnabled', () => {
      it('only owner allowed to call', async () => {
        const [signer, treasury, otherUser] = await ethers.getSigners()
        const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
        const mgmt = await deployManagement(signer, treasury.address, weth.address)
        const setAdapterEnabled = mgmt.connect(otherUser).setAdapterEnabled(weth.address, true)
        await expect(setAdapterEnabled).revertedWith('Ownable: caller is not the owner')
      })

      it('sets value correctly if called by the owner', async () => {
        const [signer, treasury] = await ethers.getSigners()
        const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
        const mgmt = await deployManagement(signer, treasury.address, weth.address)
        // weth contract wouldn't be an adapter in reality but let's use it for the sake of testing
        expect(await mgmt.isAdapterEnabled(weth.address)).equal(false)
        await mgmt.connect(signer).setAdapterEnabled(weth.address, true)
        expect(await mgmt.isAdapterEnabled(weth.address)).equal(true)
      })
    })

    describe('setIntegrationEnabled', () => {
      it('only owner allowed to call', async () => {
        const [signer, treasury, otherUser] = await ethers.getSigners()
        const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
        const mgmt = await deployManagement(signer, treasury.address, weth.address)
        const setIntegrationEnabled = mgmt.connect(otherUser).setIntegrationEnabled(weth.address, true)
        await expect(setIntegrationEnabled).revertedWith('Ownable: caller is not the owner')
      })

      it('sets value correctly if called by the owner', async () => {
        const [signer, treasury] = await ethers.getSigners()
        const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
        const mgmt = await deployManagement(signer, treasury.address, weth.address)
        expect(await mgmt.isIntegrationEnabled(weth.address)).equal(false)
        await mgmt.connect(signer).setIntegrationEnabled(weth.address, true)
        expect(await mgmt.isIntegrationEnabled(weth.address)).equal(true)
      })
    })
  })
})
