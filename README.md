# WebExtension Keyboard API proposals

This repository contains [WebExtension] API proposals related to keyboard
handling.

Bugzilla: [Bug 1215061 - Better keyboard shortcut support][bug-1215061]

Check out the [releases] page to see previous versions and what has changed!


## Motivation

- Allow creating add-ons whose purpose is to customize Firefox’s own keyboard
  shortcuts. Current add-ons that do this:

  - [Menu Wizard] \(Promoted here: https://support.mozilla.org/kb/keyboard-shortcuts-perform-firefox-tasks-quickly)
  - [Keybinder]
  - [keyconfig] \(See also: https://addons.mozilla.org/firefox/addon/dorando-keyconfig/)

- Allow creating add-ons that provide a different way of doing keyboard
  shortcuts. Current add-ons that do this:

  - [VimFx]
  - [Vimperator]
  - [Pentadactyl]

The main motivation is to make it possible to convert VimFx to a WebExtension.
Actually, the proposed APIs are very close to how VimFx works today.

I’ve thought hard about the problem, and gone through many API ideas. I think
that the proposed APIs strike a good balance between general usability,
simplicity (in terms of usage and maintenance) and security.

(While the proposed APIs provide the missing parts for VimFx, don’t expect them
to be enough for Vimperator and Pentadactyl as well. I think these APIs should
be usable for those extensions, but I believe they need some way to add new UI
to Firefox as well. That’s out of scope here.)

Chrome has the [Vimium] extension, which is similar to Vimperator and VimFx.
Vimium listens for keydown events in content scripts (there’s nothing else
available). People keep requesting the same features from Vimium, but there’s
nothing they can do, because the Chrome extension API does not allow them:

- Vimium can’t focus or blur the location bar. Instead, they’ve built their own
  location bar. There are no APIs for dealing with the location bar. Even if
  they were, Vimium couldn’t bind the Escape key to do the blurring when inside
  the location bar. You can be similarly “trapped” inside the dev tools, for
  instance.
- Vimium can’t interact with the find bar. Instead, they’ve built their own.
- Vimium can’t do anything on chrome:// tabs, new-tab-page tabs, or any tabs
  where Chrome decided not to allow extensions. This is especially bad when
  using the shortcut to focus the next tab. If you come across a disallowed tab,
  you get stuck there and can’t move on (with Vimium shortcuts).


## API summary

- `browser.keyboard.onKey` and `browser.keyboard.onKeyPreventable` are low-level
  events for custom key press handling (unlike [`browser.commands.onCommand`]
  which is high-level).
- `browser.keyboardShortcutActions` contains simple functions to trigger
  standard Firefox keyboard shortcuts programmatically.
- A way to “escape” from the location bar (and other Firefox UI elements that
  can receive keyboard input) and return to the “content area.”

The above three bullet points are discussed and documented in the next three
sections.


## `browser.keyboard`

Requires permission: Yes, since the add-on will be able to disable all Firefox
shortcuts.

Only available in background scripts.

`browser.keyboard` only contains two events: `onKey` and `onKeyPreventable`.
They follow the same structure as all other `browser.*.on*` objects:

- `browser.keyboard.onKey.addListener(listener)`
- `browser.keyboard.onKey.removeListener(listener)`
- `browser.keyboard.onKey.hasListener(listener)`
- (The same thing for `browser.keyboard.onKeyPreventable`.)

The difference between `browser.keyboard.onKey` and
`browser.keyboard.onKeyPreventable` is:

- `browser.keyboard.onKey` runs before the web page even knows that a key has
  been pressed. Users of Vim-style browser extensions typically don’t want web
  pages to be able to prevent their keyboard shortcuts.
- `browser.keyboard.onKeyPreventable` runs _after_ the key press has gone
  through the web page, and not if the web page calls `event.preventDefault()`.

Differences to `browser.commands.onCommand`:

- Allows any key press as a keyboard shortcut, not just
  [“modifier+key”][shortcut-values] shortcuts (more or less).
- Are added programmatically, rather than through manifest.json.
- Can be removed programmatically.
- The add-on must examine an `event` object to tell which keys were pressed and
  determine if one of its keyboard shortcuts was matched, rather than providing
  a string representing the keyboard shortcut to Firefox.
- No restrictions on the number of shortcuts.

`browser.commands.onCommand` will still be the promoted API for add-ons that
only add a couple of keyboard shortcuts to some of its functionality.
`browser.keyboard.onKey` and `browser.keyboard.onKeyPreventable` are for add-ons
whose sole purpose is dealing with keyboard shortcuts in a more advanced way.

`browser.keyboard.onKey` and `browser.keyboard.onKeyPreventable` can override:

- Firefox keyboard shortcuts.
- `browser.onCommand` shortcuts.

If several WebExtensions use `browser.keyboard.onKey` and
`browser.keyboard.onKeyPreventable` listeners, _all_ of them will fire. In
reality, users will only install one keyboard shortcut related extension at a
time. Having several is like cramming two AIs for self driving cars into the
same vehicle and hoping for the best.

Differences to adding a `'keydown'` event listener in a content script:

- That will only work when the content script has loaded.
- That will only work in tabs that have a content script. Not on `about:` pages,
  for example.
- Having the keyboard handling in the main process means that slow web pages
  can’t make the keyboard shortcuts slow.

(The above limitations is what Vimium has to live with, as mentioned earlier.)

### Details

`browser.keyboard.onKey` and `browser.keyboard.onKeyPreventable` listeners are
triggered on the `'keydown'` event, a bit like this (in terms of DOM APIs; the
browser is of course allowed to use whatever its UI framework provides):

```js
uiWindow.addEventListener(
  'keydown',
  event => {
    if (
      textReceivingElementThatAContentScriptCannotAccessIsFocused() ||
      event.defaultPrevented
    ) {
      return
    }
    const suppress = triggerListeners(prepareEvent(event))
    if (suppress) {
      event.preventDefault()
      event.stopPropagation()
      suppressNextKeyupEvent()
    }
  },
  isOnKeyPreventable ? false : true
)
```

The return value of a `browser.keyboard.onKey` listener determines if the
`'keydown'` event that triggered it, as well as the corresponding `'keypress'`
and `'keyup'` events, should be suppressed or not.

- If a truthy value is returned, the events should be suppressed.
- If a falsy value is returned, the events should _not_ be suppressed.

“Supressing“ an event means:

- Firefox keyboard shortcuts (if any) are _not_ run.
- The web page does not receive some key events:
  - For `browser.keyboard.onKey`: The web page never receives the `'keydown'`,
    `'keypress'` and `'keyup'` events.
  - For `browser.keyboard.onKeyPreventable`: The web page _does_ receive the
    `'keydown'`, `'keypress'` and `'keyup'` events, and has the chance to call
    `event.preventDefault()` in the `'keydown'` event. The three events are only
    suppressed _after_ bubbling up from the web page, so that they don't trigger
    anything in Firefox.

(Note that add-ons will be able to disable every Firefox shortcut by using
`browser.keyboard.onKey(() => true)` (while a previous version of this proposal
made that harder). I think this is fine, though: The user can still type in UI
text input elements, and can remove the extension by clicking. See [issue #3]
for more information.)

If any element that can receive text input, but cannot be manipulated from a
content script, is focused, `browser.keyboard.onKey` and
`browser.keyboard.onKeyPreventable` won't run. This includes:

- Firefox UI element that can receive keyboard input, such as the location bar.
- Elements in `about:` pages.
- addons.mozilla.org

Reasons for the restrictions on _when_ `browser.keyboard.onKey` and
`browser.keyboard.onKeyPreventable` are run include:

- This is because add-ons such as VimFx wants to add single-letter keyboard
  shortcuts. For example: `t` to open a new tab. If that listener were to be
  triggered in the location bar, the user wouldn’t be able to type URLs
  containing `t`s.
- This also provides security: An add-on cannot cripple Firefox into not being
  able to type anything in its UI.
- This is why a way to “escape” from the location bar (and other Firefox UI
  elements that can receive keyboard input) and return to the “content area” is
  so important (more on this later).

If am element that can receive text input, and _can_ be manipulated from a
content script, is focused, `browser.keyboard.onKey` and
`browser.keyboard.onKeyPreventable` _are_ run. It is up to the add-on author to
keep track of the currently focused element in a content script, send that back
to the background script and decide whether or not to suppress key events (that
is, deciding whether to return `true` or `false`.)

- Add-ons such as VimFx needs to keep track of the currently focused element
  anyway, since its toolbar button (browser action) changes color based on it.
  This allows the user to see if the key presses will result in typed characters
  or triggered VimFx commands.
- This allows add-ons (such as VimFx) to provide keyboard shortcuts that work
  even in text inputs.
- (This is also how VimFx works today.)

### The listener parameter

It is a function that will be called when keys are pressed. It receives one
argument, a [KeyboardEvent] object.

Regarding the KeyboardEvent:

- `event.type` is always `'keydown'`.
- Any property that isn’t a string, a number or a boolean are set to
  `undefined`, since UI elements cannot be exposed, and it doesn’t make sense to
  run `.preventDefault()`, for instance. Example properties: `event.view`,
  `event.currentTarget`, `event.target` and `event.preventDefault`.

The most important properties for API consumers are:

- key
- code
- altKey
- ctrlKey
- metaKey
- shiftKey

The return value of `listener` determines if the `'keydown'` event that
triggered it, as well as the corresponding `'keypress'` and `'keyup'` events,
should be suppressed or not.

- If a truthy value is returned, the events should be suppressed.
- If a falsy value is returned, the events should _not_ be suppressed.


## `browser.keyboardShortcutActions`

Requires permission: No.

Only available in background scripts.

This is an object, whose properties are simple functions that take no arguments.
Calling such a function is exactly the same as pressing the keys needed to
trigger a Firefox keyboard shortcut. For example:

```js
browser.keyboardShortcutActions.selectLocationBar()
```

The properties are named like the keyboard shortcuts are named here:
https://support.mozilla.org/en-US/kb/keyboard-shortcuts-perform-firefox-tasks-quickly

Since all the functions take no arguments and only promise to do trigger a
keyboard shortcut action, they shouldn’t cause any maintenance or backwards
compatibility problems.


## “Escaping” from UI elements

The suggestion is to implement this as
`browser.keyboardShortcutActions.focusContent()`, even though there is no
Firefox keyboard shortcut to do this today (but the F6 shortcut comes close).
However, I think this is a good keyboard shortcut to add. This way, there’s no
need to add a new API just for this little feature.


## How VimFx intends to use these APIs

- Add one single `browser.keyboard.onKey` listener and one single
  `browser.keyboard.onKeyPreventable` listener.

  In both listeners, VimFx will:

  - Invoke commands based on user preferences.
  - Invoke commands based on the current “Vim” mode.
  - Show the keys pressed so far in multi-key shortcuts.
  - Return `true` (to suppress the event) if:
    - A command was matched.
    - A command was _partially_ matched. (See [issue #3] for more information.)

- Add a `browser.commands` command with the shortcut Ctrl+E that runs
  `browser.keyboardShortcutActions.focusContent()`. That will be the way to
  “exit” the location bar, for example.

- Use most of the functions in `browser.keyboardShortcutActions`.


[`browser.commands.onCommand`]: https://developer.mozilla.org/Add-ons/WebExtensions/API/commands/onCommand
[bug-1215061]: https://bugzilla.mozilla.org/show_bug.cgi?id=1215061
[issue #3]: https://github.com/lydell/webextension-keyboard/issues/3
[Keybinder]: https://addons.mozilla.org/firefox/addon/keybinder/
[KeyboardEvent]: https://developer.mozilla.org/docs/Web/API/KeyboardEvent
[keyconfig]: http://forums.mozillazine.org/viewtopic.php?t=72994
[Menu Wizard]: https://addons.mozilla.org/firefox/addon/s3menu-wizard/
[Pentadactyl]: https://addons.mozilla.org/firefox/addon/pentadactyl/
[releases]: https://github.com/lydell/webextension-keyboard/releases
[shortcut-values]: https://developer.mozilla.org/Add-ons/WebExtensions/manifest.json/commands#Shortcut_values
[VimFx]: https://addons.mozilla.org/firefox/addon/vimfx/
[Vimium]: https://github.com/philc/vimium/
[Vimperator]: https://addons.mozilla.org/firefox/addon/vimperator/
[WebExtension]: https://developer.mozilla.org/Add-ons/WebExtensions
