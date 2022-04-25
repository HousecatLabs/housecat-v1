import { ethers } from 'hardhat'
import { expect } from 'chai'
import { parseEther } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { swapWethToTokens, deposit } from '../utils/pool-actions'

describe('HousecatPool: deposit', () => {
  describe('deposit to an empty pool', () => {
    it('sender receives pool tokens an amount being equal to the deposit value', async () => {
      const [signer, treasury, manager] = await ethers.getSigners()
      const { pool } = await mockHousecatAndPool(signer, treasury, manager)

      // deposit 1 ETH
      await pool.connect(manager).deposit([], { value: parseEther('1') })
      expect(await pool.balanceOf(manager.address)).equal(parseEther('1'))
    })
  })

  describe('deposit to a pool not containing other tokens than WETH', () => {
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

  describe('pool holding other tokens in addition to WETH', () => {
    let owner: SignerWithAddress
    let treasury: SignerWithAddress
    let manager: SignerWithAddress
    let mirrorer: SignerWithAddress
    let mock: IMockHousecatAndPool

    before(async () => {
      ;[owner, treasury, manager, mirrorer] = await ethers.getSigners()
      mock = await mockHousecatAndPool(owner, treasury, manager, { price: '1' }, [
        { price: '1', reserveToken: '10000', reserveWeth: '10000' },
        { price: '2', reserveToken: '5000', reserveWeth: '10000' },
        { price: '0.5', reserveToken: '20000', reserveWeth: '10000' },
      ])

      const { pool, amm, weth, manageAssetsAdapter, assets } = mock

      // add 10 ETH initial deposit
      await pool.connect(manager).deposit([], { value: parseEther('10') })

      // allocate the funds to four assets 2.5 ETH each
      await swapWethToTokens(pool, manager, manageAssetsAdapter, amm, weth, assets, [
        parseEther('2.5'),
        parseEther('2.5'),
        parseEther('2.5'),
      ])
    })

    it('should be able to deposit if weights are maintained', async () => {
      const { pool, amm, weth, depositAdapter, assets } = mock
      await deposit(pool, mirrorer, depositAdapter, amm, weth, assets, parseEther('10'))
    })

    it('should refuse to deposit if the asset weights are not maintained', async () => {
      const { pool } = mock
      const tx = pool.connect(mirrorer).deposit([], { value: parseEther('10') })
      await expect(tx).revertedWith('HousecatPool: asset weights changed')
    })

    it('should refuse to deposit if the loan weights are not maintained', async () => {
      // TODO
    })
  })
})
