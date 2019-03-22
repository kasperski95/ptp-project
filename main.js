const electron = require('electron');




electron.app.on('ready', () => {
  let win = new electron.BrowserWindow({width: 800, height: 600});
  //win.setMenu(null);
  win.loadFile('index.html');

  
  win.webContents.on('did-finish-load', () => {
    let data = new Array(30).fill({x: Date.now(), y: 0});
    let labels = new Array(30).fill( Date.now());  

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
