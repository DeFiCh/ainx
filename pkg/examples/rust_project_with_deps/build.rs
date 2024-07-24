fn main() {
    let out_root = std::env::var("WORKSPACE_OUT").unwrap();
    let lib_dir = out_root.to_owned() + "/lib";
    let clib = "clib";

    println!("cargo:rustc-link-lib={}", clib);
    println!("cargo:rustc-link-search=native={}", lib_dir);
    println!("cargo:rerun-if-changed={}/lib{}.a", lib_dir, clib);
}