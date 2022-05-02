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

Date: 02/05/2022

Version: 3765011

HousecatManagement: `0x0F811B00072b2A1fcaACcFD51eE4CB0DB8e6D343`

HousecatFactory: `0x8E980a8cC9AaDc1953C4a37B76Aab644E6C8D5d8`

HousecatPool: `0x18AA83106cC57A60C1EF7E2cD2B6bfa37f2bfFB1`

uniswapV2Adapter: `0x76Be1fe9497B4feB41dFE748C8D1B621420C9fdc`

aaveV2Adapter: `0xa049af185A718b609476743E529E0617274fbd7d`

HousecatQueries: `0x0ab0198850D9F1b1568636A89d4e94bc8800E996`
