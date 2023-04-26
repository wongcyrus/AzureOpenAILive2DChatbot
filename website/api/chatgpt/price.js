
const { prices } = require("../constants");

const calculateCost = (model, completionTokens, promptTokens) => {
    const modelPrices = prices[model];
    const completionPrice = modelPrices.completion.price * completionTokens / modelPrices.completion.tokens;
    const promptPrice = modelPrices.prompt.price * promptTokens / modelPrices.prompt.tokens;
    return completionPrice + promptPrice;
}

module.exports = {
    calculateCost
};