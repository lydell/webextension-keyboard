console.log('VimFx-webext background.js start')

browser.commands.onCommand.addListener(name => {
  console.log('VimFx-webext onCommand', name)

  switch (name) {
    case 'select_location_bar':
      browser.keyboardshortcutactions.selectLocationBar()
      break

    case 'focus_content':
      browser.keyboardshortcutactions.focusContent()
      break
  }
})

browser.keyboard.onKey.addListener(event => {
  console.log('VimFx-webext onKey', event)
})

browser.keyboard.onKeyPreventable.addListener(event => {
  console.log('VimFx-webext onKeyPreventable', event)
})
