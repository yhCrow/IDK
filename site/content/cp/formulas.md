# Competitive Programming — Cheat Sheet

## Constraint → complexity

| $n$ up to | Aim for |
|---|---|
| 10 | $O(n!)$ |
| 20 | $O(2^n \cdot n)$ |
| 500 | $O(n^3)$ |
| 5 000 | $O(n^2)$ |
| $10^6$ | $O(n \log n)$ |
| $10^8$ | $O(n)$ |
| $10^{18}$ | $O(\log n)$ |

About $10^8$ simple operations per second in C++.

## Starter template

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<ll> a(n);
    for (auto &x : a) cin >> x;

    cout << '\n';
    return 0;
}
```

## Techniques at a glance

| Technique | Key formula / idea | Cost |
|---|---|---|
| Prefix sum | $\text{sum}(l,r) = P[r] - P[l-1]$ | $O(n)$ build, $O(1)$ query |
| 2D prefix sum | $P[x_2][y_2] - P[x_1-1][y_2] - P[x_2][y_1-1] + P[x_1-1][y_1-1]$ | $O(nm)$ build, $O(1)$ query |
| Difference array | $D[l] \mathrel{+}= v,\ D[r+1] \mathrel{-}= v$ | $O(1)$ update |
| Binary search | Monotonic `check(x)` | $O(\log n)$ checks |

## STL quick reference

| Need | Use | Cost |
|---|---|---|
| Sort | `sort(a.begin(), a.end())` | $O(n \log n)$ |
| First element $\ge x$ | `lower_bound` | $O(\log n)$ |
| First element $> x$ | `upper_bound` | $O(\log n)$ |
| Sorted set | `set<int>` | $O(\log n)$ insert/find |
| Key → value | `map<K,V>` / `unordered_map<K,V>` | $O(\log n)$ / $O(1)$ average |
| Min/max heap | `priority_queue<int>` (max by default) | $O(\log n)$ push/pop |
| Min-heap | `priority_queue<int, vector<int>, greater<int>>` | $O(\log n)$ |
| Queue (BFS) | `queue<int>` | $O(1)$ |
| Remove duplicates | `sort` then `a.erase(unique(a.begin(), a.end()), a.end())` | $O(n \log n)$ |

## Binary search on answer

```cpp
ll lo = 0, hi = 2e9;              // answer is inside [lo, hi]
while (lo < hi) {
    ll mid = lo + (hi - lo) / 2;
    if (check(mid)) hi = mid; else lo = mid + 1;
}
```

## Useful numbers

| | Value |
|---|---|
| `INT_MAX` | $2\,147\,483\,647 \approx 2.1 \times 10^9$ |
| `LLONG_MAX` | $\approx 9.2 \times 10^{18}$ |
| Common modulus | $10^9 + 7$ or $998\,244\,353$ |
| $\log_2(10^9)$ | $\approx 30$ |
| $2^{20}$ | $\approx 10^6$ |

## Verdicts

| Verdict | Usual cause |
|---|---|
| **WA** Wrong Answer | Edge cases ($n = 1$, all equal, negatives), overflow, wrong output format |
| **TLE** Time Limit Exceeded | Complexity too high, `endl` in big output, slow I/O |
| **RE** Runtime Error | Array out of bounds, division by zero, stack overflow from deep recursion |
| **MLE** Memory Limit Exceeded | Arrays too big — $10^8$ `int`s is about 400 MB |
