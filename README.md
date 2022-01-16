# flashbots for dummies

The simplest possible example I could come up with to demonstrate how to send tx bundles to Flashbots.

## quick start

1. Get a valid provider URL (key) from [Alchemy](https://dashboard.alchemyapi.io/).
2. Copy that URL into the PROVIDER_URL variable in .env.
3. Have fun!

```sh
# get ENV variable template
cp .env.example .env

# add your own vars
vim .env

# install node dependencies
npm install

# run the script
node index.js
```
