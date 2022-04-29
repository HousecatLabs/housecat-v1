# Housecat V1 Contracts

## Development

### Setup

1. Register a free account at `etherscan.io` and create an API key there.
2. Register a free account at any RPC provider (for example `moralis.io`) and create a Polygon RPC URL.
3. Create a `.env` file in the repository root and add the following:

```
POLYGON_RPC_URL=<your polygon rpc url here>
ETHERSCAN_API_KEY=<your etherscan api key here>
```

4. Install dependencies with `npm install`

### Compile and test

Run `npm run build` to compile the smart contracts.
Run `npm run test` to run tests.

### Deployment

Check [Polygon gas prices](https://polygonscan.com/gastracker) and adjust `gasPrice` in `scripts/deploy-contracts.ts` accordingly.

Set environment variable `DEPLOY_PRIVATE_KEY` to private used for deployment. Currently used key can be found in AWS Secrets Manager.

Deploy new contracts with:

```
npx hardhat run scripts/deploy.ts --network polygon
```

Record the contract addresses printed by the deployment script and add the to this `README.md` and change them in the `housecat-ui`
repository. Deploy new frontend with the new contract addresses.

## Deployed addresses (Polygon mainnet):

Date: 28/04/2022

Version: 15297c3

HousecatManagement: `0xD185F0531dCE880954c548f53fdd701673461eE3`

HousecatFactory: `0xae47c12236A7d1b9dc5277Cf1E05e879886069EE`

HousecatPool: `0x2c07113Da42C88e74c013e2Af2C2368f00972457`

uniswapV2Adapter: `0x3235F113DA62f0bfF05d493A0b4f896A6D95F4C3`

aaveV2Adapter: `0x61Da7bF9eFC6E4e0774F059e74A3A9f923B0F560`

HousecatQueries: `0x161AB431365c5a97933E000F1e0B68a934C54d0E`
