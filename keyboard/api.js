const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const nsIWindowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
  .getService(Ci.nsIWindowMediator);
const messageManager = Cc['@mozilla.org/globalmessagemanager;1']
  .getService(Ci.nsIMessageListenerManager);
const {EventManager} = Cu.import('resource://gre/modules/ExtensionUtils.jsm', {});
const {AddonManager} = Cu.import('resource://gre/modules/AddonManager.jsm', {});

Cu.import('resource://gre/modules/Console.jsm');

console.log('global', this);

// NOTE: Currently, this file only contains simple testing code just to see if I
// could get a WebExtension experiment going. The "real" implementation lives in
// keyboard-test/bootstrap.js, because I found it easier to develop a "regular
// bootstrapped" add-on. The idea is that it will be possible to simple copy
// code from there and it will just work.

class API extends ExtensionAPI {
  getAPI(context) {
    console.log('context', context);

    // Frame script test.
    AddonManager.getAddonByID(
      'keyboard@experiments.addons.mozilla.org',
      addon => {
        const uri = addon.getResourceURI('frame.js').spec;
        messageManager.loadFrameScript(uri, true);
      }
    );

    return {
      keyboard: {
        onKey: new EventManager(context, 'keyboard.onKey', fire => {
          console.log('keyboard.onKey.addListener', fire);
          const window =
            nsIWindowMediator.getMostRecentWindow('navigator:browser');
          window.setTimeout(() => {
            fire({key: 'a'});
          }, 0);
          return () => {
            console.log('keyboard.onKey.removeListener', fire);
          };
        }).api(),

        onKeyPreventable: new EventManager(context, 'keyboard.onKeyPreventable', fire => {
          console.log('keyboard.onKeyPreventable.addListener', fire);
          const window =
            nsIWindowMediator.getMostRecentWindow('navigator:browser');
          window.setTimeout(() => {
            fire({key: 'b'});
          }, 0);
          return () => {
            console.log('keyboard.onKeyPreventable.removeListener', fire);
          };
        }).api(),
      },
    };
  }
}
