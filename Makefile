.PHONY: run upload


run: node_modules
	npx browser-sync -f index.html -f js -f images -f sounds

dist: js images sounds levels
	npx webpack
	cp -rv images dist/
	cp -rv sounds dist/
	cp -rv levels dist/

upload: dist
	butler push dist gonzalod/witches-n-guns-2:HTML5

node_modules:
	npm ci
