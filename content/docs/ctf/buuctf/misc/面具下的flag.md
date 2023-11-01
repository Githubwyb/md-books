---
title: "面具下的flag"
---

# 一、解压压缩包

```
.
└── 面具下的flag
    └── mianju.jpg
```

- 图片使用hexdump看好像后面有一个flag.vmdk，那么可能使用了隐写技术

# 二、解隐写图片

- 使用binwalk进行查看

```shell
=> binwalk mianju.jpg

DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             JPEG image data, EXIF standard
12            0xC             TIFF image data, little-endian offset of first image directory: 8
478718        0x74DFE         Zip archive data, at least v2.0 to extract, compressed size: 153767, uncompressed size: 3145728, name: flag.vmdk
632615        0x9A727         End of Zip archive, footer length: 22
```

- 里面确实有一个压缩包，那么解一下隐写

```shell
=> cd temp && cd temp
=> binwalk -e ../mianju.jpg

DECIMAL       HEXADECIMAL     DESCRIPTION
--------------------------------------------------------------------------------
0             0x0             JPEG image data, EXIF standard
12            0xC             TIFF image data, little-endian offset of first image directory: 8

WARNING: Extractor.execute failed to run external extractor 'jar xvf '%e'': [Errno 2] No such file or directory: 'jar', 'jar xvf '%e'' might not be installed correctly
478718        0x74DFE         Zip archive data, at least v2.0 to extract, compressed size: 153767, uncompressed size: 3145728, name: flag.vmdk
632615        0x9A727         End of Zip archive, footer length: 22

=> tree
.
└── _mianju.jpg.extracted
    ├── 74DFE.zip
    └── flag.vmdk

2 directories, 2 files
```

# 三、解压压缩包

- vmdk可以使用7z解压

```shell
=> 7z x flag.vmdk
...
=> tree
.
├── $RECYCLE.BIN
│   └── S-1-5-21-2200156829-3544857562-508093875-1001
│       └── desktop.ini
├── 74DFE.zip
├── flag.vmdk
├── key_part_one
│   └── NUL
├── key_part_two
│   ├── where_is_flag_part_two.txt
│   └── where_is_flag_part_two.txt:flag_part_two_is_here.txt
└── [SYSTEM]
    ├── $AttrDef
    ├── $BadClus
    ├── $Bitmap
    ├── $Boot
    ├── $Extend
    │   ├── $ObjId
    │   ├── $Quota
    │   ├── $Reparse
    │   └── $RmMetadata
    │       ├── $Repair
    │       ├── $Repair:$Config
    │       ├── $Txf
    │       └── $TxfLog
    │           ├── $Tops
    │           ├── $Tops:$T
    │           └── $TxfLog.blf
    ├── $LogFile
    ├── $MFT
    ├── $MFTMirr
    ├── $Secure
    ├── $Secure:$SDS
    ├── $UpCase
    └── $Volume

10 directories, 25 files
```

# 四、两个part进行解密

```shell
=> cat key_part_one/NUL
+++++ +++++ [->++ +++++ +++<] >++.+ +++++ .<+++ [->-- -<]>- -.+++ +++.<
++++[ ->+++ +<]>+ +++.< +++++ +[->- ----- <]>-- ----- --.<+ +++[- >----
<]>-- ----- .<+++ [->++ +<]>+ +++++ .<+++ +[->- ---<] >-.<+ +++++ [->++
++++< ]>+++ +++.< +++++ [->-- ---<] >---- -.+++ .<+++ [->-- -<]>- ----- .<%
```

- 这个看起来像是brainfuck编码，找在线解一下 https://www.splitbrain.org/services/ook
- 得到`flag{N7F5_AD5`

```shell
=> cat key_part_two/where_is_flag_part_two.txt:flag_part_two_is_here.txt
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook! Ook? Ook! Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook? Ook. Ook?
Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook? Ook! Ook!
Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook? Ook. Ook? Ook! Ook. Ook? Ook.
Ook. Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook! Ook? Ook! Ook! Ook. Ook? Ook! Ook! Ook! Ook! Ook!
Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook? Ook. Ook? Ook! Ook. Ook?
Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook? Ook! Ook! Ook. Ook? Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook? Ook. Ook? Ook! Ook.
Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook!
Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook? Ook! Ook! Ook. Ook?
Ook. Ook. Ook. Ook. Ook. Ook. Ook? Ook. Ook? Ook! Ook. Ook? Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook. Ook! Ook! Ook! Ook!
Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook. Ook! Ook. Ook?
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook? Ook! Ook! Ook. Ook? Ook. Ook.
Ook. Ook. Ook. Ook. Ook? Ook. Ook? Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook!
Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook? Ook! Ook! Ook. Ook? Ook! Ook! Ook!
Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook!
Ook? Ook. Ook? Ook! Ook. Ook? Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook! Ook!
Ook! Ook! Ook! Ook! Ook! Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook! Ook? Ook!
Ook! Ook. Ook? Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook? Ook. Ook? Ook! Ook. Ook? Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook. Ook.
Ook. Ook. Ook. Ook. Ook! Ook. Ook? Ook. %
```

- 这个看起来是`Ook!`编码，同一个网站解一下
- 得到`_i5_funny!}`
- flag搞定`flag{N7F5_AD5_i5_funny!}`
