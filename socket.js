const websocketUrl = API.websocket();

let websocket = null;
const maxReconnectAttempts = 5;
let reconnectAttempts = 0;
var hasConnection = false;
var isStoreDepth = false;

function connectWebSocket() {
  websocket = new WebSocket(websocketUrl);

  websocket.onclose = function (event) {
    console.log("WebSocket connection closed", event);
    hasConnection = false;
    if (reconnectAttempts < maxReconnectAttempts) {
      // Retry after a delay (e.g., exponential backoff)
      setTimeout(reconnect, 1000 * Math.pow(2, reconnectAttempts));
      reconnectAttempts++;
    } else {
      console.error("Max reconnection attempts reached. Giving up.");
    }
  };

  websocket.onopen = function (event) {
    hasConnection = true;
    reconnectAttempts = 0;
    setInterval(function () {
      var _hb_req = '{"t":"h"}';
      if (hasConnection) {
        websocket.send(_hb_req);
      }
    }, 7000);

    const connectRequest = {
      t: "c",
      uid: uid,
      actid: uid,
      source: "API",
      susertoken: userToken,
    };

    websocket.send(JSON.stringify(connectRequest));
    setTimeout(() => {
      subscribeTouchline(["NSE|26000"]);
      Object.values(orderNames).forEach(orderToken => {
        subscribeTouchline([`NSE|${orderToken}`]);
      });
    }, 3000);
  };

  websocket.onmessage = function (event) {
    const message = JSON.parse(event.data);
    switch (message.t) {
      case "ck":
        // Connect acknowledgement
        if (message.s.toLowerCase() === "ok") {
          console.log("Connection successful for user:", message.uid);
        } else {
          console.error("Connection failed:", message.s);
        }
        break;
      case "tk":
        if (message.tk === "26000") {
          createNiftyDataField(message);
        } else {
          createOrdersDataField(message);
        }
        break;
      case "tf":
        // Touchline feed update
        if (message.tk === "26000") {
          createNiftyDataField(message);
        } else {
          createOrdersDataField(message);
        }
        break;
      case "dk":
        // Depth subscription acknowledgement
        break;
      case "df":
        // Depth feed update
        console.log("Depth update:", message);
        break;
      case "ok":
        // Order update subscription acknowledgement
        break;
      case "om":
        // Order update message
        getOrders();
        break;
    }
  };

  websocket.onerror = function (error) {
    console.error("WebSocket error observed:", error);
  };
}

function reconnect() {
  console.log("Reconnecting...");
  connectWebSocket();
}

function subscribeTouchline(scripList) {
  const subscribeRequest = {
    t: "t",
    k: scripList.join("#"),
  };

  websocket.send(JSON.stringify(subscribeRequest));
}

function unsubscribeTouchline(scripList) {
  const unsubscribeRequest = {
    t: "u",
    k: scripList.join("#"),
  };

  websocket.send(JSON.stringify(unsubscribeRequest));
}

function subscribeDepth(scripList) {
  const subscribeDepthRequest = {
    t: "d",
    k: scripList.join("#"),
  };

  websocket.send(JSON.stringify(subscribeDepthRequest));
}

function unsubscribeDepth(scripList) {
  const unsubscribeDepthRequest = {
    t: "ud",
    k: scripList.join("#"),
  };

  websocket.send(JSON.stringify(unsubscribeDepthRequest));
}

function subscribeOrderUpdate(accountId) {
  const subscribeOrderUpdateRequest = {
    t: "o",
    actid: accountId,
  };

  websocket.send(JSON.stringify(subscribeOrderUpdateRequest));
}

function unsubscribeOrderUpdate() {
  const unsubscribeOrderUpdateRequest = {
    t: "uo",
  };
  websocket.send(JSON.stringify(unsubscribeOrderUpdateRequest));
}

function createNiftyDataField(data) {
  if (data && data.ft && data.lp && data.pc) {
    var sym;
    const date = new Date(data.ft * 1000);
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true, // Enable 12-hour format with AM/PM
    };
    const time = date.toLocaleTimeString("en-US", options);
    if (data.pc) {
      sym = data.pc > 0 ? "+" : "";
    }
    document.getElementById("nifty-tag").innerHTML = `
      Nifty: ${data.lp} (${sym}${data.pc}%) Time: ${time}
    `;
  }
}

