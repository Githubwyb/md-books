---
weight: 2
title: 二次预训练实战
---

# 一、目标

基于Qwen3-4B-Base模型进行二次预训练，在安全基线方面的效果提升1个点以上，通用基线上效果下降不超过5个点

# 二、步骤设计

1. 寻找安全方面和通用方面的benchmark，用于效果测评，也就是测试集
2. 对提供的通用数据和安全数据进行数据预处理，按照 安全:通用 = 1:5 的比例处理数据
3. 对提供的模型进行预训练，调整参数
4. 拿到训练后的模型进行测评，反过来调整参数

# 三、预训练过程

benchmark找到一个比较好的网站，可以下载到安全行业的相关数据。



## 1. 数据预处理

提供的数据如下

```shell
=> tree datasets
datasets
├── code_data.jsonl
├── general_data.jsonl
├── math_data.jsonl
└── security_data.jsonl

1 directory, 4 files
```

查看一下数据，都是`{"text":"xxx"}`格式，将数据做一下分类。general、code、math都属于通用数据，security属于安全数据。

下一步需要对数据进行清洗

```python
import datasets
import re
import heapq
import hashlib
from datasketch import MinHash
import jieba
from datasets import load_dataset
from datasketch import MinHashLSH

def process_text(text):
    """
    1. 大写转小写
    2. 数字替换为占位符
    3. 移除异常编码（非ASCII字符）?
    """
    if not text or not isinstance(text, str):
        return ""
    # 转小写
    text = text.lower()
    # 替换数字为占位符
    text = re.sub(r'\d+', '0', text)
    # 移除非ASCII字符
    # text = re.sub(r'[^\x00-\x7F]', '', text)
    return text

def remove_templates(text):
    """
    删除常见模板内容：导航菜单、Cookie警告、联系信息等
    """
    if not text:
        return ""
    # 删除HTML标签中的导航内容
    text = re.sub(r'<nav[^>]*>[\s\S]*?</nav>', '', text, flags=re.IGNORECASE)
    # 删除Cookie相关文本
    text = re.sub(r'cookie policy[\s\S]*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'accept cookies[\s\S]*?', '', text, flags=re.IGNORECASE)
    # 删除导航、联系信息等
    text = re.sub(r'navigation[\s\S]*?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'contact us[\s\S]*?', '', text, flags=re.IGNORECASE)
    # 删除页脚等常见模板
    text = re.sub(r'footer[\s\S]*?', '', text, flags=re.IGNORECASE)
    return text.strip()

def deduplication_sha1(ds, hash_length=16):
    """
    基于SHA1前64位的模糊去重
    """
    unique_hashes = set()
    def dedup_func(x):
        if not x['text']:
            return False
        text = x['text']
        sha1_hash = hashlib.sha1(text.encode('utf-8')).hexdigest()[:hash_length]
        if sha1_hash in unique_hashes:
            return False
        else:
            unique_hashes.add(sha1_hash)
            return True
    return ds.filter(dedup_func, load_from_cache_file=False, num_proc=1)

def paragraph_length_filter(x):
    """Returns False iff a page has too few lines or lines are too short."""
    lines = x['text'].split('\n')
    if (
        len(lines) < 3
        or min(heapq.nlargest(3, [len(line) for line in lines])) < 3
    ):
        return False
    return True

def find_duplicates(paragraphs):
    """
    Use this function to find the number of repetitions
    in the paragraphs.
    """
    unique_x = set()
    duplicate_chars = 0
    duplicate_elements = 0
    for element in paragraphs:
        if element in unique_x:
            duplicate_chars += len(element)
            duplicate_elements += 1
        else:
            unique_x.add(element)
    return duplicate_elements, duplicate_chars

def paragraph_repetition_filter(x):
    """
    Returns False iff a page has too many repetitions.
    """
    text = x['text']
    paragraphs = re.compile(r"\n{2,}").split(text.strip())                # Split by paragraphs (2 or more newlines)
    paragraphs_duplicates, char_duplicates = find_duplicates(paragraphs)  # Find number of duplicates in paragraphs
    if paragraphs_duplicates / len(paragraphs) > 0.3:
        return False
    if char_duplicates / len(text) > 0.2:
        return False
    return True

def deduplication(ds):
    def dedup_func(x):
        """Use this function to remove duplicate entries"""
        if x['text'] in unique_text:
            return False
        else:
            unique_text.add(x['text'])
            return True

    unique_text = set()

    ds = ds.filter(dedup_func, load_from_cache_file=False, num_proc=1)
    return ds

def process_text(text):
    """预处理文本：解码、去噪、小写化"""
    if isinstance(text, bytes):
        text = text.decode("utf-8", errors="ignore")
    text = text.lower()
    text = re.sub(r"\d+", "0", text)  # 替换数字为 "0"
    text = re.sub(r"[^\w\s]", "", text)  # 去除标点符号
    return text

def text_to_words(text):
    """根据语言分词：中文使用jieba，英文使用空格分词"""
    # 检测是否为中文（简单方法）
    if re.search(r'[\u4e00-\u9fff]', text):
        # 中文处理
        words = set(jieba.cut(text))
    else:
        # 英文处理（按空格分词）
        words = set(text.split())
    return words

def deduplication_minhash_lsh(ds, threshold=0.8, num_perm=128):
    lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)

    def dedup_func(x):
        text = x["text"]
        if not text:
            return False
        processed_text = process_text(text)
        words = text_to_words(processed_text)
        m = MinHash(num_perm=num_perm)
        for word in words:
            m.update(word.encode("utf-8"))

        # 使用一个字符串唯一标识符，例如文本内容的哈希值
        identifier = str(hash(text))  # 或者使用其他唯一的方法生成识别符

        # 查询是否已有相似的 MinHash
        if lsh.query(m):  # 如果查询到相似的 MinHash
            return False
        lsh.insert(identifier, m)  # 将 MinHash 插入到 LSH 中，并给它一个标识符

        return True

    return ds.filter(dedup_func, load_from_cache_file=False, num_proc=1)


pretraining_dataset = datasets.load_dataset(
    "parquest/sec",
    split="train"
)

#dataset = load_dataset("parquet", data_files="/root/ai/pretrain_demo/pretraining_dataset.parquet")

print("=====================================================================================")
print("Pretrain dataset: ", pretraining_dataset)

pretraining_dataset = pretraining_dataset.select_columns(
    ["text"]
)

print("=====================================================================================")
print(pretraining_dataset[0]["text"][:500])

#new.1 文本预处理：小写转换、数字替换、异常编码移除
pretraining_dataset = pretraining_dataset.map(
    lambda x: {"text": process_text(x['text'])},
    num_proc=4
)

#new.2  删除模板内容
pretraining_dataset = pretraining_dataset.map(
    lambda x: {"text": remove_templates(x['text'])},
    num_proc=4
)

# 3. 段落较少的过滤掉
pretraining_dataset = pretraining_dataset.filter(
    paragraph_length_filter,
    load_from_cache_file=False
)

# 4. 过滤掉段落中重复数据太多的
pretraining_dataset = pretraining_dataset.filter(
    paragraph_repetition_filter,
    load_from_cache_file=False
)

#new.5 使用simhash模糊去重
pretraining_dataset = deduplication_minhash_lsh(pretraining_dataset)

file_path = "processed_data/sec/preprocessed_dataset.parquet"
pretraining_dataset.to_parquet(file_path)

print("=====================================================================================")
print(pretraining_dataset[0]["text"][:50000])
```

