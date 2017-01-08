.PHONY: clean
clean:
	rm -f *.xpi

keyboardshortcutactions.xpi:
	cd keyboardshortcutactions; zip ../keyboardshortcutactions.xpi *

.PHONY: keyboardshortcutactions
keyboardshortcutactions: keyboardshortcutactions.xpi
	wget --quiet --post-file=keyboardshortcutactions.xpi http://localhost:8888/; exit 0

.PHONY: vimfx
vimfx:
	web-ext --source-dir vimfx run --firefox firefox-nightly --firefox-profile web-ext --verbose
