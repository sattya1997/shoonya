var API = (function () {
  var _API = {
    endpoint: "https://api.shoonya.com/NorenWClientTP",
    websocket: "wss://api.shoonya.com/NorenWSTP/",
    eodhost: "https://shoonya.finvasia.com/chartApi/getdata/",
    debug: false,
    timeout: 7000,
  };

  return {
    endpoint: function () {
      return _API.endpoint;
    },
    websocket: function () {
      return _API.websocket;
    },
    eodhost: function () {
      return _API.eodhost;
    },
    debug: function () {
      return _API.debug;
    },
    timeout: function () {
      return _API.timeout;
    },
  };
})();

const routes = {
  authorize: "/QuickAuth",
  logout: "/Logout",
  forgot_password: "/ForgotPassword",
  watchlist_names: "/MWList",
  watchlist: "/MarketWatch",
  watchlist_add: "/AddMultiScripsToMW",
  watchlist_delete: "/DeleteMultiMWScrips",
  placeorder: "/PlaceOrder",
  modifyorder: "/ModifyOrder",
  cancelorder: "/CancelOrder",
  exitorder: "/ExitSNOOrder",
  orderbook: "/OrderBook",
  tradebook: "/TradeBook",
  singleorderhistory: "/SingleOrdHist",
  searchscrip: "/SearchScrip",
  TPSeries: "/TPSeries",
  optionchain: "/GetOptionChain",
  holdings: "/Holdings",
  limits: "/Limits",
  positions: "/PositionBook",
  scripinfo: "/GetSecurityInfo",
  getquotes: "/GetQuotes",
  userDetails: "/UserDetails"
};

const uid = "FA340810";

function postRequest(route, params, usertoken = "") {
  let url = API.endpoint() + routes[route];
  let payload = "jData=" + JSON.stringify(params);
  payload = payload + `&jKey=${usertoken}`;
  return axios.post(url, payload);
}
var analyzeStart = false;
var orderNames = [];
isSubscribedOrders = false;
var stockTickers = ['628', '522'];
var totalCash = '';
var cashAvailable = 0;
var oldOrderValue = 0;

var orderValid = false;

class CircularBuffer {
  constructor(size) {
    this.buffer = new Array(size);
    this.size = size;
    this.start = 0;
    this.end = 0;
    this.isFull = false;
  }

  push(item) {
    this.buffer[this.end] = item;
    this.end = (this.end + 1) % this.size;
    if (this.isFull) {
      this.start = (this.start + 1) % this.size; // Increment start pointer if buffer is full
    }
    this.isFull = this.end === this.start; // Update isFull status
  }

  pop() {
    if (!this.isFull && this.end === this.start) {
      return null; // Buffer is empty
    }
    const item = this.buffer[this.start];
    this.start = (this.start + 1) % this.size;
    if (this.end === this.start) {
      this.isFull = false;
    }
    return item;
  }

  clear() {
    this.buffer = new Array(this.size);
    this.start = 0;
    this.end = 0;
    this.isFull = false;
  }
}
