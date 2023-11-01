---
title: "hash和编码算法列表"
---

# 一、hash算法对应的场景

- hash均为不可逆加密，一般用于密码的校验

| 算法名称 | 位数     | 用途        | hashcat编号 | 备注                                                                                                             |
| -------- | -------- | ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| NTLM     | v2为16位 | windows密码 | 1000        | 先算hex，再使用unicode编码，再计算md4<br>爆破的hash类似`a7fcb22a88038f35a8f39d503e7f0062`                        |
| RAR5     |          | 压缩包密码  | 13000       | 爆破的hash类似`$rar5$16$1e71cb65fbc2e25d134279f2cb5be013$15$f6115d7dee842c1f8901b057e2bc8952$8$1988f3ce18017cdb` |
| RAR3-hp  |          | 压缩包密码  | 12500       | 爆破的hash类似`$RAR3$*0*f3e592b768e33df0*f304b7cfd600a36ea3930f7a3c1db19b`                                       |

# 二、编码算法对应场景

| 算法名称  | 位数 | 用途         | 备注                                                      |
| --------- | ---- | ------------ | --------------------------------------------------------- |
| base64    |      | 数据编码传输 | 在线加解密`https://the-x.cn/encodings/Base64.aspx`        |
| brainfuck |      | 数据编码     | 在线编码解码`https://www.splitbrain.org/services/ook`     |
| `Ook!`    |      | 数据编码     | 在线编码解码`https://www.splitbrain.org/services/ook`     |
| 与佛论禅  |      | 数据加密     | 在线加解密`http://www.keyfc.net/bbs/tools/tudoucode.aspx` |

## 1. brainfuck

### 1.1. 示例

```
+++++ +++++ [->++ +++++ +++<] >++.+ +++++ .<+++ [->-- -<]>- -.+++ +++.<
++++[ ->+++ +<]>+ +++.< +++++ +[->- ----- <]>-- ----- --.<+ +++[- >----
<]>-- ----- .<+++ [->++ +<]>+ +++++ .<+++ +[->- ---<] >-.<+ +++++ [->++
++++< ]>+++ +++.< +++++ [->-- ---<] >---- -.+++ .<+++ [->-- -<]>- ----- .<
```

### 1.2. python解密

- 安装`python-brainfuck`
- 解密过程

```python
>>> import brainfuck
>>> text = brainfuck.to_function("""
... +++++ +++++ [->++ +++++ +++<] >++.+ +++++ .<+++ [->-- -<]>- -.+++ +++.<
... ++++[ ->+++ +<]>+ +++.< +++++ +[->- ----- <]>-- ----- --.<+ +++[- >----
... <]>-- ----- .<+++ [->++ +<]>+ +++++ .<+++ +[->- ---<] >-.<+ +++++ [->++
... ++++< ]>+++ +++.< +++++ [->-- ---<] >---- -.+++ .<+++ [->-- -<]>- ----- .<
... """)
>>> text()
'flag{N7F5_AD5'
```

### 1.3. php加解密

https://github.com/splitbrain/ook

- 编码

```php
/**
 * fuck_text() generates brainfuck code from $text. The resulting code will use the current
 * register p for looping and the register p+1 for the resulting character. Thus, make sure
 * these two registers are zero (prepend "[-]>[-]<<" to clear the first two registers).
 *
 * I suggest you to use this function in conjunction with wordwrap:
 *
 * $bf = wordwrap(fuck_text("Hello World"), 75, "\n", 1));
 *
 * wich will generate nice, formatted output.
 *
 * @param string $text
 */
function fuck_text($text)
{
    /* value of current pointer */
    $value = 0;
    $result = '';

    for ($_t = 0; $_t < strlen($text); ++$_t) {

        /* ordinal difference between current char and the one we want to have */
        $diff = ord($text[$_t]) - $value;

        /* it's easier like this than always computing this value - saves some cpu cycles*/
        $value = ord($text[$_t]);

        /* repeat current character */
        if ($diff == 0) {
            $result .= ">.<";
            continue;
        }

        /* is it worth making a loop?
           No. A bunch of + or - consume less space than the loop. */
        if (abs($diff) < 10) {

            /* output a bunch of + or - */
            if ($diff > 0)
                $result .= ">" . str_repeat("+", $diff);
            else if ($diff < 0)
                $result .= ">" . str_repeat("-", abs($diff));

        } /* Yes, create a loop. This will make the resulting code more compact. */
        else {

            /*  we strictly use ints, as PHP has some bugs with floating point operations
               (even if no division is involved) */
            $loop = (int)sqrt(abs($diff));

            /* set loop counter */
            $result .= str_repeat("+", $loop);

            /* execute loop, then add reminder */
            if ($diff > 0) {
                $result .= "[->" . str_repeat("+", $loop) . "<]";
                $result .= ">" . str_repeat("+", $diff - pow($loop, 2));
            } else if ($diff < 0) {
                $result .= "[->" . str_repeat("-", $loop) . "<]";
                $result .= ">" . str_repeat("-", abs($diff) - pow($loop, 2));
            }

        } /* end: if loop */

        $result .= ".<";

    } /* end: for */

    /* cleanup */
    return str_replace("<>", "", $result);
}

$output = fuck_text($input);
$output = preg_replace('/(.....)/','\\1 ', $output);
$output = wordwrap($output,75,"\n");
```

- 解码

