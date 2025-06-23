use wasm_bindgen::prelude::*;

/// Simple coloring: black if inside, otherwise a purple gradient.
fn iteration_to_color(iter: u32, max_iter: u32) -> [u8; 3] {
    if iter >= max_iter {
        [0, 0, 0]
    } else {
        let c = (255 * iter / max_iter) as u8;
        [c, 0, 255 - c]
    }
}

/// Render the Mandelbrot set into `output` (RGBA bytes).
#[wasm_bindgen]
pub fn render(
    center_re: f64,
    center_im: f64,
    scale: f64,
    width: u32,
    height: u32,
    output: &mut [u8],
) {
    let max_iter = 500;
    let half_w = width as f64 * 0.5;
    let half_h = height as f64 * 0.5;
    let w = width as usize;

    for py in 0..height {
        let imag = center_im + (py as f64 - half_h) * scale;
        for px in 0..width {
            let real = center_re + (px as f64 - half_w) * scale;

            // Mandelbrot iteration
            let mut x = 0.0;
            let mut y = 0.0;
            let mut iter = 0;
            while x * x + y * y <= 4.0 && iter < max_iter {
                let x_new = x * x - y * y + real;
                y = 2.0 * x * y + imag;
                x = x_new;
                iter += 1;
            }

            let [r, g, b] = iteration_to_color(iter, max_iter);
            let idx = ((py as usize * w + px as usize) * 4) as usize;
            output[idx] = r;
            output[idx + 1] = g;
            output[idx + 2] = b;
            output[idx + 3] = 255;
        }
    }
}
