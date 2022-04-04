import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import { IMockHousecat, mockHousecat } from '../utils/mock-housecat'
import { HousecatPool } from '../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

interface IMockHousecatAndPool extends IMockHousecat {
  pool: HousecatPool
}

const mockHousecatAndPool = async (
  signer: SignerWithAddress,
  treasury: SignerWithAddress,
  manager: SignerWithAddress,
): Promise<IMockHousecatAndPool> => {
  const mock = await mockHousecat({
    signer,
    treasury: treasury.address,
    weth: { price: '1' },
    tokens: [
      { price: '1', reserveToken: '1000', reserveWeth: '1000' },
      { price: '2', reserveToken: '500', reserveWeth: '1000' },
      { price: '0.5', reserveToken: '2000', reserveWeth: '1000' },
    ],
  })
  await mock.factory.connect(manager).createPool()
  const pool = await ethers.getContractAt('HousecatPool', await mock.factory.getPool(0))
  return { pool, ...mock }
}

describe('HousecatPool', () => {
  describe('deposit', () => {
    it('WETH balance of the pool increases by the deposit amount', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool, weth } = await mockHousecatAndPool(signer, treasury, manager)

      // deposit 1 ETH
      await pool.connect(manager).deposit({ value: parseEther('1') })
      expect(await weth.token.balanceOf(pool.address)).equal(parseEther('1'))

      // deposit 2 ETH more
      await pool.connect(manager).deposit({ value: parseEther('2') })
      expect(await weth.token.balanceOf(pool.address)).equal(parseEther('3'))
    })

    describe('empty pool', () => {
      it('sender receives pool tokens an amount equalling the deposit value', async () => {
        const [signer, treasury, manager] = await ethers.getSigners()
        const { pool } = await mockHousecatAndPool(signer, treasury, manager)

        // deposit 1 ETH
        await pool.connect(manager).deposit({ value: parseEther('1') })
        expect(await pool.balanceOf(manager.address)).equal(parseEther('1'))
      })
    })

    describe('pool with existing holders', async () => {
      it('sender receives pool tokens an amount corresponding their share of the pool value', async () => {
        const [signer, treasury, manager, otherUser] = await ethers.getSigners()
        const { pool } = await mockHousecatAndPool(signer, treasury, manager)

        // manager deposits 1 ETH
        await pool.connect(manager).deposit({ value: parseEther('1') })

        // manager deposits 1 ETH more
        await pool.connect(manager).deposit({ value: parseEther('1') })
        expect(await pool.balanceOf(manager.address)).equal(parseEther('2'))

        // other user deposits 1 ETH
        await pool.connect(otherUser).deposit({ value: parseEther('1') })
        expect(await pool.balanceOf(otherUser.address)).equal(parseEther('1'))

        // check manager holds 2/3 of the total supply
        expect((await pool.totalSupply()).mul(2)).equal((await pool.balanceOf(manager.address)).mul(3))

        // check other users holds 1/3 of the total supply
        expect((await pool.totalSupply()).mul(1)).equal((await pool.balanceOf(otherUser.address)).mul(3))
      })
    })
  })
})
