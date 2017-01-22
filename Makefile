.PHONY: clean
clean:
	rm -f *.xpi

.PHONY: lint
lint:
	./node_modules/.bin/eslint '{keyboard*,vimfx}/*.js' $(args)

keyboard.xpi:
	cd keyboard; zip ../keyboard.xpi *

.PHONY: keyboard
keyboard: keyboard.xpi
	wget --quiet --post-file=keyboard.xpi http://localhost:8888/; exit 0

keyboard-test.xpi:
	cd keyboard-test; zip ../keyboard-test.xpi *

.PHONY: keyboard-test
keyboard-test: keyboard-test.xpi
	wget --quiet --post-file=keyboard-test.xpi http://localhost:8888/; exit 0

keyboardshortcutactions.xpi:
	cd keyboardshortcutactions; zip ../keyboardshortcutactions.xpi *

.PHONY: keyboardshortcutactions
keyboardshortcutactions: keyboardshortcutactions.xpi
	wget --quiet --post-file=keyboardshortcutactions.xpi http://localhost:8888/; exit 0

.PHONY: vimfx
vimfx:
	web-ext --source-dir vimfx run --firefox firefox-nightly --firefox-profile web-ext --verbose
