---
title: "std::move"
---

# 源码

```cpp
// /usr/include/c++/12.2.0/bits/move.h
  /**
   *  @brief  Convert a value to an rvalue.
   *  @param  __t  A thing of arbitrary type.
   *  @return The parameter cast to an rvalue-reference to allow moving it.
  */
  template<typename _Tp>
    _GLIBCXX_NODISCARD
    constexpr typename std::remove_reference<_Tp>::type&&
    move(_Tp&& __t) noexcept
    { return static_cast<typename std::remove_reference<_Tp>::type&&>(__t); }
```

- 可以看到`std::move`仅对类型做了一次转换，变成右值
- 在调用`=`时会匹配到移动赋值函数，所以对象内容会被转移（具体看对应的实现）
- 如果仅使用`std::move(xxx)`没有任何效果
