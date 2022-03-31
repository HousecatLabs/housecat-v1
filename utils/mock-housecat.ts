import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { HousecatFactory, HousecatManagement, WETHMock } from "../typechain-types"
import { deployFactory, deployManagement, deployPool } from "./deploy-contracts"
import { mockWETH } from "./mock-defi"

interface IMockHousecat {
  signer: SignerWithAddress,
  treasury?: string
}

const mockHousecat = async ({
  signer,
  treasury,
}: IMockHousecat): Promise<[HousecatManagement, HousecatFactory, WETHMock]> => {
  const wethMock = await mockWETH(signer, 'Wrapped Matic', 'WMATIC', 18, 0)
  const poolTemplate = await deployPool(signer)
  const mgmt = await deployManagement(signer, treasury || signer.address, wethMock.address)
  const factory = await deployFactory(signer, mgmt.address, poolTemplate.address)
  // TODO: create tokens with liquidity
  return [mgmt, factory, wethMock]
}

export default mockHousecat