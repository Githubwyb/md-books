---
weight: 1
title: "编译和调试方法"
---

# 一、概述

mysql本身的开源就让我们可以很方便的编译出debug版本进行调试

# 二、调试环境准备

## 1. 编译mysql的debug版本

- 预安装软件

```shell
yum install ncurses-devel bison cmake libarchive gcc-toolset-10-gcc gcc-toolset-10-gcc-c++ gcc-toolset-10-binutils libtirpc-devel rpcgen
```

- 源码下载地址: `https://downloads.mysql.com/archives/get/p/23/file/mysql-8.0.33.tar.gz`
- 需要下载boost库1.73: `https://boostorg.jfrog.io/artifactory/main/release/1.73.0/source/boost_1_73_0.tar.bz2`
- 解压boost库到`mysql-8.0.33/boost_1_73_0`
- 编译命令

```shell
# -DWITH_BOOST=./boost_1_73_0/ 指定boost库路径
# -DWITH_DEBUG=1  编译成debug版本
cmake -B build -DCMAKE_BUILD_TYPE:STRING=Debug -DCMAKE_EXPORT_COMPILE_COMMANDS:BOOL=TRUE -DWITH_BOOST=./boost_1_73_0/ -DWITH_DEBUG=1
cmake --build build -j 8
```

- 执行命令为下面的输出即为成功编译出debug版

```shell
=> ./build/runtime_output_directory/mysqld --version
/mysql-8.0.33/build/runtime_output_directory/mysqld  Ver 8.0.33-debug for Linux on x86_64 (Source distribution)
```

## 2. 替换mysqld进行调试

- 编译好之后，需要上传`./build/runtime_output_directory/mysqld`和`./build/runtime_output_directory/lib`目录到服务器

```shell
=> cd build
=> zip -r mysql-8.0.33.zip ./runtime_output_directory/mysqld ./lib
=> scp mysql-8.0.33.zip admin@x.x.x.x:~/
```

- 上传之后解压后目录结构如下

```shell
=> tree mysql-8.0.33/
mysql-8.0.33/
├── runtime_output_directory
│   └── mysqld
└── lib
    ├── libduktape.so
    ├── libhttp_client.so
    ├── libjson_binlog.so
    ├── libjson_binlog.so.8.0.27
    ├── libmetadata_cache_tests.so
    ├── libmysqlclient.so
    ├── libmysqlclient.so.21
    ├── libmysqlclient.so.21.2.27
    ├── libmysqlharness.so
    ├── libmysqlharness.so.1
    ├── libmysqlharness_stdx.so
    ├── libmysqlharness_stdx.so.1
    ...
```

- 启新进程

```shell
=> export LD_LIBRARY_PATH=/home/admin/mysql-8.0.33/lib
=> /home/admin/mysql-8.0.33/runtime_output_directory/mysqld -defaults-file=/app/native-app/sdp-mysqld/conf/my.cnf --user=mysql
```

- 先在设备安装`yum install gdb-gdbserver`

- 开启gdbserver远程调试

```shell
# 先找到mysqld的进程号
=> ps aux | grep mysqld
mysql     3044  0.5  6.8 1061784 548580 ?      Ssl  9月20   5:24 /home/admin/mysql-8.0.33/runtime_output_directory/mysqld --defaults-file=/etc/my.cnf --user=mysql
admin    22163  0.0  0.0  12320   984 pts/4    S+   14:49   0:00 grep --color=auto mysqld
# 挂载到进程3044，起本地监听6666
=> gdbserver 0.0.0.0:6666 --attach 3044
```

- 本地vscode打开mysql的源码目录，设置`launch.json`如下后，f5就可以开始调试了

```json
{
    "name": "(gdb) Attach",
    "type": "cppdbg",
    "request": "launch",
    "program": "${workspaceFolder}/build/runtime_output_directory/mysqld",
    "MIMode": "gdb",
    "miDebuggerServerAddress": "x.x.x.x:6666",
    "cwd": ".",
    "setupCommands": [
        {
            "description": "Enable pretty-printing for gdb",
            "text": "-enable-pretty-printing",
            "ignoreFailures": true
        },
        {
            "description": "Set Disassembly Flavor to Intel",
            "text": "-gdb-set disassembly-flavor intel",
            "ignoreFailures": true
        }
    ]
}
```
