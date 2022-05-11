import { ethers } from 'hardhat'
import { Interface } from 'ethers/lib/utils'
import mockHousecatAndPool, { IMockHousecatAndPool } from '../../mock/mock-housecat-and-pool'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import polygon from '../../../utils/addresses/polygon'
import { expect } from 'chai'

describe('ParaswapV5Adapter', () => {
  let owner: SignerWithAddress
  let mirrored: SignerWithAddress
  let mock: IMockHousecatAndPool
  let paraswapInterface: Interface

  before(async () => {
    const [owner_, mirrored_] = await ethers.getSigners()
    owner = owner_
    mirrored = mirrored_
    mock = await mockHousecatAndPool({ signer: owner, mirrored, weth: { price: '1', amountToMirrored: '5' } })
    paraswapInterface = (await ethers.getContractAt('IAugustusSwapper', ethers.constants.AddressZero)).interface
  })

  describe('simpleSwap', () => {
    it('should fail to use an unsupported router', async () => {
      const unsupportedRouter = ethers.constants.AddressZero
      const adapterData = mock.adapters.paraswapV5Adapter.interface.encodeFunctionData('simpleSwap', [
        unsupportedRouter,
        '0x00',
      ])
      const tx = mock.pool.connect(owner).deposit(owner.address, [
        {
          adapter: mock.adapters.paraswapV5Adapter.address,
          data: adapterData,
        },
      ])

      await expect(tx).revertedWith('ParaswapV5Adapter: unsupported router')
    })

    it('should fail to buy unsupported assets', async () => {
      const dummyAddress = ethers.constants.AddressZero
      const paraswapData = paraswapInterface.encodeFunctionData('protectedSimpleSwap', [
        {
          fromToken: mock.assets[0].token.address,
          toToken: dummyAddress,
          fromAmount: 123,
          toAmount: 123,
          expectedAmount: 123,
          callees: [],
          exchangeData: '0x00',
          startIndexes: [],
          values: [],
          beneficiary: dummyAddress,
          partner: dummyAddress,
          feePercent: 0,
          permit: '0x00',
          deadline: 0,
          uuid: '0x00000000000000000000000000000000',
        },
      ])
      const adapterData = mock.adapters.paraswapV5Adapter.interface.encodeFunctionData('simpleSwap', [
        polygon.paraswapV5.AugustusSwapper,
        paraswapData,
      ])

      // try to trade on paraswap when token to is not supported
      const tx = mock.pool.connect(owner).deposit(owner.address, [
        {
          adapter: mock.adapters.paraswapV5Adapter.address,
          data: adapterData,
        },
      ])

      await expect(tx).revertedWith('ParaswapV5Adapter: unsupported token to')
    })
  })

  describe('multiSwap', () => {
    it('should fail to use an unsupported router', async () => {
      const unsupportedRouter = ethers.constants.AddressZero
      const adapterData = mock.adapters.paraswapV5Adapter.interface.encodeFunctionData('multiSwap', [
        unsupportedRouter,
        '0x00',
      ])
      const tx = mock.pool.connect(owner).deposit(owner.address, [
        {
          adapter: mock.adapters.paraswapV5Adapter.address,
          data: adapterData,
        },
      ])

      await expect(tx).revertedWith('ParaswapV5Adapter: unsupported router')
    })

    it('should fail to buy unsupported assets', async () => {
      const dummyAddress = ethers.constants.AddressZero
      const paraswapData = paraswapInterface.encodeFunctionData('protectedMultiSwap', [
        {
          fromToken: mock.assets[0].token.address,
          fromAmount: 123,
          toAmount: 123,
          expectedAmount: 123,
          beneficiary: dummyAddress,
          path: [
            {
              to: mock.assets[0].token.address,
              totalNetworkFee: 0,
              adapters: [],
            },
            {
              to: dummyAddress,
              totalNetworkFee: 0,
              adapters: [],
            },
          ],
          partner: dummyAddress,
          feePercent: 0,
          permit: '0x00',
          deadline: 0,
          uuid: '0x00000000000000000000000000000000',
        },
      ])
      const adapterData = mock.adapters.paraswapV5Adapter.interface.encodeFunctionData('multiSwap', [
        polygon.paraswapV5.AugustusSwapper,
        paraswapData,
      ])

      // try to trade on paraswap when token to is not supported
      const tx = mock.pool.connect(owner).deposit(owner.address, [
        {
          adapter: mock.adapters.paraswapV5Adapter.address,
          data: adapterData,
        },
      ])

      await expect(tx).revertedWith('ParaswapV5Adapter: unsupported token to')
    })
  })
})
