const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
const nsIWindowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
  .getService(Ci.nsIWindowMediator);
const messageManager = Cc['@mozilla.org/globalmessagemanager;1']
  .getService(Ci.nsIMessageListenerManager);
const { SingletonEventManager } = Cu.import('resource://gre/modules/ExtensionUtils.jsm', {});
const { AddonManager } = Cu.import('resource://gre/modules/AddonManager.jsm', {});

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/Console.jsm');

class ExtensionAPI {}

const shutdownListeners = [];

function onShutdown(listener) {
  shutdownListeners.push(listener);
}

// --- Start of code to copy to keyboard/api.js ---

let listenersAdded = false;
const textReceivingElementThatAContentScriptCannotAccessIsFocused = false;

const onKeyListeners = new Set();
const onKeyPreventableListeners = new Set();

class API extends ExtensionAPI {
  getAPI(context) {
    console.log('API#getAPI', {context, listenersAdded});

    if (!listenersAdded) {
      addListeners();
      listenersAdded = true;
    }

    return {
      keyboard: {
        onKey: new SingletonEventManager(context, 'keyboard.onKey', (fire) => {
          const callback = data => fire.sync(data);
          onKeyListeners.add(callback);
          return () => {
            onKeyListeners.remove(callback);
          };
        }).api(),

        onKeyPreventable: new SingletonEventManager(context, 'keyboard.onKeyPreventable', (fire) => {
          const callback = data => fire.sync(data);
          onKeyPreventableListeners.add(callback);
          return () => {
            onKeyPreventableListeners.remove(callback);
          };
        }).api(),
      },
    };
  }
}

function addListeners() {
  // TODO: messaging with frame.js
  getAddon((addon) => {
    const uri = addon.getResourceURI('frame.js').spec;
    messageManager.loadFrameScript(uri, true);
    onShutdown(() => {
      messageManager.removeDelayedFrameScript(uri);
    });
  });

  function register(window) {
    addKeyListener(window, false);
    addKeyListener(window, true);
    console.log('API#getAPI added listeners (should only be done once per window)');
  }

  for (const window of WindowListManager.browserWindows()) {
    register(window);
  }

  WindowListManager.addOpenListener(register);
  onShutdown(() => {
    WindowListManager.removeOpenListener(register);
  });
}

