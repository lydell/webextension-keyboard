const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const nsIWindowMediator = Cc['@mozilla.org/appshell/window-mediator;1']
  .getService(Ci.nsIWindowMediator);

Cu.import('resource://gre/modules/Console.jsm');

class API extends ExtensionAPI {
  getAPI(context) {
    return {
      keyboardshortcutactions: {
        // A demo method:
        selectLocationBar() {
          // A real implementation of this API would of course share code with
          // the actual Firefox keyboard shortcut.
          const window =
            nsIWindowMediator.getMostRecentWindow('navigator:browser');
          window.focusAndSelectUrlBar();
        },

        // The proposed Firefox keyboard shortcut for “escaping” from UI
        // elements, returning focus to the content:
        focusContent() {
          console.log('focusContent');
          // TODO: Implement.
        },

        // More methods for a real implementation:
        // back
        // forward
        // home
        // openFile
        // reload
        // reloadOverrideCache
        // stop
        // goDownAScreen
        // goUpAScreen
        // goToBottomOfPage
        // goToTopOfPage
        // moveToNextFrame
        // moveToPreviousFrame
        // print
        // savePageAs
        // zoomIn
        // zoomOut
        // zoomReset
        // copy
        // cut
        // delete
        // paste
        // pasteAsPlainText
        // redo
        // selectAll
        // undo
        // find
        // findAgain
        // findPrevious
        // quickFindLinksOnly
        // quickFind
        // closeFind
        // closeTab
        // closeWindow
        // moveLeft
        // moveRight
        // moveToStart
        // moveToEnd
        // toggleMute
        // newTab
        // newWindow
        // newPrivateWindow
        // nextTab
        // previousTab
        // undoCloseTab
        // undoCloseWindow
        // selectTab1
        // selectTab2
        // selectTab3
        // selectTab4
        // selectTab5
        // selectTab6
        // selectTab7
        // selectTab8
        // selectLastTab
        // historySidebar
        // libraryWindowHistory
        // clearRecentHistory
        // bookmarkThisPage
        // bookmarksSidebar
        // libraryWindowBookmarks
        // downloads
        // addons
        // toggleDeveloperTools
        // webConsole
        // inspector
        // debugger
        // styleEditor
        // profiler
        // network
        // developerToolbar
        // responsiveDesignView
        // scratchpad
        // pageSource
        // browserConsole
        // pageInfo
        // toggleFullScreen
        // toggleMenuBar
        // toggleReaderMode
        // caretBrowsing
      },
    };
  }
}
