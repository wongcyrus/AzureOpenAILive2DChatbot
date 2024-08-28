const screenSharingPerMinute = 12;
const screenSharingMaxSize = 0.5;
const screenSharingMaxDuration = 3;
const dailyCostLimit = 0.3;

const prices = {
    'gpt-35-turbo': { "completion": { tokens: 1000, price: 0.002 }, "prompt": { tokens: 1000, price: 0.002 } },
    'gpt-35-turbo-16k': { "completion": { tokens: 1000, price: 0.0005 }, "prompt": { tokens: 1000, price: 0.002 } },
    'gpt-4-32k': { "completion": { tokens: 1000, price: 0.06 }, "prompt": { tokens: 1000, price: 0.12 } },
    'gpt-4': { "completion": { tokens: 1000, price: 0.03 }, "prompt": { tokens: 1000, price: 0.06 } },
    'gpt-4o': { "completion": { tokens: 1000, price: 0.03 }, "prompt": { tokens: 1000, price: 0.06 } },
}


module.exports = {
    screenSharingPerMinute,
    screenSharingMaxSize,
    screenSharingMaxDuration,
    dailyCostLimit,
    prices
}
