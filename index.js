const { BigNumber, Contract, Wallet, providers, utils } = require("ethers");
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require("@flashbots/ethers-provider-bundle");

const contracts = require("./contracts.js");

async function main() {
    const provider = new providers.JsonRpcProvider("https://eth-mainnet.alchemyapi.io/v2/<key>"); // TODO: use a real key!
    const authSigner = Wallet.createRandom();
    const flashbotsProvider = await FlashbotsBundleProvider.create(provider, authSigner);
    const wethContract = new Contract(contracts.weth.address, contracts.weth.abi, provider);

    const zeroEthWallet = new Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", provider); // hardhat account 0
    const donorWallet = new Wallet("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", provider); // hardhat account 1

    // build bundle transactions
    const ETH = BigNumber.from(1e9).mul(1e9); // 10^18
    const transferEthTx = {
        value: BigNumber.from(1).mul(ETH), // send 1 ETH
        from: donorWallet.address,
        to: zeroEthWallet.address,
    };
    const depositEthTx = await wethContract.populateTransaction.deposit({
        value: BigNumber.from(99).mul(ETH).div(100) // 0.99 ETH
    });

    // format transactions for Flashbots
    const bundleTransactions = [
        {
            transaction: transferEthTx,
            signer: donorWallet,
        },
        {
            transaction: depositEthTx,
            signer: zeroEthWallet,
        }
    ];

    // sign bundle
    const signedBundle = await flashbotsProvider.signBundle(bundleTransactions);

    // simulate bundle
    const simResult = await flashbotsProvider.simulate(signedBundle);
    console.log("sim result", simResult);

    // send the bundle to flashbots to be mined
    provider.on('block', async blockNum => {
        // simulate bundle for each block
        const simResult = await flashbotsProvider.simulate(signedBundle);
        console.log("sim result", simResult);

        // target next block for bundle submission
        const targetBlock = blockNum + 1;
        const bundleResponse = await flashbotsProvider.sendBundle(bundleTransactions, targetBlock);
        if ('error' in bundleResponse) {
            throw new Error(bundleResponse.error.message);
        }
        const bundleResult = bundleResponse.wait();
        if (bundleResult === FlashbotsBundleResolution.BundleIncluded) {
            console.log(`SUCCESS! Bundle mined in block ${targetBlock}.`);
            process.exit(0);
        } else if (bundleResult === FlashbotsBundleResolution.BlockPassedWithoutInclusion) {
            console.log(`Not included in ${targetBlockNumber}, trying again.`);
            // try again next block
        } else if (bundleResult === FlashbotsBundleResolution.AccountNonceTooHigh) {
            console.log("Nonce too high, bailing.");
            process.exit(1);
        }
        // much of this code is adapted from the searcher-sponsored-tx repo by Flashbots
        // https://github.com/flashbots/searcher-sponsored-tx
        // shoutout to Scott Bigelow!
    });
}

main()
.then(() => {
    console.log("Finished.");
    process.exit(0);
})
.catch(e => {
    console.error(e);
    process.exit(1);
});
