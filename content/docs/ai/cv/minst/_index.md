---
title: minst手写数字识别——神经网络实战笔记
---

# 一、前言

神经网络、深度学习理论一片，基本都可以说道一下，但是真的上手搭建一个神经网络，并将数据处理并进行实践就难到我了。这里记录一下数据处理和神经网络实践。算作学习记录，或者说模板，后续搭建神经网络就参考这个博客，提供学习模板

这里做的是minst手写数字识别的数据集，数据和代码来源主要来自kaggle

# 二、正文

## 1. 数据处理部分

先看目录结构有啥

```python
import numpy as np # linear algebra
import pandas as pd # data processing, CSV file I/O (e.g. pd.read_csv)

import os
for dirname, _, filenames in os.walk('/kaggle/input'):
    for filename in filenames:
        print(os.path.join(dirname, filename))
```

```shell
/kaggle/input/digit-recognizer/train.csv
/kaggle/input/digit-recognizer/test.csv
/kaggle/input/digit-recognizer/sample_submission.csv
```

读取数据自然是用pandas的read_csv函数

```python
train_data = pd.read_csv('/kaggle/input/digit-recognizer/train.csv')
print(train_data)
```
```shell
       label  pixel0  pixel1  pixel2  pixel3  pixel4  pixel5  pixel6  pixel7  \
0          1       0       0       0       0       0       0       0       0
1          0       0       0       0       0       0       0       0       0
2          1       0       0       0       0       0       0       0       0
3          4       0       0       0       0       0       0       0       0
4          0       0       0       0       0       0       0       0       0
...      ...     ...     ...     ...     ...     ...     ...     ...     ...
41995      0       0       0       0       0       0       0       0       0
41996      1       0       0       0       0       0       0       0       0
41997      7       0       0       0       0       0       0       0       0
41998      6       0       0       0       0       0       0       0       0
41999      9       0       0       0       0       0       0       0       0

       pixel8  ...  pixel774  pixel775  pixel776  pixel777  pixel778  \
0           0  ...         0         0         0         0         0
1           0  ...         0         0         0         0         0
2           0  ...         0         0         0         0         0
3           0  ...         0         0         0         0         0
4           0  ...         0         0         0         0         0
...       ...  ...       ...       ...       ...       ...       ...
41995       0  ...         0         0         0         0         0
41996       0  ...         0         0         0         0         0
41997       0  ...         0         0         0         0         0
41998       0  ...         0         0         0         0         0
41999       0  ...         0         0         0         0         0

       pixel779  pixel780  pixel781  pixel782  pixel783
0             0         0         0         0         0
1             0         0         0         0         0
2             0         0         0         0         0
3             0         0         0         0         0
4             0         0         0         0         0
...         ...       ...       ...       ...       ...
41995         0         0         0         0         0
41996         0         0         0         0         0
41997         0         0         0         0         0
41998         0         0         0         0         0
41999         0         0         0         0         0

[42000 rows x 785 columns]
```

取出label，也就是标记，并做一下统计，用sns的countplot画一下统计图

```python
import seaborn as sns 
```
```shell
1    4684
7    4401
3    4351
9    4188
2    4177
6    4137
0    4132
4    4072
8    4063
5    3795
Name: label, dtype: int64
```

![](imgs/2020-05-16-01.png)

取数据部分，就是把数据裁掉label列

```python
X_train = train_data.drop(labels=['label'], axis=1)
print(X_train)
```
```shell
       pixel0  pixel1  pixel2  pixel3  pixel4  pixel5  pixel6  pixel7  pixel8  \
0           0       0       0       0       0       0       0       0       0
1           0       0       0       0       0       0       0       0       0
2           0       0       0       0       0       0       0       0       0
3           0       0       0       0       0       0       0       0       0
4           0       0       0       0       0       0       0       0       0
...       ...     ...     ...     ...     ...     ...     ...     ...     ...
41995       0       0       0       0       0       0       0       0       0
41996       0       0       0       0       0       0       0       0       0
41997       0       0       0       0       0       0       0       0       0
41998       0       0       0       0       0       0       0       0       0
41999       0       0       0       0       0       0       0       0       0

       pixel9  ...  pixel774  pixel775  pixel776  pixel777  pixel778  \
0           0  ...         0         0         0         0         0
1           0  ...         0         0         0         0         0
2           0  ...         0         0         0         0         0
3           0  ...         0         0         0         0         0
4           0  ...         0         0         0         0         0
...       ...  ...       ...       ...       ...       ...       ...
41995       0  ...         0         0         0         0         0
41996       0  ...         0         0         0         0         0
41997       0  ...         0         0         0         0         0
41998       0  ...         0         0         0         0         0
41999       0  ...         0         0         0         0         0

       pixel779  pixel780  pixel781  pixel782  pixel783
0             0         0         0         0         0
1             0         0         0         0         0
2             0         0         0         0         0
3             0         0         0         0         0
4             0         0         0         0         0
...         ...       ...       ...       ...       ...
41995         0         0         0         0         0
41996         0         0         0         0         0
41997         0         0         0         0         0
41998         0         0         0         0         0
41999         0         0         0         0         0

[42000 rows x 784 columns]
```

