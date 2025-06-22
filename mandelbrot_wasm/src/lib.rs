use js_sys::Float32Array;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{
    HtmlCanvasElement, WebGl2RenderingContext as GL, WebGlProgram, WebGlShader,
    WebGlUniformLocation,
};

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Compile a shader of type `ty` from source `src`
fn compile_shader(gl: &GL, src: &str, ty: u32) -> Result<WebGlShader, String> {
    let shader = gl
        .create_shader(ty)
        .ok_or_else(|| "Unable to create shader".to_string())?;
    gl.shader_source(&shader, src);
    gl.compile_shader(&shader);
    if gl
        .get_shader_parameter(&shader, GL::COMPILE_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        Ok(shader)
    } else {
        Err(gl.get_shader_info_log(&shader).unwrap_or_default())
    }
}

/// Link a program from vertex + fragment shaders
fn link_program(gl: &GL, vs: &WebGlShader, fs: &WebGlShader) -> Result<WebGlProgram, String> {
    let prog = gl
        .create_program()
        .ok_or_else(|| "Unable to create program".to_string())?;
    gl.attach_shader(&prog, vs);
    gl.attach_shader(&prog, fs);
    gl.link_program(&prog);
    if gl
        .get_program_parameter(&prog, GL::LINK_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        Ok(prog)
    } else {
        Err(gl.get_program_info_log(&prog).unwrap_or_default())
    }
}

#[wasm_bindgen]
pub struct GPURenderer {
    gl: GL,
    program: WebGlProgram,
    u_center: WebGlUniformLocation,
    u_scale: WebGlUniformLocation,
    u_resolution: WebGlUniformLocation,
    u_max_iter: WebGlUniformLocation,
}

#[wasm_bindgen]
impl GPURenderer {
    /// Bind to the canvas with `id=canvas_id` and compile shaders
    #[wasm_bindgen(constructor)]
    pub fn new(canvas_id: &str, max_iter: i32) -> Result<GPURenderer, JsValue> {
        let document = web_sys::window().unwrap().document().unwrap();
        let canvas: HtmlCanvasElement = document
            .get_element_by_id(canvas_id)
            .ok_or("Canvas not found")?
            .dyn_into()?;

        let gl: GL = canvas
            .get_context("webgl2")?
            .ok_or("WebGL2 not supported")?
            .dyn_into()?;

        // vertex shader
        let vs_src = r#"#version 300 es
        layout(location=0) in vec2 a_position;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
        }"#;

        // fragment shader with improved colors
        let fs_src = r#"#version 300 es
        precision highp float;
        uniform vec2 u_center;
        uniform float u_scale;
        uniform vec2 u_resolution;
        uniform int u_max_iter;
        out vec4 color;
        void main() {
          vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) * u_scale + u_center;
          float x = 0.0, y = 0.0, x2 = 0.0, y2 = 0.0;
          int i = 0;
          for (i = 0; i < u_max_iter && x2 + y2 <= 4.0; i++) {
            y = 2.0 * x * y + uv.y;
            x = x2 - y2 + uv.x;
            x2 = x * x;
            y2 = y * y;
          }
          float t = float(i) / float(u_max_iter);
          float r = 0.5 + 0.5 * cos(3.0 + t * 10.0);
          float g = 0.5 + 0.5 * cos(1.0 + t * 10.0);
          float b = 0.5 + 0.5 * cos(5.0 + t * 10.0);
          color = (i == u_max_iter)
            ? vec4(0.0, 0.0, 0.0, 1.0)
            : vec4(r, g, b, 1.0);
        }"#;

        let vs = compile_shader(&gl, vs_src, GL::VERTEX_SHADER).map_err(JsValue::from)?;
        let fs = compile_shader(&gl, fs_src, GL::FRAGMENT_SHADER).map_err(JsValue::from)?;
        let program = link_program(&gl, &vs, &fs).map_err(JsValue::from)?;
        gl.use_program(Some(&program));

        // full-screen quad
        let vertices: [f32; 8] = [-1., -1., 1., -1., -1., 1., 1., 1.];
        let buf = gl.create_buffer().ok_or("Buffer failed")?;
        gl.bind_buffer(GL::ARRAY_BUFFER, Some(&buf));
        unsafe {
            let arr = Float32Array::view(&vertices);
            gl.buffer_data_with_array_buffer_view(GL::ARRAY_BUFFER, &arr, GL::STATIC_DRAW);
        }
        gl.enable_vertex_attrib_array(0);
        gl.vertex_attrib_pointer_with_i32(0, 2, GL::FLOAT, false, 0, 0);

        // get uniforms
        let u_center = gl.get_uniform_location(&program, "u_center").unwrap();
        let u_scale = gl.get_uniform_location(&program, "u_scale").unwrap();
        let u_resolution = gl.get_uniform_location(&program, "u_resolution").unwrap();
        let u_max_iter = gl.get_uniform_location(&program, "u_max_iter").unwrap();

        // set static uniforms
        gl.uniform2f(
            Some(&u_resolution),
            canvas.width() as f32,
            canvas.height() as f32,
        );
        gl.uniform1i(Some(&u_max_iter), max_iter);

        Ok(GPURenderer {
            gl,
            program,
            u_center,
            u_scale,
            u_resolution,
            u_max_iter,
        })
    }

    /// Call on resize
    pub fn resize(&self, w: i32, h: i32) {
        self.gl.viewport(0, 0, w, h);
        self.gl
            .uniform2f(Some(&self.u_resolution), w as f32, h as f32);
    }

    /// Upload new center/scale and draw
    pub fn render(&self, re: f32, im: f32, scale: f32) {
        self.gl.uniform2f(Some(&self.u_center), re, im);
        self.gl.uniform1f(Some(&self.u_scale), scale);
        self.gl.draw_arrays(GL::TRIANGLE_STRIP, 0, 4);
    }
}