function createOrdersDataField(data) {
  if (data && data.lp && data.pc) {
    var sym;
    if (data.pc) {
      sym = data.pc > 0 ? "+" : "";
    }
    const ordersTag = document.getElementById("orders-tag");
    const orderTag = ordersTag.querySelector("#order-" + data.tk);
    if (orderTag) {
      orderTag.innerHTML = `
        ${orderNames[data.tk].split("-")[0]}: ${data.lp} (${sym}${data.pc}%)
      `;
    } else {
      ordersTag.innerHTML += `
      <div class="order-tag" id="order-${data.tk}">${
        orderNames[data.tk].split("-")[0]
      }: ${data.lp} (${sym}${data.pc}%)</div>

    `;
    }
  }

  if (isStoreDepth) {
    const depthData = storeDepth(data);
    
    if (document.getElementById("enable-show-hide").checked && depthData.time) {
      addDepthRow(depthData);
    }
  }
}

  const headers = ["token", "time", "buyPrice", "buyQty", "vol", "sellPrice", "sellQty", "curPrice"];
  
function addDepthRow(data) {
  var table = document.getElementById('table-list').getElementsByTagName('tbody')[0];
  if(table) {
    var newRow = table.insertRow();
      headers.forEach((header) => {
        const cell = newRow.insertCell();
        if(header === "time") {
          const date = new Date(parseInt(data[header]) * 1000);
          let options = {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          };
          const time = date.toLocaleTimeString("en-US", options).replace(/ ?(AM|PM)$/i, '');
          cell.textContent = time;
        } else if (header === "token") {
          const name = orderNames[data[header]].split('-')[0];
          cell.textContent = name;
        }
        else {
          cell.textContent = data[header];
        }
      });
  }
}

var depthDataArray = [];

document
  .getElementById("enable-checkbox")
  .addEventListener("change", function () {
    isStoreDepth = this.checked;
  });
  
document
  .getElementById("clear-button")
  .addEventListener("click", function () {
    document.getElementById("table-list").style.display = "none";
    document.getElementById("table-list").innerHTML = '';
    depthDataArray = [];
  });
  
document
  .getElementById("enable-show-hide")
  .addEventListener("change", function () {
    isChecked = this.checked;
    if (isChecked) {
      generateTable(depthDataArray);
      document.getElementById("table-list").style.display = 'block';
    } else {
      document.getElementById("table-list").style.display = "none";
      document.getElementById("table-list").innerHTML = '';
    }
  });

function storeDepth(data) {
  depthData = {};
  
  if (data.bp1 || data.bq1 || data.sp1 || data.sq1 || data.v || data.lp) {
    if (data.tk) {
      depthData.token = data.tk;
    }
    if (data.ft) {
      depthData.time = data.ft;
    }
    if (data.bp1) {
      depthData.buyPrice = data.bp1;
    }
    if (data.bq1) {
      depthData.buyQty = data.bq1;
    }
    if (data.sp1) {
      depthData.sellPrice = data.sp1;
    }
    if (data.sq1) {
      depthData.sellQty = data.sq1;
    }
    if (data.v) {
      depthData.vol = data.v;
    }
    if (data.lp) {
      depthData.curPrice = data.lp;
    }
    depthDataArray.push(depthData);
  }
  return depthData;
}

function saveFile() {
  try {
    const jsonString = JSON.stringify(depthDataArray);

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error saving file:", error);
  }
}

// Example usage of the subscription functions
// subscribeTouchline(['NSE|22', 'BSE|508123']);
// unsubscribeTouchline(['NSE|22', 'BSE|508123']);

// unsubscribeDepth(['NSE|22', 'BSE|508123']);
// subscribeOrderUpdate('your_account_id');
// unsubscribeOrderUpdate();

function generateTable(data) {
  const table = document.createElement("table");
  const headerRow = table.insertRow();
  headers.forEach((headerText) => {
    const headerCell = document.createElement("th");
    headerCell.textContent = headerText;
    headerRow.appendChild(headerCell);
  });

  // Add rows with data
  data.forEach((item) => {
    const row = table.insertRow();
    headers.forEach((header) => {
      const cell = row.insertCell();
      if(header === "time") {
        const date = new Date(parseInt(item[header]) * 1000);
        let options = {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true, // Enable 12-hour format with AM/PM
        };
        const time = date.toLocaleTimeString("en-US", options).replace(/ ?(AM|PM)$/i, '');
        cell.textContent = time;
      } else if (header === "token") {
          const name = orderNames[item[header]].split('-')[0];
          cell.textContent = name;
        }
      else {
        cell.textContent = item[header];
      }
    });
  });

  // Append the table to the div with id 'table-list'
  const tableList = document.getElementById("table-list");
  tableList.innerHTML = ""; // Clear any existing content
  tableList.appendChild(table);
}

// Event listener for file extraction
const fileInput = document.getElementById("file-input");
const customButton = document.getElementById("custom-file-upload-button");

// Event listener for the custom button click
customButton.addEventListener("click", function () {
  fileInput.click(); // Trigger the hidden file input click
});

fileInput.addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = JSON.parse(e.target.result);
      generateTable(data); // Generate the table with the extracted data
    };
    reader.readAsText(file);
  }
});