数据取出来了，删除原变量清理空间

```python
del train_data
```

处理label为训练需要的，由于输出为10个数字，所以转成[0, 1, ..., 0]的形式，比较好输出
使用tensorflow的keras中的to_categorical函数进行转化

```python
import tensorflow as tf
print(Y_train)
Y_train = tf.keras.utils.to_categorical(Y_train, num_classes = 10)
print(Y_train)
```
```shell
0        1
1        0
2        1
3        4
4        0
        ..
41995    0
41996    1
41997    7
41998    6
41999    9
Name: label, Length: 42000, dtype: int64
[[0. 1. 0. ... 0. 0. 0.]
 [1. 0. 0. ... 0. 0. 0.]
 [0. 1. 0. ... 0. 0. 0.]
 ...
 [0. 0. 0. ... 1. 0. 0.]
 [0. 0. 0. ... 0. 0. 0.]
 [0. 0. 0. ... 0. 0. 1.]]
```

## 2. 搭建神经网络

### 1.1. <span id="full_connect">全连接神经网络</span>

第一步先用最简单的刚学会的全连接神经网络进行搭建
先初始化tpu

```python
# detect and init the TPU
tpu = tf.distribute.cluster_resolver.TPUClusterResolver()
tf.config.experimental_connect_to_cluster(tpu)
tf.tpu.experimental.initialize_tpu_system(tpu)

# instantiate a distribution strategy
tpu_strategy = tf.distribute.experimental.TPUStrategy(tpu)
```

全连接神经网络使用tensorflow上层封装的keras很方便的搭建
- 由于数据为784像素，搭建一个$784 \times 300 \times 10$的三层全连接神经网络
- 激活函数用sigmoid函数，输出层不使用激活函数
- 训练算法为随机梯度下降算法SDG
- 损失函数使用最常见的方差，也就是MSE函数
- 评估函数，就是每次训练给自己看的正确率，使用accuracy
- 没有让定学习率，是keras自定义了一个学习率，想改可以更改，仿照下面示例
```python
lr = tf.keras.get_value(model.optimizer.lr)
tf.keras.set_value(model.optimizer.lr, lr * 0.1)
```

搭建神经网络

```python
# 用tpu进行编译
with tpu_strategy.scope():
    model = tf.keras.Sequential([
    # Adds a densely-connected layer with 784 units to the model:
    tf.keras.layers.Dense(784, activation='sigmoid', input_shape=(784,)),
    # Add another:
    tf.keras.layers.Dense(300, activation='sigmoid'),
    # Add an output layer with 10 output units:
    tf.keras.layers.Dense(10)])

    model.compile(optimizer='sgd',
                  loss='mse',
                  metrics=['accuracy'])
```

开始训练，训练10轮，不使用batch_size，也就是一个数据训练一次，使用就是多少个数据一起计算损失进行训练
上面的评价函数应该用accuracy，不过我写成了mse，和loss一样了，不过可以看出损失在下降

```python
model.fit(X_train, Y_train, epochs=10)
```
```shell
Train on 42000 samples
Epoch 1/10
42000/42000 [==============================] - 19s 445us/sample - loss: 0.0662 - mse: 0.0662
Epoch 2/10
42000/42000 [==============================] - 15s 358us/sample - loss: 0.0450 - mse: 0.0450
Epoch 3/10
42000/42000 [==============================] - 15s 363us/sample - loss: 0.0389 - mse: 0.0389
Epoch 4/10
42000/42000 [==============================] - 15s 361us/sample - loss: 0.0352 - mse: 0.0352
Epoch 5/10
42000/42000 [==============================] - 15s 368us/sample - loss: 0.0327 - mse: 0.0327
Epoch 6/10
42000/42000 [==============================] - 15s 365us/sample - loss: 0.0307 - mse: 0.0307
Epoch 7/10
42000/42000 [==============================] - 15s 360us/sample - loss: 0.0290 - mse: 0.0290
Epoch 8/10
42000/42000 [==============================] - 15s 361us/sample - loss: 0.0277 - mse: 0.0277
Epoch 9/10
42000/42000 [==============================] - 16s 382us/sample - loss: 0.0265 - mse: 0.0265
Epoch 10/10
42000/42000 [==============================] - 15s 360us/sample - loss: 0.0255 - mse: 0.0255
```

预测正确率为91.085%，很开心，初步使用神经网络完成

**几个参数修改对比**

- 输出层加上sigmoid激活函数，正确率降低到81.285%，猜测限制了发挥
- 输出层使用relu函数，正确率比sigmoid函数高一点，到达85.014%，应该同样限制了发挥吧
- 所有层使用relu函数，预测结果直接有问题，relu函数导致结果全部为0，所以无法正常训练
  - 根据网上查到的信息，主要原因是输入没有做归一化，权值初始化有问题，训练过程出现权值过大或者过小，通过relu函数变成0，训练过程权值无法调整到合适的值导致无法正常训练
