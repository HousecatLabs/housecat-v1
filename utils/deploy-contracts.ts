import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
  HousecatManagement,
  HousecatFactory,
  HousecatPool,
  HousecatQueries,
  UniswapV2Adapter,
  AaveV2Adapter,
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

export interface IAdapters {
  uniswapV2Adapter: UniswapV2Adapter
  aaveV2Adapter: AaveV2Adapter
}

export const deployAdapters = async (signer: SignerWithAddress): Promise<IAdapters> => {
  const uniswapV2Adapter = await (await ethers.getContractFactory('UniswapV2Adapter')).connect(signer).deploy()
  const aaveV2Adapter = await (await ethers.getContractFactory('AaveV2Adapter')).connect(signer).deploy()
  return { uniswapV2Adapter, aaveV2Adapter }
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
  adapters: IAdapters
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
  const adapters = await deployAdapters(signer)
  await Promise.all(Object.values(adapters).map(async (adapter) => {
    await mgmt.setAdapter(adapter.address, true)
  }))

  if (integrations) {
    for (let i = 0; i < integrations.length; i++) {
      await mgmt.setSupportedIntegration(integrations[i], true)
    }
  }
  return { mgmt, factory, adapters }
}
