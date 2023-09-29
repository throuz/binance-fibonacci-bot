import schedule from "node-schedule";
import { errorHandler, logWithTime } from "./src/common.js";
import {
  getFibonacciLevels,
  getMarkPrice,
  getTPSL,
  formatBySize,
  getAllowNewOrders,
  getOrderQuantity,
  getSizes,
  getHighestGainsSymbol,
  getPositionInformation
} from "./src/helpers.js";
import { changeInitialLeverage, placeMultipleOrders } from "./src/trade.js";
import { asyncLocalStorage } from "./src/storage.js";
import tradeConfig from "./configs/trade-config.js";

const { LEVERAGE } = tradeConfig;

const executePlaceOrders = async () => {
  try {
    const positionInformation = await getPositionInformation();
    if (Number(positionInformation.leverage) !== LEVERAGE) {
      await changeInitialLeverage();
    }
    const markPrice = await getMarkPrice();
    const fibonacciLevels = await getFibonacciLevels();
    const isPriceInSafeZone = markPrice > fibonacciLevels[1];
    logWithTime(`isPriceInSafeZone: ${isPriceInSafeZone}`);
    if (isPriceInSafeZone) {
      const orderQuantity = await getOrderQuantity();
      const { takeProfitPrice, stopLossPrice } = getTPSL(
        markPrice,
        fibonacciLevels
      );
      const { tickSize, stepSize } = await getSizes();
      await placeMultipleOrders(
        formatBySize(orderQuantity, stepSize),
        formatBySize(takeProfitPrice, tickSize),
        formatBySize(stopLossPrice, tickSize)
      );
    }
  } catch (error) {
    await errorHandler(error);
  }
};

const executeTradingStrategy = async () => {
  try {
    const allowNewOrders = await getAllowNewOrders();
    logWithTime(`allowNewOrders: ${allowNewOrders}`);
    if (allowNewOrders) {
      const highestGainsSymbol = await getHighestGainsSymbol();
      if (highestGainsSymbol !== "NONE") {
        asyncLocalStorage.run(
          { symbol: highestGainsSymbol },
          executePlaceOrders
        );
      }
    }
  } catch (error) {
    await errorHandler(error);
  }
};

executeTradingStrategy();
schedule.scheduleJob("*/1 * * * *", () => {
  executeTradingStrategy();
});
