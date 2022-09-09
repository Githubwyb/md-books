# 一、`shared_ptr(_Yp* __p)`分析

## 1. 初始化

```cpp
// /usr/include/c++/12.2.0/bits/shared_ptr.h

  template<typename _Tp>
    class shared_ptr : public __shared_ptr<_Tp>
    {
    ...
    public:
    ...
      /**
       *  @brief  Construct a %shared_ptr that owns the pointer @a __p.
       *  @param  __p  A pointer that is convertible to element_type*.
       *  @post   use_count() == 1 && get() == __p
       *  @throw  std::bad_alloc, in which case @c delete @a __p is called.
       */
      template<typename _Yp, typename = _Constructible<_Yp*>>
	explicit
	shared_ptr(_Yp* __p) : __shared_ptr<_Tp>(__p) { }
    ...
    }
```

```cpp
// /usr/include/c++/12.2.0/tr1/shared_ptr.h

  // A smart pointer with reference-counted copy semantics.  The
  // object pointed to is deleted when the last shared_ptr pointing to
  // it is destroyed or reset.
  template<typename _Tp, _Lock_policy _Lp>
    class __shared_ptr
    {
    public:

      template<typename _Tp1>
        explicit
        __shared_ptr(_Tp1* __p)
	: _M_ptr(__p), _M_refcount(__p)
        {
	  __glibcxx_function_requires(_ConvertibleConcept<_Tp1*, _Tp*>)
	  typedef int _IsComplete[sizeof(_Tp1)];
	  __enable_shared_from_this_helper(_M_refcount, __p, __p);
	}
    ...
      _Tp*         	   _M_ptr;         // Contained pointer.
      __shared_count<_Lp>  _M_refcount;    // Reference counter.
    };
```

- `__shared_ptr`创建时创建了`__shared_count`
- `__shared_count`创建时，`new`了一个`_Sp_counted_ptr`

```cpp
// /usr/include/c++/12.2.0/bits/shared_ptr_base.h
  template<_Lock_policy _Lp>
    class __shared_count
    {
    public:
    ...
      template<typename _Ptr>
        explicit
	__shared_count(_Ptr __p) : _M_pi(0)
	{
	  __try
	    {
	      _M_pi = new _Sp_counted_ptr<_Ptr, _Lp>(__p);
	    }
	  __catch(...)
	    {
	      delete __p;
	      __throw_exception_again;
	    }
	}
    }
```

## 2. 析构

- 调用栈

```shell
std::_Sp_counted_ptr<testS*, (__gnu_cxx::_Lock_policy)2>::_M_dispose(std::_Sp_counted_ptr<testS*, (__gnu_cxx::_Lock_policy)2> * const this) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:428)
std::_Sp_counted_base<(__gnu_cxx::_Lock_policy)2>::_M_release(std::_Sp_counted_base<(__gnu_cxx::_Lock_policy)2> * const this) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:346)
std::__shared_count<(__gnu_cxx::_Lock_policy)2>::~__shared_count(std::__shared_count<(__gnu_cxx::_Lock_policy)2> * const this) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:1071)
std::__shared_ptr<testS, (__gnu_cxx::_Lock_policy)2>::~__shared_ptr(std::__shared_ptr<testS, (__gnu_cxx::_Lock_policy)2> * const this) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:1524)
std::shared_ptr<testS>::~shared_ptr(std::shared_ptr<testS> * const this) (/usr/include/c++/12.2.0/bits/shared_ptr.h:175)
```

- 由于`__shared_count`是`__shared_ptr`的成员变量，所以在释放`__shared_ptr`的时候就会进行释放

```cpp
// /usr/include/c++/12.2.0/tr1/shared_ptr.h

  template<_Lock_policy _Lp = __default_lock_policy>
    class __shared_count
    {
    public:
    ...
      ~__shared_count() // nothrow
      {
	if (_M_pi != 0)
	  _M_pi->_M_release();
      }
    ...
    private:
    ...
      _Sp_counted_base<_Lp>*  _M_pi;
    };
```

- `_M_release`

```cpp
// /usr/include/c++/12.2.0/bits/shared_ptr_base.h
  template<>
    inline void
    _Sp_counted_base<_S_atomic>::_M_release() noexcept
    {
        ...
	  if (__atomic_load_n(__both_counts, __ATOMIC_ACQUIRE) == __unique_ref)
	    {
	      // Both counts are 1, so there are no weak references and
	      // we are releasing the last strong reference. No other
	      // threads can observe the effects of this _M_release()
	      // call (e.g. calling use_count()) without a data race.
	      _M_weak_count = _M_use_count = 0;
	      _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_use_count);
	      _GLIBCXX_SYNCHRONIZATION_HAPPENS_AFTER(&_M_weak_count);
	      _M_dispose();
	      _M_destroy();
	      return;
	    }
        ...
    }
    ...
}
```

- `_M_dispose`，`_Sp_counted_ptr`继承了`_Sp_counted_base`，上面的`_M_pi`实际上是使用了`_Sp_counted_ptr`的方法
- 直接调用delete

