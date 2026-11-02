function createSednaAutomation(tabId, basePayload) {
  const target = {tabId};
  let attached = false, fault = null, armed = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve,ms));
  const check = () => { if (fault) throw Error(fault); };
  async function execute(action, extra = {}) {
    check();
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url?.startsWith('https://sedna.sanandres.esc.edu.ar/')) throw Error('La pestaña dejó de estar en Sedna.');
    const result = await chrome.scripting.executeScript({target,func:sednaPage,args:[action,{...basePayload,...extra}]});
    const response = result[0]?.result;
    if (!response?.ok) throw Error(response?.error || 'Sedna no respondió.');
    return response;
  }
  async function waitNew(token) {
    const deadline = Date.now()+30000;
    let lastError;
    while (Date.now()<deadline) {
      check();
      try {
        const state = await execute('state');
        if (state.ready && state.token !== token) return state;
      } catch(error) { lastError = error; }
      await sleep(300);
    }
    throw Error('No se confirmó una página nueva de Sedna en 30 segundos. ' + (lastError?.message || 'No se reintentó el guardado.'));
  }
  const onDetach = (source) => { if(source.tabId === tabId && attached) fault = 'Se interrumpió la conexión con Sedna. Revisá la última clase antes de reintentar.'; };
  const onEvent = (source,method,params) => {
    if(source.tabId !== tabId) return;
    if (method === 'Page.javascriptDialogOpening') {
      const accept = armed && ['alert','confirm'].includes(params.type);
      if(!accept) fault = 'Sedna abrió un diálogo inesperado. Carga detenida.';
      chrome.debugger.sendCommand(target,'Page.handleJavaScriptDialog',{accept}).catch(() => {fault = 'No se pudo resolver el diálogo de Sedna.';});
    }
  };
  return {
    check,
    async open() {
      // Browser debugger permission is used only for native alert/confirm dialogs.
      // Prevent two assistants from operating the same tab: attach fails if busy.
      await chrome.debugger.attach(target,'1.3'); attached = true;
      chrome.debugger.onEvent.addListener(onEvent); chrome.debugger.onDetach.addListener(onDetach);
      await chrome.debugger.sendCommand(target,'Page.enable');
      await chrome.debugger.sendCommand(target,'Network.enable');
      await chrome.debugger.sendCommand(target,'Network.setCacheDisabled',{cacheDisabled:true});
      await chrome.debugger.sendCommand(target,'Network.setBypassServiceWorker',{bypass:true});
    },
    async fresh() {
      const state = await execute('state');
      // Navigate with GET (not reload of a POST response, which could resubmit).
      await chrome.tabs.update(tabId,{url:state.current.url});
      await waitNew(state.token);
    },
    async execute(action, extra = {}) {
      if(action === 'selectReady') {
        const state = await execute('select',extra);
        if(state.changed) await waitNew(state.token);
        return;
      }
      if(action === 'saveReady') {
        armed = true;
        try { const state = await execute('save',extra); await waitNew(state.token); }
        finally { armed = false; }
        return;
      }
      return execute(action,extra);
    },
    async close() {
      if(attached) {
        // Restore debugger network overrides even if Chrome retains them until detach.
        await chrome.debugger.sendCommand(target,'Network.setCacheDisabled',{cacheDisabled:false}).catch(()=>{});
        await chrome.debugger.sendCommand(target,'Network.setBypassServiceWorker',{bypass:false}).catch(()=>{});
        attached = false;
        await chrome.debugger.detach(target).catch(()=>{});
      }
      chrome.debugger.onEvent.removeListener(onEvent); chrome.debugger.onDetach.removeListener(onDetach);
    }
  };
}
