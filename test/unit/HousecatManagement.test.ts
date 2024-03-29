import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers } from 'hardhat'
import { deployManagement } from '../../utils/deploy-contracts'
import { mockPriceFeed, mockToken, mockWETH } from '../../utils/mock-defi'

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

  describe('updateMinInitialDepositAmount', async () => {
    it('should fail if caller is not the owner', async () => {
      const [signer, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(otherUser).updateMinInitialDepositAmount(0)
      await expect(update).to.revertedWith('Ownable: caller is not the owner')
    })

    it('should update minInitialDepositValue successfully when called by the owner', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      await mgmt.connect(signer).updateMinInitialDepositAmount(ethers.utils.parseEther('1000'))
      expect(await mgmt.minInitialDepositAmount()).equal(ethers.utils.parseEther('1000'))
    })

    it('should emit UpdateMinInitialDeposit event', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(signer).updateMinInitialDepositAmount(ethers.utils.parseEther('1000'))
      await expect(update).emit(mgmt, 'UpdateMinInitialDeposit').withArgs(ethers.utils.parseEther('1000'))
    })
  })

  describe('updateUserSettingsTimeLock', async () => {
    it('should fail if caller is not the owner', async () => {
      const [signer, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(otherUser).updateUserSettingsTimeLock(0)
      await expect(update).to.revertedWith('Ownable: caller is not the owner')
    })

    it('should update userSettingsTimeLockSeconds successfully when called by the owner', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      await mgmt.connect(signer).updateUserSettingsTimeLock(3000)
      expect(await mgmt.userSettingsTimeLockSeconds()).equal(3000)
    })

    it('should emit UpdateUserSettingsTimeLock event', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(signer).updateUserSettingsTimeLock(5000)
      await expect(update).emit(mgmt, 'UpdateUserSettingsTimeLock').withArgs(5000)
    })
  })

  describe('setAdapter', async () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const update = mgmt.connect(otherUser).setAdapter(weth.address, true)
      await expect(update).revertedWith('Ownable: caller is not the owner')
    })
    it('sets adapter value and emits SetAdapter event', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const update = mgmt.connect(signer).setAdapter(otherUser.address, true)
      await expect(update).emit(mgmt, 'SetAdapter').withArgs(otherUser.address, true)
      expect(await mgmt.isAdapter(otherUser.address)).equal(true)
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

  describe('setSupportedAssets', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tx = mgmt.connect(otherUser).setSupportedAssets([weth.address])
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it('should set the list of supported assets if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedAssets([weth.address, otherToken.address])
      expect(await mgmt.getSupportedAssets()).have.members([weth.address, otherToken.address])

      await mgmt.connect(signer).setSupportedAssets([weth.address])
      expect(await mgmt.getSupportedAssets()).have.members([weth.address])
    })

    it('emits SetSupportedAssets event', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      const tx = mgmt.connect(signer).setSupportedAssets([weth.address, otherToken.address])
      await expect(tx).emit(mgmt, 'SetSupportedAssets').withArgs([weth.address, otherToken.address])
    })
  })

  describe('setSupportedLoans', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tx = mgmt.connect(otherUser).setSupportedLoans([weth.address])
      await expect(tx).revertedWith('Ownable: caller is not the owner')
    })

    it('should set the list of supported loans if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedLoans([weth.address, otherToken.address])
      expect(await mgmt.getSupportedLoans()).have.members([weth.address, otherToken.address])

      await mgmt.connect(signer).setSupportedLoans([weth.address])
      expect(await mgmt.getSupportedLoans()).have.members([weth.address])
    })

    it('emits SetSupportedLoans event', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Token A', 'TOKENA', 18, ethers.utils.parseEther('1'))
      const tx = mgmt.connect(signer).setSupportedLoans([weth.address, otherToken.address])
      await expect(tx).emit(mgmt, 'SetSupportedLoans').withArgs([weth.address, otherToken.address])
    })
  })

  describe('isAssetSupported', () => {
    it('should return correctly whether or not token is included in supportedAssets list and not delisted', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const otherToken = await mockToken(signer, 'Asset A', 'ASSET_A', 18, ethers.utils.parseEther('1'))
      expect(await mgmt.isAssetSupported(otherToken.address, true)).equal(false)
      await mgmt.connect(signer).setSupportedAssets([weth.address, otherToken.address])
      expect(await mgmt.isAssetSupported(otherToken.address, true)).equal(true)
    })

    it('should return false if token is delisted and exludeDelisted flag is true', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const token = await mockToken(signer, 'Asset A', 'ASSET_A', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedAssets([token.address])
      await mgmt.setTokenMeta(token.address, {
        priceFeed: ethers.constants.AddressZero,
        decimals: 18,
        delisted: true,
      })
      expect(await mgmt.isAssetSupported(token.address, true)).equal(false)
    })

    it('should return true if token is delisted and exludeDelisted flag is false', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const token = await mockToken(signer, 'Asset A', 'ASSET_A', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedAssets([token.address])
      await mgmt.setTokenMeta(token.address, {
        priceFeed: ethers.constants.AddressZero,
        decimals: 18,
        delisted: true,
      })
      expect(await mgmt.isAssetSupported(token.address, false)).equal(true)
    })
  })

  describe('isLoanSupported', () => {
    it('should return correctly whether or not token is included in supportedLoans list and not delisted', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const loanToken = await mockToken(signer, 'Loan A', 'LOANA', 18, ethers.utils.parseEther('1'))
      expect(await mgmt.isLoanSupported(loanToken.address, true)).equal(false)
      await mgmt.connect(signer).setSupportedLoans([loanToken.address])
      expect(await mgmt.isLoanSupported(loanToken.address, true)).equal(true)
    })

    it('should return false if token is delisted and exludeDelisted flag is true', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const token = await mockToken(signer, 'Laon A', 'LOAN_A', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedLoans([token.address])
      await mgmt.setTokenMeta(token.address, {
        priceFeed: ethers.constants.AddressZero,
        decimals: 18,
        delisted: true,
      })
      expect(await mgmt.isLoanSupported(token.address, true)).equal(false)
    })

    it('should return true if token is delisted and exludeDelisted flag is false', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const token = await mockToken(signer, 'Laon A', 'LOAN_A', 18, ethers.utils.parseEther('1'))
      await mgmt.connect(signer).setSupportedLoans([token.address])
      await mgmt.setTokenMeta(token.address, {
        priceFeed: ethers.constants.AddressZero,
        decimals: 18,
        delisted: true,
      })
      expect(await mgmt.isLoanSupported(token.address, false)).equal(true)
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
        delisted: false,
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
        delisted: false,
      })
      const tokenMeta = await mgmt.getTokenMeta(weth.address)
      expect(tokenMeta.priceFeed).equal(otherAccount.address)
    })

    it('emits SetTokenMeta event', async () => {
      const [signer, treasury, otherAccount] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const tx = mgmt.connect(signer).setTokenMeta(weth.address, {
        priceFeed: otherAccount.address,
        decimals: 18,
        delisted: false,
      })
      await expect(tx).emit(mgmt, 'SetTokenMeta')
    })

    it('should change mirrored weights but not pool weights if a token held by both is delisted', async () => {
      // TODO
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
            delisted: false,
          },
          {
            priceFeed: ethers.constants.AddressZero,
            decimals: 18,
            delisted: false,
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
            delisted: false,
          },
          {
            priceFeed: ethers.constants.AddressZero,
            decimals: 18,
            delisted: false,
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
            delisted: false,
          },
          {
            priceFeed: feed2.address,
            decimals: 6,
            delisted: false,
          },
        ]
      )

      const meta1 = await mgmt.getTokenMeta(weth.address)
      expect(meta1.priceFeed).equal(feed1.address)
      expect(meta1.decimals).equal(18)

      const meta2 = await mgmt.getTokenMeta(otherToken.address)
      expect(meta2.decimals).equal(6)
    })
  })

  describe('setSupportedIntegration', () => {
    it('only owner allowed to call', async () => {
      const [signer, treasury, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      const setIntegration = mgmt.connect(otherUser).setSupportedIntegration(weth.address, true)
      await expect(setIntegration).revertedWith('Ownable: caller is not the owner')
    })

    it('sets value correctly if called by the owner', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      expect(await mgmt.isIntegrationSupported(weth.address)).equal(false)
      await mgmt.connect(signer).setSupportedIntegration(weth.address, true)
      expect(await mgmt.isIntegrationSupported(weth.address)).equal(true)
    })

    it('emits SetIntegration event', async () => {
      const [signer, treasury] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, treasury.address, weth.address)
      expect(await mgmt.isIntegrationSupported(weth.address)).equal(false)
      const tx = mgmt.connect(signer).setSupportedIntegration(weth.address, true)
      await expect(tx).emit(mgmt, 'SetIntegration').withArgs(weth.address, true)
    })
  })

  describe('updateMirrorSettings', () => {
    const oneUSD = BigNumber.from((1e18).toString())
    const percent100 = BigNumber.from((1e8).toString())
    const validMirrorSettings = {
      minPoolValue: oneUSD.mul(10),
      minMirroredValue: oneUSD.mul(10),
      maxWeightDifference: percent100.mul(2).div(100),
    }

    it('should update rebalanceSettings successfully when called by the owner with valid values', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      await mgmt.connect(signer).updateMirrorSettings(validMirrorSettings)
      const newSettings = await mgmt.getMirrorSettings()
      expect(newSettings.minPoolValue).equal(validMirrorSettings.minPoolValue)
      expect(newSettings.maxWeightDifference).equal(validMirrorSettings.maxWeightDifference)
    })

    it('should emit UpdateMirrorSettings event', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = await mgmt.connect(signer).updateMirrorSettings(validMirrorSettings)
      await expect(update).emit(mgmt, 'UpdateMirrorSettings')
    })

    it('should fail if caller is not the owner', async () => {
      const [signer, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(otherUser).updateMirrorSettings(validMirrorSettings)
      await expect(update).to.revertedWith('Ownable: caller is not the owner')
    })

    it('should fail if maxWeightDifference is greater than 100%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(signer).updateMirrorSettings({
        ...validMirrorSettings,
        maxWeightDifference: percent100.add(1),
      })
      await expect(update).to.revertedWith('maxWeightDifference > 100%')
    })
  })

  describe('updateRebalanceSettings', () => {
    const percent100 = BigNumber.from((1e8).toString())
    const validRebalanceSettings = {
      reward: percent100.mul(50).div(10000),
      protocolTax: percent100.div(4),
      maxSlippage: percent100.div(100),
      maxCumulativeSlippage: 3e6,
      cumulativeSlippagePeriodSeconds: 0,
      minSecondsBetweenRebalances: 0,
      rebalancers: [ethers.constants.AddressZero],
    }

    it('should update rebalanceSettings successfully when called by the owner with valid values', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      await mgmt.connect(signer).updateRebalanceSettings(validRebalanceSettings)
      const newSettings = await mgmt.getRebalanceSettings()
      expect(newSettings.reward).equal(validRebalanceSettings.reward)
      expect(newSettings.protocolTax).equal(validRebalanceSettings.protocolTax)
      expect(newSettings.rebalancers).have.members([ethers.constants.AddressZero])
    })

    it('should emit UpdateRebalanceSettings event', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = await mgmt.connect(signer).updateRebalanceSettings(validRebalanceSettings)
      await expect(update).emit(mgmt, 'UpdateRebalanceSettings')
    })

    it('should fail if caller is not the owner', async () => {
      const [signer, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(otherUser).updateRebalanceSettings(validRebalanceSettings)
      await expect(update).to.revertedWith('Ownable: caller is not the owner')
    })

    it('should fail if maxSlippage is greater than 50%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(signer).updateRebalanceSettings({
        ...validRebalanceSettings,
        maxSlippage: percent100.div(2).add(1),
      })
      await expect(update).to.revertedWith('maxSlippage > 50%')
    })

    it('should fail if reward is greater than 0.50%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(signer).updateRebalanceSettings({
        ...validRebalanceSettings,
        reward: percent100.mul(50).div(10000).add(1),
      })
      await expect(update).to.revertedWith('reward > 0.50%')
    })

    it('should fail if protocolTax is greater than 100%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const update = mgmt.connect(signer).updateRebalanceSettings({
        ...validRebalanceSettings,
        protocolTax: percent100.add(1),
      })
      await expect(update).to.revertedWith('protocolTax > 100%')
    })
  })

  describe('updateManagementFee', () => {
    it('should fail if caller is not the owner', async () => {
      const [signer, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(otherUser).updateManagementFee({
        maxFee: percent100.div(10),
        defaultFee: percent100.div(100),
        protocolTax: percent100.div(5),
      })
      await expect(update).to.revertedWith('Ownable: caller is not the owner')
    })

    it('should update managementFee successfully when called by the owner with a valid value', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      await mgmt.connect(signer).updateManagementFee({
        maxFee: percent100.div(10),
        defaultFee: percent100.div(100),
        protocolTax: percent100.div(5),
      })
      const newValue = await mgmt.getManagementFee()
      expect(newValue.maxFee).equal(percent100.div(10))
      expect(newValue.defaultFee).equal(percent100.div(100))
      expect(newValue.protocolTax).equal(percent100.div(5))
    })

    it('should emit UpdateManagementFee event', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updateManagementFee({
        maxFee: percent100.div(10),
        defaultFee: percent100.div(100),
        protocolTax: percent100.div(5),
      })
      await expect(update).emit(mgmt, 'UpdateManagementFee')
    })

    it('should fail if maxFee value is greater than 100%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updateManagementFee({
        maxFee: percent100.add(1),
        defaultFee: percent100.div(100),
        protocolTax: percent100.div(5),
      })
      await expect(update).to.revertedWith('maxFee too large')
    })

    it('should fail if defaultFee value is greater than maxFee value', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updateManagementFee({
        maxFee: percent100.div(10),
        defaultFee: percent100.div(10).add(1),
        protocolTax: percent100.div(5),
      })
      await expect(update).to.revertedWith('defaultFee > maxFee')
    })

    it('should fail if protocolTax value is greater 50%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updateManagementFee({
        maxFee: percent100.div(10),
        defaultFee: percent100.div(100),
        protocolTax: percent100.div(2).add(1),
      })
      await expect(update).to.revertedWith('protocolTax > 50%')
    })
  })

  describe('updatePerformanceFee', () => {
    it('should fail if caller is not the owner', async () => {
      const [signer, otherUser] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(otherUser).updatePerformanceFee({
        maxFee: percent100.div(5),
        defaultFee: percent100.div(10),
        protocolTax: percent100.div(5),
      })
      await expect(update).to.revertedWith('Ownable: caller is not the owner')
    })

    it('should update performanceFee successfully when called by the owner with a valid value', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      await mgmt.connect(signer).updatePerformanceFee({
        maxFee: percent100.div(5),
        defaultFee: percent100.div(10),
        protocolTax: percent100.div(5),
      })
      const newValue = await mgmt.getPerformanceFee()
      expect(newValue.maxFee).equal(percent100.div(5))
      expect(newValue.defaultFee).equal(percent100.div(10))
      expect(newValue.protocolTax).equal(percent100.div(5))
    })

    it('should emit UpdatePerformanceFee event', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updatePerformanceFee({
        maxFee: percent100.div(5),
        defaultFee: percent100.div(10),
        protocolTax: percent100.div(5),
      })
      await expect(update).emit(mgmt, 'UpdatePerformanceFee')
    })

    it('should fail if maxFee value is greater than 100%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updatePerformanceFee({
        maxFee: percent100.add(1),
        defaultFee: percent100.div(10),
        protocolTax: percent100.div(5),
      })
      await expect(update).to.revertedWith('maxFee too large')
    })

    it('should fail if defaultFee value is greater than maxFee value', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updatePerformanceFee({
        maxFee: percent100.div(5),
        defaultFee: percent100.div(5).add(1),
        protocolTax: percent100.div(5),
      })
      await expect(update).to.revertedWith('defaultFee > maxFee')
    })

    it('should fail if protocolTax value is greater 50%', async () => {
      const [signer] = await ethers.getSigners()
      const weth = await mockWETH(signer, 'Weth', 'WETH', 18, 0)
      const mgmt = await deployManagement(signer, signer.address, weth.address)
      const percent100 = await mgmt.getPercent100()
      const update = mgmt.connect(signer).updatePerformanceFee({
        maxFee: percent100.div(5),
        defaultFee: percent100.div(10),
        protocolTax: percent100.div(2).add(1),
      })
      await expect(update).to.revertedWith('protocolTax > 50%')
    })
  })
})
