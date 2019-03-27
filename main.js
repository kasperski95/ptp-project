const electron = require('electron');
const SerialPort = require('serialport');
const ByteLength = require('@serialport/parser-byte-length')



// CONFIG FROM ARGS
let updateIntervalHandler;
let connect;
let connection;

electron.app.on('ready', () => {
  const win = new electron.BrowserWindow({width: 800, height: 600});
  win.setMenu(null);
  win.loadFile('index.html');
  win.webContents.on('did-finish-load', () => {
    const config = {
      samplesPerSecond: 100,
      chartSpanInMs: 10000,
      samplesAhead: 3,
      packSize: 5
    }

    // init
    const startTime = Date.now();
    let data = new Array(config.chartSpanInMs / 1000 * config.samplesPerSecond + config.samplesAhead).fill({x: Date.now() - startTime - config.chartSpanInMs, y: -1});

    // serialport stuff
    connect = (connectionConfig) => {
      if (!connectionConfig.portName || !connectionConfig.baudRate) return;

      let uart = new SerialPort(connectionConfig.portName, {baudRate: parseInt(connectionConfig.baudRate)}, () => {})
      
      const parser = uart.pipe(new ByteLength({length: 2}));
      let packCounter = 0;
      let packSum;
      parser.on('data', (arg) => {
        packSum += convertInputToDistance(arg[0] * 256 + arg[1]);
        packCounter = (packCounter + 1) % config.packSize;

        // pack values to make chart smoother
        if (packCounter == 0) {
          packSum /= config.packSize;
          data.shift();
          data.push({x: Date.now() - startTime, y: packSum});
          packSum = 0;
        }
      })

      return uart;
    }


    // update 60 times per second
    updateIntervalHandler = setInterval(() => {
      let y = data[data.length-1].y;
      data[data.length-1] = {x: Date.now() - startTime, y};
      win.webContents.send('update', {data, config, startTime});
    }, 1000/60);
  })
})



// on close
electron.app.on('window-all-closed', () => {
  clearInterval(updateIntervalHandler);
  electron.app.quit();
})


electron.ipcMain.on('update-config', (e, config) => {
  if (connection)
    connection.close(() => {connection = connect(config);})
  else
    connection = connect(config);  
})


//----------------------------------------------------------------------------------
// UTILS

function convertInputToDistance(x) {
  let voltage = x * (3.3 / 4096);
  let distance = -2.99702 * Math.pow(voltage,3) + 20.0823 * Math.pow(voltage,2) - 45.7232 * voltage + 40.3485;
  return Math.min(Math.max(distance, 3), 30);
}  