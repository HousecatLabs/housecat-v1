import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool from './mock/mock-housecat-and-pool'

describe('HousecatPool: withdraw', () => {
  it('fails if sender holds insufficient amount of pool token', async () => {
    const [signer, treasury, manager, otherUser] = await ethers.getSigners()
    const { pool } = await mockHousecatAndPool(signer, treasury, manager)

    // user tries to withdraw when having zero balance
    const withdraw1 = pool.connect(otherUser).withdraw(1, [], otherUser.address)
    await expect(withdraw1).revertedWith('withdrawal exceeds balance')

    // user tries to withdraw after a deposit
    await pool.connect(otherUser).deposit({ value: parseEther('1') })
    const balance = await pool.balanceOf(otherUser.address)
    const withdraw2 = pool.connect(otherUser).withdraw(balance.add(1), [], otherUser.address)
    await expect(withdraw2).revertedWith('withdrawal exceeds balance')
  })
})