```cpp
// /usr/include/c++/12.2.0/tr1/shared_ptr.h
  // Counted ptr with no deleter or allocator support
  template<typename _Ptr, _Lock_policy _Lp>
    class _Sp_counted_ptr final : public _Sp_counted_base<_Lp>
    {
    public:
    ...
      virtual void
      _M_dispose() noexcept
      { delete _M_ptr; }
    }
```

## 3. 使用构造函数的注意事项

### 3.1. 不能使用栈变量进行初始化

- 由于最终会调用delete，使用栈变量不能delete，会崩溃

```cpp
void func() {
    testS a;
    auto test = std::shared_ptr<testS>(&a);     // 这样定义会崩溃
}
```

### 3.2. 不能对同一个指针进行多次初始化

- `shared_ptr`从源码上看只是托管了堆上的指针的生命周期，并不会进行拷贝，如果使用多个`shared_ptr`托管，会导致析构的时候多次`delete`

```cpp
void func() {
    auto a = new testS();
    auto test = std::shared_ptr<testS>(a);
    auto test1 = std::shared_ptr<testS>(a); // 这里会造成重复delete
}
```

# 二、`shared_ptr(_Yp* __p, _Deleter __d)`

## 1. 初始化

- 调用栈

```cpp
std::_Sp_ebo_helper<0, main(int, char**)::<lambda(testS*)>, true>::_Sp_ebo_helper(struct {...} &&)(std::_Sp_ebo_helper<0, main(int, char**)::<lambda(testS*)>, true> * const this, struct {...} && __tp) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:471)
std::_Sp_counted_deleter<testS*, main(int, char**)::<lambda(testS*)>, std::allocator<void>, (__gnu_cxx::_Lock_policy)2>::_Impl::_Impl(testS *, struct {...}, const std::allocator<void> &)(std::_Sp_counted_deleter<testS*, main(int, char**)::<lambda(testS*)>, std::allocator<void>, (__gnu_cxx::_Lock_policy)2>::_Impl * const this, testS * __p, struct {...} __d, const std::allocator<void> & __a) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:503)
std::_Sp_counted_deleter<testS*, main(int, char**)::<lambda(testS*)>, std::allocator<void>, (__gnu_cxx::_Lock_policy)2>::_Sp_counted_deleter(testS *, struct {...}, const std::allocator<void> &)(std::_Sp_counted_deleter<testS*, main(int, char**)::<lambda(testS*)>, std::allocator<void>, (__gnu_cxx::_Lock_policy)2> * const this, testS * __p, struct {...} __d, const std::allocator<void> & __a) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:521)
std::__shared_count<(__gnu_cxx::_Lock_policy)2>::__shared_count<testS*, main(int, char**)::<lambda(testS*)>, std::allocator<void> >(testS *, struct {...}, std::allocator<void>)(std::__shared_count<(__gnu_cxx::_Lock_policy)2> * const this, testS * __p, struct {...} __d, std::allocator<void> __a) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:952)
std::__shared_count<(__gnu_cxx::_Lock_policy)2>::__shared_count<testS*, main(int, char**)::<lambda(testS*)> >(testS *, struct {...})(std::__shared_count<(__gnu_cxx::_Lock_policy)2> * const this, testS * __p, struct {...} __d) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:939)
std::__shared_ptr<testS, (__gnu_cxx::_Lock_policy)2>::__shared_ptr<testS, main(int, char**)::<lambda(testS*)> >(testS *, struct {...})(std::__shared_ptr<testS, (__gnu_cxx::_Lock_policy)2> * const this, testS * __p, struct {...} __d) (/usr/include/c++/12.2.0/bits/shared_ptr_base.h:1478)
std::shared_ptr<testS>::shared_ptr<testS, main(int, char**)::<lambda(testS*)> >(testS *, struct {...})(std::shared_ptr<testS> * const this, testS * __p, struct {...} __d) (/usr/include/c++/12.2.0/bits/shared_ptr.h:232)
```

- 首先是构造函数

```cpp
      /**
       *  @brief  Construct a %shared_ptr that owns the pointer @a __p
       *          and the deleter @a __d.
       *  @param  __p  A pointer.
       *  @param  __d  A deleter.
       *  @post   use_count() == 1 && get() == __p
       *  @throw  std::bad_alloc, in which case @a __d(__p) is called.
       *
       *  Requirements: _Deleter's copy constructor and destructor must
       *  not throw
       *
       *  __shared_ptr will release __p by calling __d(__p)
       */
      template<typename _Yp, typename _Deleter,
	       typename = _Constructible<_Yp*, _Deleter>>
	shared_ptr(_Yp* __p, _Deleter __d)
        : __shared_ptr<_Tp>(__p, std::move(__d)) { }
```

## 注意事项

### 1. 自定义delete必须删除传入的指针

- 最终析构会调用传入的delete函数，不会进行其他操作，所以需要在函数内自己调用delete或其他释放，不能只处理其他的逻辑
- 不调用delete就会存在内存泄漏

```cpp
auto test = std::shared_ptr<testS>(new testS(), [](testS* x) {
    // 处理其他逻辑
    if (x->temp) {
        delete (uint64_t*)(x->temp);
        x->temp = nullptr;
    }
    delete x;   // 这一行必须
});
```