function addKeyListener(window, preventable = true) {
  let suppressKeyup = false;

  const keydownListener = (event) => {
    console.log(
      preventable ? 'Main PREVENTABLE keydown listener' : 'Main keydown listener',
      event
    );

    if (
      textReceivingElementThatAContentScriptCannotAccessIsFocused ||
      event.defaultPrevented
    ) {
      return;
    }

    const suppress = triggerListeners(prepareEvent(event), preventable);

    if (suppress) {
      event.preventDefault();
      event.stopPropagation();
      suppressKeyup = true;
    }
  };

  const keyupListener = (event) => {
    if (suppressKeyup) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  const useCapture = !preventable;
  window.addEventListener('keydown', keydownListener, useCapture);
  window.addEventListener('keyup', keyupListener, useCapture);
  onShutdown(() => {
    window.removeEventListener('keydown', keydownListener, useCapture);
    window.removeEventListener('keyup', keyupListener, useCapture);
  });
}

function triggerListeners(data, preventable) {
  const set = preventable ? onKeyPreventableListeners : onKeyListeners;
  console.log('triggerListeners', preventable, set);
  return Array.from(set)
    .map((listener) => {
      const suppress = listener(data);
      return suppress;
    })
    .some(Boolean);
}

function prepareEvent(event) {
  return {
    altKey: event.altKey,
    code: event.code,
    ctrlKey: event.ctrlKey,
    isComposing: event.isComposing,
    key: event.key,
    locale: event.locale,
    location: event.location,
    metaKey: event.metaKey,
    repeat: event.repeat,
    shiftKey: event.shiftKey,
    timeStamp: event.timeStamp,
  };
}

function getAddon(callback) {
  AddonManager.getAddonByID('keyboard-test@github.com', callback);
}

// --- End of code to copy to keyboard/api.js ---
//
// Testing code below:

// Copied from https://dxr.mozilla.org/mozilla-central/source/browser/components/extensions/ext-utils.js
// Manages listeners for window opening and closing. A window is
// considered open when the "load" event fires on it. A window is
// closed when a "domwindowclosed" notification fires for it.
const WindowListManager = {
  _openListeners: new Set(),
  _closeListeners: new Set(),

  // Returns an iterator for all browser windows. Unless |includeIncomplete| is
  // true, only fully-loaded windows are returned.
  * browserWindows(includeIncomplete = false) {
    // The window type parameter is only available once the window's document
    // element has been created. This means that, when looking for incomplete
    // browser windows, we need to ignore the type entirely for windows which
    // haven't finished loading, since we would otherwise skip browser windows
    // in their early loading stages.
    // This is particularly important given that the "domwindowcreated" event
    // fires for browser windows when they're in that in-between state, and just
    // before we register our own "domwindowcreated" listener.

    const e = Services.wm.getEnumerator('');
    while (e.hasMoreElements()) {
      const window = e.getNext();

      let ok = includeIncomplete;
      if (window.document.readyState == 'complete') {
        ok = window.document.documentElement.getAttribute('windowtype') == 'navigator:browser';
      }

      if (ok) {
        yield window;
      }
    }
  },

  addOpenListener(listener) {
    if (this._openListeners.size == 0 && this._closeListeners.size == 0) {
      Services.ww.registerNotification(this);
    }
    this._openListeners.add(listener);

    for (const window of this.browserWindows(true)) {
      if (window.document.readyState != 'complete') {
        window.addEventListener('load', this);
      }
    }
  },

  removeOpenListener(listener) {
    this._openListeners.delete(listener);
    if (this._openListeners.size == 0 && this._closeListeners.size == 0) {
      Services.ww.unregisterNotification(this);
    }
  },

  addCloseListener(listener) {
    if (this._openListeners.size == 0 && this._closeListeners.size == 0) {
      Services.ww.registerNotification(this);
    }
    this._closeListeners.add(listener);
  },

  removeCloseListener(listener) {
    this._closeListeners.delete(listener);
    if (this._openListeners.size == 0 && this._closeListeners.size == 0) {
      Services.ww.unregisterNotification(this);
    }
  },

  handleEvent(event) {
    event.currentTarget.removeEventListener(event.type, this);
    const window = event.target.defaultView;
    if (window.document.documentElement.getAttribute('windowtype') != 'navigator:browser') {
      return;
    }

    for (const listener of this._openListeners) {
      listener(window);
    }
  },

  observe(window, topic, data) {
    if (topic == 'domwindowclosed') {
      if (window.document.documentElement.getAttribute('windowtype') != 'navigator:browser') {
        return;
      }

      window.removeEventListener('load', this);
      for (const listener of this._closeListeners) {
        listener(window);
      }
    } else {
      window.addEventListener('load', this);
    }
  },
};

const keyboardAPI = new API();

function makeAPI() {
  return keyboardAPI.getAPI({
    active: true,
    runSafe: (callback, ...args) => {
      callback(...args);
    },
    callOnClose: () => {
      // Run when `.addListener` is run.
      console.log('callOnClose');
    },
    forgetOnClose: () => {
      // Run when `.removeListener');
      console.log('forgetOnClose');
    },
  });
}

function startup() {
  mock1(makeAPI());
  mock2(makeAPI());
}

function shutdown() {
  console.log('shutdown', new Set(shutdownListeners.map(l => typeof l)), shutdownListeners.length);
  shutdownListeners.forEach((listener) => {
    listener();
  });
  shutdownListeners.length = 0;
}

function install() {}

function uninstall() {}

function mock1(browser) {
  console.log('mock1 start', browser);

  browser.keyboard.onKey.addListener((event) => {
    console.log('mock1 onKey1', event);
    return true;
  });

  browser.keyboard.onKey.addListener((event) => {
    console.log('mock1 onKey2', event);
    return false;
  });
}

function mock2(browser) {
  console.log('mock2 start', browser);

  browser.keyboard.onKey.addListener((event) => {
    console.log('mock2 onKey2', event);
    return false;
  });

  browser.keyboard.onKeyPreventable.addListener((event) => {
    console.log('mock2 onKeyPreventable', event);
    return false;
  });
}
