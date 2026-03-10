'use strict';

const crypto = require('crypto');
const { fib } = require('../../shared/phi-math');

function deepSort(value) {
  if (Array.isArray(value)) {
    return value.map(deepSort);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((accumulator, key) => {
      accumulator[key] = deepSort(value[key]);
      return accumulator;
    }, {});
  }
  return value;
}

function canonicalize(value) {
  return JSON.stringify(deepSort(value));
}

function generateKeypair(keyId = `heady-receipt-${crypto.randomUUID().slice(0, fib(6))}`) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { format: 'pem', type: 'spki' },
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' }
  });
  return { keyId, publicKey, privateKey, createdAt: new Date().toISOString() };
}

class ReceiptSigner {
  constructor(keypair = generateKeypair()) {
    this.currentKey = keypair;
    this.publicKeys = new Map([[keypair.keyId, keypair.publicKey]]);
    this.maxHistoricalKeys = fib(8);
  }

  rotate() {
    this.currentKey = generateKeypair();
    this.publicKeys.set(this.currentKey.keyId, this.currentKey.publicKey);
    while (this.publicKeys.size > this.maxHistoricalKeys) {
      const oldestKeyId = this.publicKeys.keys().next().value;
      this.publicKeys.delete(oldestKeyId);
    }
    return this.currentKey;
  }

  sign(receipt) {
    const canonical = canonicalize(receipt);
    const payload = Buffer.from(canonical, 'utf8');
    const signature = crypto.sign(null, payload, this.currentKey.privateKey);
    return {
      receipt,
      signature: {
        algorithm: 'Ed25519',
        keyId: this.currentKey.keyId,
        value: signature.toString('hex'),
        canonicalHash: crypto.createHash('sha256').update(payload).digest('hex'),
        signedAt: new Date().toISOString()
      }
    };
  }

  verify(signedReceipt) {
    const publicKey = this.publicKeys.get(signedReceipt.signature.keyId);
    if (!publicKey) {
      return { valid: false, reason: 'Unknown key id.' };
    }
    const canonical = canonicalize(signedReceipt.receipt);
    const payload = Buffer.from(canonical, 'utf8');
    const isValid = crypto.verify(null, payload, publicKey, Buffer.from(signedReceipt.signature.value, 'hex'));
    return { valid: isValid };
  }
}

module.exports = {
  ReceiptSigner,
  generateKeypair
};
