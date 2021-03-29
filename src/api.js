const API_KEY =
  "ca894ecc82063af8c09bc50849630f609a5502a85fe2bd4784dbf117c444b95e";

//TODO: refactor to use URLSearchParams

const tickersHandlers = new Map();
const currentPrice = new Map();
const btcPrice = {};
const BTC_SYMBOL = "BTC";
const USD_SYMBOL = "USD";
const wrongTickers = [];

const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

const AGGREGATE_INDEX = "5";

let tickerName = null;
let currectSymbol = null;
let subscribeToBTCUSD = false;

socket.addEventListener("message", e => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    TOSYMBOL: tosymbol,
    MESSAGE: message,
    PARAMETER: param,
    PRICE: newPrice
  } = JSON.parse(e.data);
  console.log(JSON.parse(e.data));

  //--------- если подписываемся на тикер, то сразу подписываемся на BTC/USD, что бы вычеслять цену
  if (tickersHandlers.size && !subscribeToBTCUSD) {
    console.log("SUBSCRIBEALLCOMPLETE");
    subscribeToTickerOnWs(BTC_SYMBOL, USD_SYMBOL);
    subscribeToBTCUSD = true;
  }

  //-------- если тикеров нет, отписываемся от BTC/USD
  if (
    message === "UNSUBSCRIBEALLCOMPLETE" &&
    !tickersHandlers.size &&
    subscribeToBTCUSD
  ) {
    console.log("UNSUBSCRIBEALLCOMPLETE");
    unSubscribeFromTickerOnWs(BTC_SYMBOL);
    subscribeToBTCUSD = !subscribeToBTCUSD;
  }

  if (message === "INVALID_SUB") {
    [tickerName, currectSymbol] = param.split("~").splice(2, 2);

    if (currectSymbol === USD_SYMBOL) {
      subscribeToTickerOnWs(tickerName, BTC_SYMBOL);
      return;
    }
  }

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  // --- не даем записать тикер BTC/USD в мар
  if (currency !== BTC_SYMBOL) {
    wrongTickers.push(currency);
    currentPrice.set(currency, newPrice);
  }

  //--------записываем цену для будущего вычесления цены
  if (currency === BTC_SYMBOL && tosymbol === USD_SYMBOL) {
    btcPrice[currency] = newPrice;
  }

  if (tosymbol === USD_SYMBOL) {
    const handlers = tickersHandlers.get(currency) ?? [];
    handlers.forEach(fn => fn(newPrice));
  }
  recalculateSUB(btcPrice);
});

function recalculateSUB(btcPrice) {
  let newBtcPrice = btcPrice[BTC_SYMBOL];
  let t = Object.fromEntries(currentPrice.entries());

  for (const key in t) {
    if (Object.hasOwnProperty.call(t, key)) {
      let newPrice = 0;
      let price = currentPrice.get(key);
      newPrice = price / newBtcPrice;
      const handlers = tickersHandlers.get(key) ?? [];
      handlers.forEach(fn => fn(newPrice));
    }
  }
}

function sendToWebSOcket(message) {
  const stringifiedMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }

  socket.addEventListener(
    "open",
    () => {
      socket.send(stringifiedMessage);
    },
    { once: true }
  );
}

function subscribeToTickerOnWs(ticker, subSymbol = "USD") {
  sendToWebSOcket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${subSymbol}`]
  });
}

function unSubscribeFromTickerOnWs(ticker, symbol = "USD") {
  sendToWebSOcket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${symbol}`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);

  let tickers = [...currentPrice.keys()];
  console.log(tickers);
  tickers.forEach(t => {
    if (t === ticker) {
      unSubscribeFromTickerOnWs(ticker, BTC_SYMBOL);
    }
  });
  currentPrice.delete(ticker);
  if (ticker !== "BTC") {
    unSubscribeFromTickerOnWs(ticker);
  }
};

window.tickers = tickersHandlers;
