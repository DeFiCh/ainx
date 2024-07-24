use anyhow;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    println!("Hello, world!");
    call_c();
    Ok(())
}

use std::ffi::CStr;
use std::os::raw::c_char;

extern "C" {
    fn say_hello_c() -> *mut c_char;
}

fn call_c() {
    unsafe {
        let c_str = say_hello_c();
        if !c_str.is_null() {
            let r_str = CStr::from_ptr(c_str)
                .to_str()
                .expect("Failed to convert C string to Rust string");
            println!("Message from C++: {}", r_str);
        }
    }
}
