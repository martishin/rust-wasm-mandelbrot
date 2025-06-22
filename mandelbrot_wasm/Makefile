TARGET   := wasm32-unknown-unknown
OUT_DIR  := ../client/src/pkg
CRATE    := mandelbrot_wasm
WASM     := target/$(TARGET)/release/$(CRATE).wasm
BG_WASM  := $(OUT_DIR)/mandelbrot_wasm_bg.wasm

.PHONY: all build clean

all: build

build:
	# 1) Build optimized release wasm
	cargo build --target $(TARGET) --release
	# 2) Generate JS glue + WebAssembly module
	wasm-bindgen $(WASM) \
	  --out-dir $(OUT_DIR) \
	  --target web
	# 3) Further optimize the raw .wasm
	wasm-opt -O3 $(BG_WASM) -o $(BG_WASM)

clean:
	cargo clean
	rm -rf $(OUT_DIR)
