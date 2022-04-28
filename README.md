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

Version: 8d9c58a

HousecatManagement: `0xca8284CD96C93B317C9ABFB6f91d627CCb8B8118`
HousecatFactory: `0x76ab89A20D371E21df6aCBDF00E7ad0595763B3a`
HousecatPool: `0x798e85068b3F7d1EF0d0841FDaE5b1439af99f44`
uniswapV2Adapter: `0x2E030AB10e3cA90D8491A36BE09705cFBD610cB8`
aaveV2Adapter: `0x7Dc091F089FC64263686383396DFc927030197d7`
HousecatQueries: `0x4E6B1a03b5b8898818843c8824B1dD57975521e7`

