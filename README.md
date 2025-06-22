# Rust + WASM Mandelbrot Fractal

This project showcases a **real-time, interactive Mandelbrot fractal zoom** experience powered by **Rust + WebAssembly (WASM)** and rendered via **WebGL2** in the browser.

You can **pan, pinch, scroll, and zoom infinitely** — all computations are handled on the GPU for smooth performance, even on mobile devices.

[🚀 Try the live demo here](https://mandelbrot.martishin.com/)

<details>
<summary>Demo</summary>
<img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExampuYnlyeXQ2dHB1emYzNW5wejVhb2U2anBicjJjdWZrYmdwemZzOCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/pJJTmNjdmJX1P6qCQf/giphy.gif" width="500"/>
</details>

## Running Locally

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (with `wasm-pack`)
- [Node.js & npm](https://nodejs.org/en/download) – for the React frontend

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/martishin/rust-wasm-mandelbrot
   cd rust-wasm-mandelbrot
   ```

2. Build the WebAssembly module:
   ```bash
   cd mandelbrot_wasm
   make build
   ```

3. Install frontend dependencies and start dev server:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

4. Open in your browser: [http://localhost:5173](http://localhost:5173)

## Technologies Used

- **Rust + WebAssembly (WASM)** – for GPU shader setup and bindings
- **React + Vite** – responsive frontend
