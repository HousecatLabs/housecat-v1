import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from './mock/mock-housecat-and-pool'

describe('HousecatPool: withdraw', () => {
  /*
  it('fails if sender holds insufficient amount of pool token', async () => {
    const [signer, treasury, manager, otherUser] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool(signer, treasury, manager)

    // user tries to withdraw when having zero balance
    const withdraw1 = pool.connect(otherUser).withdraw(1, otherUser.address, [])
    await expect(withdraw1).revertedWith('withdrawal exceeds balance')

    // user tries to withdraw after a deposit
    await pool.connect(otherUser).deposit({ value: parseEther('1') })
    const balance = await pool.balanceOf(otherUser.address)
    const withdraw2 = pool.connect(otherUser).withdraw(balance.add(1), otherUser.address, [])
    await expect(withdraw2).revertedWith('withdrawal exceeds balance')
  })
  */

  // one holder, one asset in pool
  // one holder, multiple assets in pool
  // multiple holders, multiple assets in pool

  /*
  describe('simple withdrawal', () => {

    before(async () => {
      const [signer, treasury, manager, otherUser] = await ethers.getSigners()
      const { pool, withdrawerAdapters, amm, weth } = await mockHousecatAndPool(signer, treasury, manager)

      // user makes a deposit
      await pool.connect(otherUser).deposit({ value: parseEther("1") })

      // user withdraws 100%
      const sellWethTx = await withdrawerAdapters.uniswapV2.interface.encodeFunctionData("sell", [
        amm.address,
        []
      ])
      await pool.connect(otherUser).withdraw(await pool.balanceOf(otherUser.address), otherUser.address, [
        {
          adapter: withdrawerAdapters.uniswapV2.address,
          data: ''
        },
      ])
    })

    it('withdrawer receives ETH for the withdrawn value', async () => {
      //
    })

    it('withdrawers pool token balance decreases by the withdrawn value', async () => {
      //
    })

    it('pool value decreases by the withdrawn value', async () => {
      //
    })
  })
  */
})