按照上面代码将所有数据清洗一遍，然后开始整合数据。基于已有的模型将数据进行tokenizer

```python
import datasets
import numpy as np

dataset = datasets.load_dataset(
    "parquet",
    data_files="processed_data/all/preprocessed_dataset.parquet",
    split="train"
)
print("=====================================================================================")
print(dataset)

dataset = dataset.shard(num_shards=10, index=0)
print("=====================================================================================")
print(dataset)

from transformers import AutoTokenizer

model_path_or_name = "pre_train/base_models/models/Qwen3-4B-Base"
tokenizer = AutoTokenizer.from_pretrained(
    model_path_or_name,
    use_fast=False
)


def tokenization(example):
    # 直接获取token IDs，不添加特殊标记
    token_ids = tokenizer.encode(
        example["text"],
        add_special_tokens=False  # 关键修改：不添加BOS/EOS
    )

    # 如果没有获取到token IDs，使用空列表作为后备
    if not token_ids:
        token_ids = []

    example["input_ids"] = token_ids
    example["num_tokens"] = len(token_ids)
    return example


dataset = dataset.map(tokenization, load_from_cache_file=False)
print("=====================================================================================")
print(dataset)

# 检查是否有None值并处理
if any(item is None for item in dataset["input_ids"]):
    print("Warning: Found None values in input_ids. Filtering them out...")
    dataset = dataset.filter(lambda x: x["input_ids"] is not None)
    print(f"Filtered dataset size: {len(dataset)}")

# 连接所有input_ids前检查是否为空
if len(dataset) == 0:
    raise ValueError("No valid data after tokenization. Check your tokenization function.")

input_ids = np.concatenate(dataset["input_ids"])
print("=====================================================================================")
print(len(input_ids))

max_seq_length = 32

total_length = len(input_ids) - len(input_ids) % max_seq_length
print("=====================================================================================")
print(total_length)

input_ids = input_ids[:total_length]
print("=====================================================================================")
print(input_ids.shape)

input_ids_reshaped = input_ids.reshape(-1, max_seq_length).astype(np.int32)
input_ids_list = input_ids_reshaped.tolist()
packaged_pretrain_dataset = datasets.Dataset.from_dict(
    {"input_ids": input_ids_list}
)
print("=====================================================================================")
print(packaged_pretrain_dataset)

packaged_pretrain_dataset.to_parquet("processed_data/all/packaged_pretrain_dataset_32_0616.parquet")
```

```shell
=> tree datasets
datasets
├── all
│   ├── preprocessed_dataset.parquet
│   └── packaged_pretrain_dataset_4B.parquet
├── normal
│   └── preprocessed_dataset.parquet
└── sec
    └── preprocessed_dataset.parquet
```

## 2.
