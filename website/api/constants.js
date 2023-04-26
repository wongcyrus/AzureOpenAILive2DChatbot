const screenSharingPerMinute = 12;
const screenSharingMaxSize = 0.5;
const screenSharingMaxDuration = 3;
const dailyCostLimit = 0.3;

const prices = {
    'text-ada-001': { "completion": { tokens: 1000, price: 0.0004 }, "prompt": { tokens: 1000, price: 0.0004 } },
    'text-curie-001': { "completion": { tokens: 1000, price: 0.0004 }, "prompt": { tokens: 1000, price: 0.002 } },
    'text-davinci-002': { "completion": { tokens: 1000, price: 0.0004 }, "prompt": { tokens: 1000, price: 0.02 } },
    'code-davinci-002': { "completion": { tokens: 1000, price: 0.0004 }, "prompt": { tokens: 1000, price: 0.10 } },
    'text-davinci-003': { "completion": { tokens: 1000, price: 0.0004 }, "prompt": { tokens: 1000, price: 0.0004 } },
    'gpt-35-turbo': { "completion": { tokens: 1000, price: 0.0004 }, "prompt": { tokens: 1000, price: 0.002 } },
    'gpt-4-32k': { "completion": { tokens: 1000, price: 0.06 }, "prompt": { tokens: 1000, price: 0.12 } },
    'gpt-4': { "completion": { tokens: 1000, price: 0.03 }, "prompt": { tokens: 1000, price: 0.06 } },
}


module.exports = {
    screenSharingPerMinute,
    screenSharingMaxSize,
    screenSharingMaxDuration,
    dailyCostLimit,
    prices
}