const PubNub = require('pubnub');

const credentials = {
	publishKey: 'pub-c-ccc87f77-858e-4817-9682-0bab851604cd',
	subscribeKey: 'sub-c-40cead6c-d746-11e9-87c7-92ba2ff8bd78',
	secretKey: 'sec-c-MzdiMTNjNWItNTE1My00NjZhLWI2YzItOThjZjBlZDVmNGVl'
};

const CHANNELS = {
	TEST: 'TEST',
	BLOCKCHAIN: 'BLOCKCHAIN',
	TRANSACTION: 'TRANSACTION'
};

class PubSub {
	constructor({ blockChain, transactionPool, wallet }) {
		this.blockChain = blockChain;
		this.transactionPool = transactionPool;
		this.wallet = wallet;

		this.pubnub = new PubNub(credentials);

		this.pubnub.subscribe({ channels: [Object.values(CHANNELS)] });

		this.pubnub.addListener(this.listener());
	}

	broadcastChain() {
		this.publish({
			channel: CHANNELS.BLOCKCHAIN,
			message: JSON.stringify(this.blockChain.chain)
		});
	}

	broadcastTransaction(transaction) {
		this.publish({
			channel: CHANNELS.TRANSACTION,
			message: JSON.stringify(transaction)
		});
	}

	subscribeToChannels() {
		this.pubnub.subscribe({
			channels: [Object.values(CHANNELS)]
		});
	}

	listener() {
		return {
			message: messageObject => {
				const { channel, message } = messageObject;

				console.log(`Message received. Channel: ${channel}. Message: ${message}`);
				const parsedMessage = JSON.parse(message);

				switch(channel) {
					case CHANNELS.BLOCKCHAIN:
						this.blockChain.replaceChain(parsedMessage, true, () => {
							this.transactionPool.clearBlockchainTransactions(
								{ chain: parsedMessage.chain }
							);
						});
						break;
					case CHANNELS.TRANSACTION:
						if (!this.transactionPool.existingTransaction({
							inputAddress: this.wallet.publicKey
						})) {
							this.transactionPool.setTransaction(parsedMessage);
						}
						break;
					default:
						return;
				}
			}
		}
	}

	publish({ channel, message }) {
		// there is an unsubscribe function in pubnub
		// but it doesn't have a callback that fires after success
		// therefore, redundant publishes to the same local subscriber will be accepted as noisy no-ops
		this.pubnub.publish({ message, channel });
	}

}

module.exports = PubSub;