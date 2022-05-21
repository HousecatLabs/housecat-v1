import hre from 'hardhat'

const getDeployment = () => {
  const network = hre.hardhatArguments.network
  return require(`../deployment-${network}.json`)
}

export default getDeployment
