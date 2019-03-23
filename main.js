const electron = require('electron');
const SerialPort = require('serialport');
const ByteLength = require('@serialport/parser-byte-length')

let intervalHandler;

electron.app.on('ready', () => {
  let win = new electron.BrowserWindow({width: 800, height: 600});
  win.setMenu(null);
  win.loadFile('index.html');
  
  win.webContents.on('did-finish-load', () => {
    const config = {
      samplesPerSecond: 100,
      chartSpanInMs: 10000,
      samplesAhead: 3,
      packSize: 5
    }
    let startTime = Date.now();
    let data = new Array(config.chartSpanInMs / 1000 * config.samplesPerSecond + config.samplesAhead).fill({x: Date.now() - startTime - 10000, y: -1});
    let labels = new Array(config.chartSpanInMs / 1000 * config.samplesPerSecond + config.samplesAhead).fill( Date.now() - startTime - 10000);  

    // BEGIN SERIAL PORT STUFF
    let uart = new SerialPort('COM3', {
      baudRate: 38400,
    })
    const parser = uart.pipe(new ByteLength({length: 2}))
    let packCoutner = 0;
    let packSum;
    parser.on('data', (arg) => {
      let result = arg[1] + arg[0] * 256;

      // convert to distance
      let distance = convertInputToDistance(result);


      packSum += distance;
      packCoutner = (packCoutner + 1) % config.packSize;

      // pack to make chart smoother
      if (packCoutner == 0) {
        packSum /= config.packSize;
        data.shift();
        data.push({x: Date.now() - startTime, y: packSum});
        packSum = 0;
  
      }
      

    })
    // END SERIAL PORT STUFF

    intervalHandler = setInterval(() => {
      let y = data[data.length-1].y;
      data[data.length-1] = {x: Date.now() - startTime, y};
      win.webContents.send('update', {labels, data, config, startTime});
    }, 16)
  })
})


electron.app.on('window-all-closed', () => {
  clearInterval(intervalHandler);
  electron.app.quit();
})



function convertInputToDistance(x) {
  let voltage = x * (3.3 / 4096);
  //let distance = -5.40274 * Math.pow(voltage,3) + 28.4823 * Math.pow(voltage,2) - 49.7115 * voltage + 31.3444;
  let distance = -2.99702 * Math.pow(voltage,3) + 20.0823 * Math.pow(voltage,2) - 45.7232 * voltage + 40.3485;
  return Math.min(Math.max(distance, 3), 30);
}