#include <iostream>
#include "lib.h"
#include "clib.h"

int main() {
    std::cout << say_hello() << std::endl;
    std::cout << "from_c: " << say_hello_c() << std::endl;
    return 0;
}