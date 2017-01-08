const {classes: Cc, interfaces: Ci, utils: Cu} = Components
const nsIWindowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
  .getService(Ci.nsIWindowMediator)
const {EventManager} = Cu.import('resource://gre/modules/ExtensionUtils.jsm', {})

Cu.import('resource://gre/modules/Console.jsm')

class API extends ExtensionAPI {
  getAPI(context) {
    console.log('context', context)
    return {
      keyboard: {
        onKey: new EventManager(context, 'keyboard.onKey', fire => {
          console.log('keyboard.onKey.addListener', fire)
          const window =
            nsIWindowMediator.getMostRecentWindow('navigator:browser')
          window.setTimeout(() => {
            fire({type: 'keydown', key: 'a'})
          }, 0)
          return () => {
            console.log('keyboard.onKey.removeListener', fire)
          }
        }).api(),

        onKeyPreventable: new EventManager(context, 'keyboard.onKeyPreventable', fire => {
          console.log('keyboard.onKeyPreventable.addListener', fire)
          const window =
            nsIWindowMediator.getMostRecentWindow('navigator:browser')
          window.setTimeout(() => {
            fire({type: 'keydown', key: 'b'})
          }, 0)
          return () => {
            console.log('keyboard.onKeyPreventable.removeListener', fire)
          }
        }).api(),
      },
    }
  }
}
