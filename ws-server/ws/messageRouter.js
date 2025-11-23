const { plugins } = require('../plugins/user/customPluginLoader');
function handleMessageRouter(ws, wss) {
  ws.on('message', async msg => {
    try {
      const data = JSON.parse(msg);
      if (data.plugin && plugins[data.plugin]) {
        const result = await plugins[data.plugin](data.params, ws, wss);
        ws.send(JSON.stringify({ type: 'plugin_result', plugin: data.plugin, result }));
      }
    } catch { }
  });
}
module.exports = { handleMessageRouter }; 