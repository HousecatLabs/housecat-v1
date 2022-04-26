import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  HousecatManagement,
  HousecatFactory,
  HousecatPool,
  HousecatQueries,
  ManagePositionsAdapter,
  WithdrawAdapter,
  DepositAdapter,
} from '../typechain-types'
import { TokenMetaStruct } from '../typechain-types/HousecatManagement'

export const deployQueries = async (signer: SignerWithAddress): Promise<HousecatQueries> => {
  const HousecatQueries = await ethers.getContractFactory('HousecatQueries')
  return HousecatQueries.connect(signer).deploy()
}

export const deployPool = async (signer: SignerWithAddress): Promise<HousecatPool> => {
  const HousecatPool = await ethers.getContractFactory('HousecatPool')
  return HousecatPool.connect(signer).deploy()
}

export const deployManagement = async (
  signer: SignerWithAddress,
  treasury: string,
  weth: string
): Promise<HousecatManagement> => {
  const HousecatManagement = await ethers.getContractFactory('HousecatManagement')
  return HousecatManagement.connect(signer).deploy(treasury, weth)
}

export const deployFactory = async (
  signer: SignerWithAddress,
  management: string,
  poolTemplate: string
): Promise<HousecatFactory> => {
  const HousecatFactory = await ethers.getContractFactory('HousecatFactory')
  return HousecatFactory.connect(signer).deploy(management, poolTemplate)
}

export const deployManagePositionsAdapter = async (signer: SignerWithAddress): Promise<ManagePositionsAdapter> => {
  const adapter = await ethers.getContractFactory('ManagePositionsAdapter')
  return adapter.connect(signer).deploy()
}

export const deployDepositAdapter = async (signer: SignerWithAddress): Promise<DepositAdapter> => {
  const adapter = await ethers.getContractFactory('DepositAdapter')
  return adapter.connect(signer).deploy()
}

export const deployWithdrawAdapter = async (signer: SignerWithAddress): Promise<WithdrawAdapter> => {
  const adapter = await ethers.getContractFactory('WithdrawAdapter')
  return adapter.connect(signer).deploy()
}

export interface IDeployHousecat {
  signer: SignerWithAddress
  treasury?: string
  weth: string
  assets?: string[]
  assetsMeta?: TokenMetaStruct[]
  loans?: string[]
  loansMeta?: TokenMetaStruct[]
  integrations?: string[]
}

export interface IHousecat {
  mgmt: HousecatManagement
  factory: HousecatFactory
  managePositionsAdapter: ManagePositionsAdapter
  depositAdapter: DepositAdapter
  withdrawAdapter: WithdrawAdapter
}

export const deployHousecat = async ({
  signer,
  treasury,
  weth,
  assets,
  assetsMeta,
  loans,
  loansMeta,
  integrations,
}: IDeployHousecat): Promise<IHousecat> => {
  const poolTemplate = await deployPool(signer)
  const mgmt = await deployManagement(signer, treasury || signer.address, weth)
  const factory = await deployFactory(signer, mgmt.address, poolTemplate.address)
  if (assets) {
    await mgmt.connect(signer).setSupportedAssets(assets)
    if (assetsMeta) {
      await mgmt.connect(signer).setTokenMetaMany(assets, assetsMeta)
    }
  }
  if (loans) {
    await mgmt.connect(signer).setSupportedLoans(loans)
    if (loansMeta) {
      await mgmt.connect(signer).setTokenMetaMany(loans, loansMeta)
    }
  }
  const managePositionsAdapter = await deployManagePositionsAdapter(signer)
  await mgmt.updateManagePositionsAdapter(managePositionsAdapter.address)

  const depositAdapter = await deployDepositAdapter(signer)
  await mgmt.updateDepositAdapter(depositAdapter.address)

  const withdrawAdapter = await deployWithdrawAdapter(signer)
  await mgmt.updateWithdrawAdapter(withdrawAdapter.address)

  if (integrations) {
    for (let i = 0; i < integrations.length; i++) {
      await mgmt.setIntegration(integrations[i], true)
    }
  }
  return { mgmt, factory, managePositionsAdapter, depositAdapter, withdrawAdapter }
}
