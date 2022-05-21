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

## Deployed addresses:

Version: 8b5a7a1

```js
{
  timestamp: '2022-05-21T07:17:12.778Z',
  network: 'polygon',
  addresses: {
    HousecatManagement: '0xa4d4A77026Cb946B7af2cA23636705B4cb0629Ea',
    HousecatFactory: '0x53C61bdb9E09A1E3f381b930715eBa3Ac4132c1c',
    HousecatPool: '0x26E2D629e3B1c267832F87459C4C15F27C3f62e6',
    HousecatQueries: '0x5A48a447e999F790bb936e65fdc655EFE2FB1B9d',
    WETHAdapter: '0x654D66Ed7Ec3165213eb6496746033E75216BE22',
    UniswapV2Adapter: '0x292f5A49B98dE0b85DE8065AB697754F82446ea4',
    AaveV2Adapter: '0x200903840f30470e89B5a7B428300E4Fe40F6560',
    ParaswapV5Adapter: '0xd25f0B3b64A61585BBC3151a4f226dbA457f77FF'
  }
}
```
