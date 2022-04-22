import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from './mock/mock-housecat-and-pool'

describe('HousecatPool: deposit', () => {
  describe('simple pool not holding other tokens than WETH', () => {
    it('WETH balance of the pool increases by the deposit amount', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, weth } = await mockHousecatAndPool(signer, treasury, manager)

      // deposit 1 ETH
      await pool.connect(manager).deposit([], { value: parseEther('1') })
      expect(await weth.token.balanceOf(pool.address)).equal(parseEther('1'))

      // deposit 2 ETH more
      await pool.connect(manager).deposit([], { value: parseEther('2') })
      expect(await weth.token.balanceOf(pool.address)).equal(parseEther('3'))
    })

    describe('empty pool', () => {
      it('sender receives pool tokens an amount equalling the deposit value', async () => {
        const [signer, treasury, manager] = await ethers.getSigners()
        const { pool } = await mockHousecatAndPool(signer, treasury, manager)

        // deposit 1 ETH
        await pool.connect(manager).deposit([], { value: parseEther('1') })
        expect(await pool.balanceOf(manager.address)).equal(parseEther('1'))
      })
    })

    describe('pool with existing holders', async () => {
      it('sender receives pool tokens an amount corresponding their share of the pool value', async () => {
        const [signer, treasury, manager, otherUser] = await ethers.getSigners()
        const { pool } = await mockHousecatAndPool(signer, treasury, manager)

        // manager deposits 1 ETH
        await pool.connect(manager).deposit([], { value: parseEther('1') })

        // manager deposits 1 ETH more
        await pool.connect(manager).deposit([], { value: parseEther('1') })

        // other user deposits 1 ETH
        await pool.connect(otherUser).deposit([], { value: parseEther('1') })
        expect(await pool.balanceOf(otherUser.address)).equal(parseEther('1'))

        // check manager holds 2/3 of the total supply
        expect((await pool.totalSupply()).mul(2)).equal((await pool.balanceOf(manager.address)).mul(3))

        // check other users holds 1/3 of the total supply
        expect((await pool.totalSupply()).mul(1)).equal((await pool.balanceOf(otherUser.address)).mul(3))
      })
    })

    describe('when pool value changes between deposits', async () => {
      it('sender receives pool tokens an amount corresponding their share of the pool value', async () => {
        const [signer, treasury, manager, otherUser] = await ethers.getSigners()
        const { pool, management, weth } = await mockHousecatAndPool(signer, treasury, manager)

        // manager deposits 1 ETH = 1 USD
        await pool.connect(manager).deposit([], { value: parseEther('1') })

        // WETH value doubles
        await weth.priceFeed.setAnswer((await management.getOneUSD()).mul(2))

        // another user deposits 0.5 ETH = 1 USD
        await pool.connect(otherUser).deposit([], { value: parseEther('0.5') })

        // check manager holds 2/3 of the total supply
        expect((await pool.totalSupply()).mul(2)).equal((await pool.balanceOf(manager.address)).mul(3))

        // check the other users holds 1/3 of the total supply
        expect((await pool.totalSupply()).mul(1)).equal((await pool.balanceOf(otherUser.address)).mul(3))
      })
    })
  })
})
