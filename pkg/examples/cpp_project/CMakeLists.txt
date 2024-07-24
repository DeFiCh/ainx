cmake_minimum_required(VERSION 3.10)
project(cpp_lib)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED True)

# Add library
add_library(clib STATIC clib.c)

# Add executable
add_executable(main main.cpp lib.cpp)

# Link the library to the executable
target_link_libraries(main PRIVATE clib)

install(TARGETS main DESTINATION bin)
install(TARGETS clib DESTINATION lib)