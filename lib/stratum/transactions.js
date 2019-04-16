const util = require('./util.js');
const init = require('../../init')
const bitcoin = require('bitgo-utxo-lib');
const logging = require('../modules/logging.js');
// public members
var txHash;
exports.txHash = function () { return txHash; };
function scriptCompile(addrHash) {
    script = bitcoin.script.compile([bitcoin.opcodes.OP_DUP, bitcoin.opcodes.OP_HASH160, addrHash, bitcoin.opcodes.OP_EQUALVERIFY, bitcoin.opcodes.OP_CHECKSIG]);
    return script;
}
function scriptCompileP2PK(pubkey) {
    script = bitcoin.script.compile([Buffer.from(pubkey, 'hex'), bitcoin.opcodes.OP_CHECKSIG]);
    return script;
}
exports.createGeneration = function (blockHeight, blockReward, foundersFee, feeReward, poolAddress, poolPubkey) {

    let KMDcoin = init.cconfig.symbol.toLowerCase();
    let FoundersAddrHash = bitcoin.address.fromBase58Check(init.cconfig.foundersAddy).hash
    let network = bitcoin.networks[KMDcoin]
    let tx = new bitcoin.TransactionBuilder(network)
    tx.setVersion(bitcoin.Transaction.ZCASH_SAPLING_VERSION);
    let blockHeightSerial = (blockHeight.toString(16).length % 2 === 0 ? '' : '0') + blockHeight.toString(16)
    let height = Math.ceil((blockHeight << 1).toString(2).length / 8)
    var lengthDiff = blockHeightSerial.length / 2 - height;
    for (let i = 0; i < lengthDiff; i++) { blockHeightSerial = `${blockHeightSerial}00` }
    let length = `0${height}`
    let serializedBlockHeight = new Buffer.concat([
        new Buffer(length, 'hex'), util.reverseBuffer(new Buffer(blockHeightSerial, 'hex')), new Buffer('00', 'hex') // OP_0
    ]);
    tx.addInput(new Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
        4294967295, 4294967295,
        new Buffer.concat([serializedBlockHeight,
            Buffer('485553483320736f6c6f2d6d696e696e672068747470733a2f2f6769746875622e636f6d2f546865436f6d707574657247656e69652f48555348332d736f6c6f2d6d696e696e67', 'hex')])
        //KMD solo-mining https://github.com/TheComputerGenie/HUSH3-solo-mining
    );
    var fullreward = (blockReward + feeReward) / Math.pow(10, 8);
    logging('Blocks', (fullreward > (11.25) ? 'error' : 'debug'), 'Current block would pay: ' + fullreward + ' : ' + (feeReward / Math.pow(10, 8)) + ' in fees')

    tx.addOutput(
        scriptCompileP2PK(poolPubkey),
        blockReward + feeReward
    );
    tx.addOutput(
        scriptCompile(FoundersAddrHash),
        foundersFee
    );

    let txb = tx.build()
    txHex = txb.toHex()
    txHash = txb.getHash().toString('hex');
    return txHex;
};
module.exports.getFees = function (feeArray) {
    var fee = Number();
    feeArray.forEach(function (value) {
        fee = fee + Number(value.fee);
    });
    return fee;
};
