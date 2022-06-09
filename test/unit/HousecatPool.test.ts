import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther, parseUnits } from 'ethers/lib/utils'
import mockHousecatAndPool from '../utils/mock-housecat-and-pool'
import { mockPriceFeed } from '../../utils/mock-defi'

describe('HousecatPool', () => {
  describe('getAssetBalances', () => {
    it('returns 0 balances when the pool is empty', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool } = await mockHousecatAndPool({ signer, mirrored })
      const balances = (await pool.getPoolContent()).assetBalances
      balances.forEach((x) => expect(x).equal(0))
    })

    it('returns balances correctly when the pool is not empty', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool, weth, assets } = await mockHousecatAndPool({ signer, mirrored })

      // send weth to the pool
      await weth.token.connect(signer).mint(pool.address, parseEther('1'))

      const balances1 = (await pool.getPoolContent()).assetBalances

      // check weth balance is 1
      expect(balances1[0]).equal(parseEther('1'))

      // check other balances are 0
      balances1.slice(1).forEach((x) => expect(x).equal(0))

      // send asset0 to the pool
      await assets[0].token.connect(signer).mint(pool.address, parseEther('0.5'))

      const balances2 = (await pool.getPoolContent()).assetBalances

      // check weth balance is still 1
      expect(balances2[0]).equal(parseEther('1'))

      // check asset0 balance is 0.5
      expect(balances2[1]).equal(parseEther('0.5'))

      // check other balances are 0
      balances1.slice(2).forEach((x) => expect(x).equal(0))
    })
  })

  describe('setSuspended', () => {
    it('only owner allowed to call', async () => {
      const [signer, mirrored, otherUser] = await ethers.getSigners()
      const { pool } = await mockHousecatAndPool({ signer, mirrored })
      const tx = pool.connect(otherUser).setSuspended(true)
      await expect(tx).revertedWith('HousecatPool: only owner')
    })

    it('sets the suspended value', async () => {
      const [signer, mirrored] = await ethers.getSigners()
      const { pool } = await mockHousecatAndPool({ signer, mirrored })
      await pool.connect(signer).setSuspended(true)
      expect(await pool.suspended()).eq(true)
    })
  })

  describe('transfer', () => {
    it('should emit TransferPoolToken event', async () => {
      const [signer, depositor, otherUser, mirrored] = await ethers.getSigners()
      const { pool, adapters, weth, mgmt } = await mockHousecatAndPool({ signer, mirrored })
      const amountDeposit = parseEther('8')

      // deposit
      await pool.connect(depositor).deposit(
        depositor.address,
        [
          {
            adapter: adapters.wethAdapter.address,
            data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amountDeposit]),
          },
        ],
        { value: amountDeposit }
      )

      // double pool value by increasing weth price
      const newPriceFeed = await mockPriceFeed(signer, parseUnits('2', 8), 8)
      await mgmt.setTokenMeta(weth.token.address, {
        ...(await mgmt.getTokenMeta(weth.token.address)),
        priceFeed: newPriceFeed.address,
      })

      // transfer tokens
      const amount = ethers.utils.parseEther('1.5')
      const value = amount.mul(2)
      const transfer = pool.connect(depositor).transfer(otherUser.address, amount)
      await expect(transfer)
        .emit(pool, 'TransferPoolToken')
        .withArgs(depositor.address, otherUser.address, amount, value)
    })
  })
})
