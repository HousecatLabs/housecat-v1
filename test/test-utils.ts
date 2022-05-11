import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, Transaction } from 'ethers'
import { HousecatPool } from '../typechain-types'
import { IAdapters } from '../utils/deploy-contracts'

export const deposit = async (
  pool: HousecatPool,
  adapters: IAdapters,
  depositor: SignerWithAddress,
  amount: BigNumber
): Promise<Transaction> => {
  return pool.connect(depositor).deposit(
    depositor.address,
    [
      {
        adapter: adapters.wethAdapter.address,
        data: adapters.wethAdapter.interface.encodeFunctionData('deposit', [amount]),
      },
    ],
    { value: amount }
  )
}

export const withdraw = async (
  pool: HousecatPool,
  adapters: IAdapters,
  withdrawer: SignerWithAddress,
  amount: BigNumber
) => {
  return pool.connect(withdrawer).withdraw(withdrawer.address, [
    {
      adapter: adapters.wethAdapter.address,
      data: adapters.wethAdapter.interface.encodeFunctionData('withdraw', [amount]),
    },
  ])
}
