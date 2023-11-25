---
weight: 1
title: "名词解释和学习大纲"
---

# 一、人工智能通识

## 1. 数学基础

### 1.1. 归一化

- 对数据范围缩小到`(0, 1)`范围内

#### 为什么做归一化

会对准确率造成影响。不对数据进行归一化的话，如果你的网络层数又比较多的话，很有可能会造成梯度消失或梯度爆炸，而这会对你的权重的更新会造成很大的影响进而会影响模型的性能。  另外，如果你的特征之间因为量纲的影响而造成数据之间的数量级差别很大的话也会对训练出的模型的性能造成影响

### 1.2. 梯度消失和梯度爆炸

- 梯度消失: 在反向传播过程中，随着算法向下传播到较低层，梯度通常会越来越小。结果梯度下降更新使较低层的连接权重保持不变，训练不能收敛到一个好的最优解
- 梯度爆炸: 在某些情况下，可能会出现相反的情况：梯度可能会越来越大，各层需要更新很大的权重直到算法发散为止

### 1.3. 精确度、准确率、召回率

TP (True Positives): 真实的为1的样本（样本为true，预测准确，预测为true）
TN (True Negatives): 真实的为0的样本（样本为false，预测准确，预测为false）
FP (False Positives): 错误预测为1的样本（样本为false，预测错误，预测为true）
FN (False Negatives): 错误预测为0的样本（样本为true，预测错误，预测为false）

#### 精确度 precision

$$
P = \frac{TP}{TP+FP} = \frac{实际为1被判定正确的数量}{预测为1的样本总数}
$$

- 主要反映对于0的误判率，如恶意文件扫描，精确度反映了对于恶意文件的扫描精确程度
- 换成一杯水，代表水中真实可以喝的水占整体水的总量
- 为1代表预测的正样本都是对的

#### 准确率 accuracy

$$
A = \frac{TP+TN}{TP+TN+FP+FN} = \frac{实际为1判定正确的数量+实际为0判定正确的数量}{样本总数}
$$

- 准确率就是展示模型是否准确的基本数值

#### 召回率 recall

$$
R = \frac{TP}{TP+FN} = \frac{实际为1被判定正确的数量}{实际为1的样本总数}
$$

- 主要反映误判的概率，如恶意文件扫描，召回率可以展示误杀的情况
- 换成一杯水，代表杯子里面水占杯子容积的大小
- 为1代表所有正样本都被预测出来了

## 2. 机器学习

### 2.1. 生成学习算法

朴素贝叶斯算法

### 2.2. 分类与回归算法

决策树算法/支持向量机算法

#### 1) XGBoost算法

- 调参: https://blog.csdn.net/qq_36535820/article/details/120507280

### 2.3. 监督学习

神经网络算法/迁移学习

### 2.4. 无监督学习

自编码器(Auto-Encoder)/变分自编码器(VAE)/PCA主成分分析算法/聚类算法

### 2.5. 强化学习

马尔科夫链/蒙特卡洛模型/价值学习(Value-Based Learning)/策略学习(Value-Based Learning)

## 3. 深度学习

# 二、NLP: Natural language processing 自然语言处理

## 1. 应用场景

- 互联网舆情监测
- 检索问答系统
- 基于transformer+crf的信息抽取

## 2. 语言模型基础

### 2.1. 自然语言处理基础

语言模型评价标准/文本生成方式

### 2.2. N-Gram模型

HMM模型/MEMM模型/CRF模型

### 2.3. 概率图模型

### 2.4. 文本预处理

文本分词/停用词过滤/拼写纠错/词性还原

### 2.5. 基于统计的文本表示

词袋模型/TF IDF模型

### 2.6. 基于神经网络的文本表示

One-Hot表示/Word2Vec表示/Glove模型
/SkipGram/层次Softmax

## 3. 前沿语言模型

### 3.1. RNN: Recurrent Neural Network 循环神经网络

### 3.2. RNN改进模型

#### 1) LSTM: Long Short Term Memory 长短时记忆神经网络

#### 2) GRU: Gated Recurrent Unit 门控循环单元网络

#### 3) 双层RNN模型

#### 4) 多层RNN模型

### 3.3. Seq2Seq模型

#### 1) Encoder-Decoder

#### 2) RNN+Seq2Seq场景

#### 3) Attention+Seq2Seq场景

### 3.4. Transformer模型

#### 1) Encoding-Decoder架构

#### 2) Self-Attention 自注意力机制

#### 3) Masking for Encoder&Decoder

#### 4) 前馈神经网络

#### 5) Layer Normal

### 3.5. Bert模型

### 3.6. GPT模型

### 3.7. Prompt Learning

#### 1) Pre-training范式

#### 2) Fine-Tuning范式

# 三、CV: Computer Vision 计算机视觉

## 1. 应用场景

- 基于U-Net医学语义分割
- 狗的品种识别
- 基于YoloV5的漫画任务检测
- 基于生成网络的图像生成

## 2. 基础

- 经典卷积神经网络(CNN)
- AlexNeti
- ZFNet
- GoogLeNet
- VGGNeti
- ResNet
- DenseNeti
- SENet
- MobileNeti
- ShuffleNeti
- EfficientNeti

## 3. 进阶

### 3.1. 图片识别

Transformer/CNN/MLP

### 3.2. 语义分割

U-Net

### 3.3. 目标检测

Yolo

### 3.4. 图像生成

GAN

https://zhuanlan.zhihu.com/p/392406205
https://zhuanlan.zhihu.com/p/59483058
https://www.xjx100.cn/news/550822.html?action=onClick
https://www.modb.pro/db/99980
https://www.fx361.com/page/2022/0712/14907807.shtml
https://www.cnblogs.com/LHWorldBlog/p/9195623.html
https://xz.aliyun.com/t/10522
https://zhuanlan.zhihu.com/p/562983875
