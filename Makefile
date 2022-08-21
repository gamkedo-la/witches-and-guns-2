.PHONY: run upload


run: node_modules
	npx browser-sync -f index.html -f js -f images -f sounds

dist: js images sounds levels
	npx webpack
	for f in `find images -type f \( -name "*.png" -o -name "*.gif" \)`; do cp --parents "$${f}" dist; done
	for f in `find sounds -type f \( -name "*.mp3" -o -name "*.ogg" -o -name "*.wav" \)`; do cp --parents "$${f}" dist; done
	for f in `find levels -type f -name "*.json"`; do cp --parents "$${f}" dist; done

upload: dist
	butler push dist gonzalod/witches-n-guns-2:HTML5

node_modules:
	npm ci