```php
/**
 * Debug function displays valuable debug information.
 * Rewrite this if desired.
 *
 * @param string $s Source string
 * @param int $_s Source string pointer (current position)
 * @param array $d Data array
 * @param int $_d Data array pointer
 * @param string $i Input string
 * @param int $_i Input  pointer
 * @param string $o Output string
 */
function brainfuck_debug(&$s, &$_s, &$d, &$_d, &$i, &$_i, &$o)
{
    echo "<table>\n";
    echo "<tr><th>Position</th><th>Value</th><th>ASCII</th></tr>\n";

    foreach ($d as $element => $value) {
        echo "<tr>\n";
        echo '<td style="text-align: center">' . $element . "</td>\n";
        echo '<td style="text-align: center">' . ord($value) . "</td>\n";
        echo '<td style="text-align: center">' . (ord($value) >= 32 ? htmlentities($value) : "&nbsp;") . "</td>\n";
        echo "</tr>\n";
    }

    echo "</table>\n";
}

/**
 * The actual interpreter
 *
 * @param string $s Source string
 * @param int $_s Source string pointer (current position)
 * @param array $d Data array
 * @param int $_d Data array pointer
 * @param string $i Input string
 * @param int $_i Input  pointer
 * @param string $o Output string
 */
function brainfuck_interpret(&$s, &$_s, &$d, &$_d, &$i, &$_i, &$o)
{
    do {
        switch ($s[$_s]) {
            /* Execute brainfuck commands. Values are not stored as numbers, but as their
               representing characters in the ASCII table. This is perfect, as chr(256) is
               automagically converted to chr(0). */
            case '+':
                $d[$_d] = chr(ord($d[$_d]) + 1);
                break;
            case '-':
                $d[$_d] = chr(ord($d[$_d]) - 1);
                break;
            case '>':
                $_d++;
                if (!isset($d[$_d])) $d[$_d] = chr(0);
                break;
            case '<':
                $_d--;
                break;

            /* Output is stored in a variable. Change this to
                 echo $d[$_d]; flush();
               if you would like to have a "live" output (when running long calculations, for example.
               Or if you are just terribly impatient). */
            case '.':
                $o .= $d[$_d];
                break;

            /* Due to PHP's non-interactive nature I have the whole input passed over in a string.
               I successively read characters from this string and pass it over to BF every time a
               ',' command is executed. */
            case ',':
                $d[$_d] = $_i == strlen($i) ? chr(0) : $i[$_i++];
                break;

            /* Catch loops */
            case '[':
                /* Skip loop (also nested ones) */
                if ((int)ord($d[$_d]) == 0) {
                    $brackets = 1;
                    while ($brackets && $_s++ < strlen($s)) {
                        if ($s[$_s] == '[')
                            $brackets++;
                        else if ($s[$_s] == ']')
                            $brackets--;
                    }
                } /* Execute loop */
                else {
                    $pos = $_s++ - 1;
                    /* The closing ] returns true when the loop has to be executed again. If so, then return
                       to the $pos(ition) where the opening [ is. */
                    if (brainfuck_interpret($s, $_s, $d, $_d, $i, $_i, $o))
                        $_s = $pos;
                }
                break;
            /* Return true when loop has to be executed again. It is redundant to the [ checking, but
               it will save some parsing time (otherwise the interpreter would have to return to [ only
               to skip all characters again) */
            case ']':
                return ((int)ord($d[$_d]) != 0);
            /* Call debug function */
            case '#':
                brainfuck_debug($s, $_s, $d, $_d, $i, $_i, $o);
        }
    } while (++$_s < strlen($s));
}

/**
 * Call this one in order to interpret brainfuck code
 *
 * @param string $source source data
 * @param string $input Simulate stdin
 * @return string the output
 */
function brainfuck($source, $input = '')
{

    /* Define needed variables:

       $data    Brainfuck's memory
       $source  Source data
       $input   Simulate STDIN
       $output  Save output in here

       Each with according index variables
    */

    $data = array();
    $data[0] = chr(0); /* It is necessary to set every element explicitly, as
                             PHP treats arrays as hashes */
    $data_index = 0;

    $source_index = 0;

    $input_index = 0;

    $output = '';

    /* Call the actual interpreter */
    brainfuck_interpret(
        $source,
        $source_index,
        $data,
        $data_index,
        $input,
        $input_index,
        $output
    );

    return $output;
}
```

## 2. `Ook!` 格式

```
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

### 2.1. php编码解码

- 编码

```php
// 基于brain_fuck的编码转成这样
$output = fuck_text($input);
$output = strtr($output,array('>' => 'Ook. Ook? ',
                            '<' => 'Ook? Ook. ',
                            '+' => 'Ook. Ook. ',
                            '-' => 'Ook! Ook! ',
                            '.' => 'Ook! Ook. ',
                            ',' => 'Ook. Ook! ',
                            '[' => 'Ook! Ook? ',
                            ']' => 'Ook? Ook! ',
                            ));
```

- 解码

```php
$lookup = array(
            '.?' => '>',
            '?.' => '<',
            '..' => '+',
            '!!' => '-',
            '!.' => '.',
            '.!' => ',',
            '!?' => '[',
            '?!' => ']',
            );

$input = preg_replace('/[^\.?!]+/','',$input);
$len = strlen($input);
for($i=0;$i<$len;$i+=2){
    $output .= $lookup[$input{$i}.$input{$i+1}];
}
$output = brainfuck($output);
```

## 3. 与佛论禅

类似下面格式

```
佛曰：遮等諳勝能礙皤藐哆娑梵迦侄羅哆迦梵者梵楞蘇涅侄室實真缽朋能。奢怛俱道怯都諳怖梵尼怯一罰心缽謹缽薩苦奢夢怯帝梵遠朋陀諳陀穆諳所呐知涅侄以薩怯想夷奢醯數羅怯諸
```