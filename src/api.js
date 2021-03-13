const API_KEY =
  "ca894ecc82063af8c09bc50849630f609a5502a85fe2bd4784dbf117c444b95e";

//TODO: refactor to use URLSearchParams

const tickersHandlers = new Map();

const loadTickers = () => {
  if (tickersHandlers.size === 0) {
    return;
  }

  return fetch(
    `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${[
      ...tickersHandlers.keys()
    ].join(",")}&tsyms=USD&api_key=${API_KEY}`
  )
    .then(r => r.json())
    .then(rawData => {
      const updatedPrices = Object.fromEntries(
        Object.entries(rawData).map(([key, value]) => [key, value.USD])
      );

      Object.entries(updatedPrices).forEach(([currency, newPrice]) => {
        const handlers = tickersHandlers.get(currency) ?? [];
        handlers.forEach(fn => fn(newPrice));
      });
    });
};

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];

  tickersHandlers.set(ticker, [...subscribers, cb]);
};

export const unsubscribeFromTicker = ticker => {
  console.log(tickersHandlers);
  tickersHandlers.delete(ticker);
  console.log(tickersHandlers);
};
setInterval(loadTickers, 5000);

window.tickers = tickersHandlers;
//------------бизнес задача---------
// получить стоимость криптовалютных пар с АПИшки?? (нет)
// получать ОБНОВЛЕНИЯ стоимости крисповалютныйх пар с АПИшки