- 隐藏层改为100个神经元，预测结果和300差别不大，都是91.000%
- 神经网络改为$784 \times 150 \times 150 \times 10$，正确率达到86.257%，暂时未测试是否是训练轮数不够导致影响
  - sigmoid函数作为激活函数，在反向传播算法中，传播越远，梯度下降越难。由于传播使用的前一层的导数乘积，sigmoid函数导数最大为$\frac{1}{4}$，所以会下降更难，一般全连接神经网络只有三层

### 1.2. <span id="convolution_connect">卷积神经网络</span>

```python
# 用tpu进行编译
with tpu_strategy.scope():
    # Set the CNN model
    # my CNN architechture is In -> [[Conv2D->relu]*2 -> MaxPool2D -> Dropout]*2 -> Flatten -> Dense -> Dropout -> Out
    model = tf.keras.Sequential()
    model.add(tf.keras.layers.Conv2D(filters = 32, kernel_size = (5,5),padding = 'Same',
                     activation ='relu', input_shape = (28,28,1)))
    model.add(tf.keras.layers.Conv2D(filters = 32, kernel_size = (5,5),padding = 'Same',
                     activation ='relu'))
    model.add(tf.keras.layers.MaxPool2D(pool_size=(2,2)))
    model.add(tf.keras.layers.Dropout(0.25))


    model.add(tf.keras.layers.Conv2D(filters = 64, kernel_size = (3,3),padding = 'Same',
                     activation ='relu'))
    model.add(tf.keras.layers.Conv2D(filters = 64, kernel_size = (3,3),padding = 'Same',
                     activation ='relu'))
    model.add(tf.keras.layers.MaxPool2D(pool_size=(2,2), strides=(2,2)))
    model.add(tf.keras.layers.Dropout(0.25))


    model.add(tf.keras.layers.Flatten())
    model.add(tf.keras.layers.Dense(256, activation = "relu"))
    model.add(tf.keras.layers.Dropout(0.5))
    model.add(tf.keras.layers.Dense(10))

    # Define the optimizer
    optimizer = tf.keras.optimizers.RMSprop(lr=0.001, rho=0.9, epsilon=1e-08, decay=0.0)
    # Compile the model
    model.compile(optimizer = optimizer , loss = "mse", metrics=["accuracy"])

    model.fit(X_train, Y_train, epochs=9, batch_size=42)
```
```shell
Train on 42000 samples
Epoch 1/9
42000/42000 [==============================] - 9s 225us/sample - loss: 0.6169 - accuracy: 0.8257
Epoch 2/9
42000/42000 [==============================] - 5s 126us/sample - loss: 0.0145 - accuracy: 0.9686
Epoch 3/9
42000/42000 [==============================] - 5s 131us/sample - loss: 0.0123 - accuracy: 0.9736
Epoch 4/9
42000/42000 [==============================] - 5s 126us/sample - loss: 0.0113 - accuracy: 0.9763
Epoch 5/9
42000/42000 [==============================] - 5s 125us/sample - loss: 0.0110 - accuracy: 0.9772
Epoch 6/9
42000/42000 [==============================] - 6s 132us/sample - loss: 0.0107 - accuracy: 0.9774
Epoch 7/9
42000/42000 [==============================] - 6s 135us/sample - loss: 0.0105 - accuracy: 0.9775
Epoch 8/9
42000/42000 [==============================] - 6s 132us/sample - loss: 0.0102 - accuracy: 0.9787
Epoch 9/9
42000/42000 [==============================] - 5s 125us/sample - loss: 0.0102 - accuracy: 0.9774
```

## 3. 结果预测

- 对测试数据进行读取和预测

```python
X_test = pd.read_csv('/kaggle/input/digit-recognizer/test.csv')
X_test = X_test.values.reshape(-1,28,28,1)
result = model.predict(X_test)
print(result)
```
```
[[-6.0319379e-03  2.2311732e-03  9.7684860e-01 ... -5.4722652e-03
   5.9211254e-04  4.1266829e-03]
 [ 1.0062367e+00 -2.2030249e-03 -5.0238818e-03 ... -3.2700002e-03
  -9.3276799e-04 -3.5367012e-03]
 [ 2.6999190e-03  6.4259917e-03  1.0489762e-02 ... -1.1652485e-03
   6.1268814e-02  9.1225845e-01]
 ...
 [-5.9012100e-03 -9.0321898e-04  1.8455610e-03 ...  2.4292246e-03
  -3.2179952e-03 -1.5886426e-03]
 [-7.6884702e-03 -5.6109652e-03 -2.5104508e-03 ... -7.8360438e-03
  -1.0629505e-02  1.0693249e+00]
 [-2.6000291e-03  5.1201209e-03  9.4756949e-01 ... -3.5209060e-03
   5.4134727e-03  6.2924922e-03]]
```

- 这数据肯定不能用，用argmax转成我们需要的结果

```python
tmp =  np.argmax(result, axis=1)
print(tmp)
```
```
[2 0 9 ... 3 9 2]
```

- 存到csv，提交

```python
result_data = pd.read_csv('/kaggle/input/digit-recognizer/sample_submission.csv')
result_data['Label'] = tmp
result_data.to_csv('/kaggle/working/sample_submission.csv', index = 0)
```
