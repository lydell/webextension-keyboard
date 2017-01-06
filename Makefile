.PHONY: clean
clean:
	rm hello.xpi

hello.xpi:
	cd hello; zip ../hello.xpi *

.PHONY: hello-push
hello-push: hello.xpi
	wget --quiet --post-file=hello.xpi http://localhost:8888/; exit 0

.PHONY: vimfx
vimfx:
	web-ext --source-dir vimfx run --firefox firefox-nightly --firefox-profile web-ext --verbose
