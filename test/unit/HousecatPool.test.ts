import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from '../mock/mock-housecat-and-pool'

describe('HousecatPool', () => {
  describe('getAssetBalances', () => {
    it('returns 0 balances when the pool is empty', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool } = await mockHousecatAndPool(signer, treasury, manager)
      const balances = await pool.getAssetBalances()
      balances.forEach((x) => expect(x).equal(0))
    })

    it('returns balances correctly when the pool is not empty', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, weth, assets } = await mockHousecatAndPool(signer, treasury, manager)

      // send weth to the pool
      await weth.token.connect(signer).mint(pool.address, parseEther('1'))

      const balances1 = await pool.getAssetBalances()

      // check weth balance is 1
      expect(balances1[0]).equal(parseEther('1'))

      // check other balances are 0
      balances1.slice(1).forEach((x) => expect(x).equal(0))

      // send asset0 to the pool
      await assets[0].token.connect(signer).mint(pool.address, parseEther('0.5'))

      const balances2 = await pool.getAssetBalances()

      // check weth balance is still 1
      expect(balances2[0]).equal(parseEther('1'))

      // check asset0 balance is 0.5
      expect(balances2[1]).equal(parseEther('0.5'))

      // check other balances are 0
      balances1.slice(2).forEach((x) => expect(x).equal(0))
    })
  })
})
