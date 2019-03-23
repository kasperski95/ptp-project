const electron = require('electron');
const SerialPort = require('serialport');



electron.app.on('ready', () => {
  let win = new electron.BrowserWindow({width: 800, height: 600});
  //win.setMenu(null);
  win.loadFile('index.html');
  
  win.webContents.on('did-finish-load', () => {
    let data = new Array(30).fill({x: Date.now() - 10000, y: 0});
    let labels = new Array(30).fill( Date.now() - 10000);  

    // BEGIN SERIAL PORT STUFF
    let uart = new SerialPort('COM3', {
      baudRate: 38400,
    })
    uart.on('data', (arg) => {
      console.log(arg);
    })
    // END SERIAL PORT STUFF

    setInterval(() => {
      data.shift();
      data.push({x: Date.now(), y: Math.random() * 50 % 50});
      labels.shift();
      labels.push(new Date().getSeconds());
    }, 1000)

    setInterval(() => {
      let y = data[data.length-1].y;
      data[data.length-1] = {x: Date.now(), y};
      win.webContents.send('update', {labels, data});
    }, 16)
  })
})
