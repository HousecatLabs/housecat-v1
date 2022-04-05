import { ethers } from 'hardhat'
import { IMockHousecat, mockHousecat } from '../../utils/mock-housecat'
import { HousecatPool } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

interface IMockHousecatAndPool extends IMockHousecat {
  pool: HousecatPool
}

const mockHousecatAndPool = async (
  signer: SignerWithAddress,
  treasury: SignerWithAddress,
  manager: SignerWithAddress
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

export default mockHousecatAndPool