# Phiếu Phản Ánh — K4 Level 3A, Ngày 12

> **Bài làm cá nhân.** Trả lời bằng lời của chính bạn, dựa trên những gì bạn
> quan sát được khi chạy code — không sao chép đáp án của người khác.
>
> Cách trả lời: thay dòng placeholder (khối trích dẫn in nghiêng bên dưới mỗi
> câu hỏi) bằng câu trả lời.
> `grade.py` đếm số câu đã trả lời (15 điểm cho 10 câu).
>
> Họ và tên: Nguyễn Anh Trí  Mã học viên: 2A202602730

---

### Câu 1 — Fail fast (CP1)

Trong `Settings`, `agent_api_key` không có giá trị mặc định nên app chết ngay
khi khởi động nếu thiếu biến môi trường. Hãy mô tả một tình huống cụ thể mà
việc "chết sớm" này cứu bạn, so với việc để mặc định `"changeme"`.

> Every deploy I have done, the container died at boot with
> `pydantic_core._pydantic_core.ValidationError: 1 validation error for Settings / agent_api_key / Field required`
> (I reproduced it by running `Settings(_env_file=None)` with `AGENT_API_KEY` unset). A concrete situation: I pushed to the cloud but forgot to add the secret in the dashboard. Because there is no default, the app refused to start and the health check failed immediately, so I fixed the env var before any user could reach it. If the field had defaulted to `"changeme"`, the container would have started happily and served `/ask` to anyone who read the repo — the key is public, so a stranger (or a bot scanning for default keys) calls my endpoint and I only find out from the LLM bill. "Die early" turns a silent, expensive, security problem into a loud 5-second deploy failure, which is exactly what you want.

---

### Câu 2 — Log cho máy đọc (CP1)

Chạy service và gọi `/ask` vài lần. Dán một dòng log JSON bạn thu được, rồi
nêu **hai** việc bạn làm được với dòng log đó mà `print("đã trả lời xong")`
không làm được.

> A real line captured from the running service (`/ask`, user `sv01`):
>
> ```json
> {"event": "ask_completed", "level": "info", "timestamp": "2026-09-28T16:52:58.328610+00:00", "user_id": "sv01", "tokens_in": 5, "tokens_out": 43, "cost_usd": 2.655e-05}
> ```
>
> Two things I can do with it that `print("đã trả lời xong")` cannot:
> 1. **Aggregate it** — a log system can sum `cost_usd` or count `tokens_in/out` grouped by `user_id` to see who is burning money, without touching the code. The plain print has no fields to group by.
> 2. **Filter and alert on it** — because `level` and `cost_usd` are stable machine-readable fields, I can set an alert like "notify me if a single request costs more than $0.01" or "count all `level=error`". A free-text sentence has to be regex-hacked and breaks the moment the wording changes.

---

### Câu 3 — Kích thước image (CP2)

Build cả hai phiên bản và ghi lại số đo thật:

```bash
docker build -f <Dockerfile-1-stage> -t agent:single .
docker build -t agent:multi .
docker images | grep agent
```

| Bản | Dung lượng |
|-----|-----------|
| 1 stage (bản đầu) | 1.72 GB |
| Multi-stage | 268 MB |

Giải thích: phần dung lượng chênh lệch đó là những gì?

> Measured on my machine: `agent:single = 1.72 GB`, `agent:multi = 268 MB` — a difference of ~1.45 GB. It comes from:
> 1. **Base image.** The single stage uses `python:3.11` (the full Debian image with the complete CPython build, headers and system tooling, ~1 GB). The multi-stage runtime uses `python:3.11-slim` (~120–150 MB).
> 2. **Build leftovers.** In the single stage `pip install` runs without `--no-cache-dir`, so the downloaded wheels stay in the layer; the image also keeps anything else that was in the build context. The multi-stage runtime only receives the installed packages copied from the builder, not the compiler/apt layer or the pip cache.
> 3. The actual application code is tiny (the `COPY . .` layer is ~147 kB); all the weight is base image + dependencies, which is exactly what multi-stage is designed to strip.

---

### Câu 4 — Thứ tự lệnh trong Dockerfile (CP2)

Sửa một ký tự trong `app/main.py` rồi build lại. Với Dockerfile của bạn, những
layer nào được dùng lại từ cache, layer nào phải chạy lại? Nếu bạn đặt
`COPY . .` lên trước `RUN pip install` thì kết quả khác thế nào?

> I appended a comment to `app/main.py` and rebuilt both:
> - **Multi-stage**: `COPY requirements.txt` and `RUN pip install --prefix=/install -r requirements.txt` both showed `CACHED`; only `COPY app/ ./app/` and the layers after it re-ran. Dependency installation is skipped entirely because the requirements layer was untouched.
> - **Single stage**: the `COPY . .` layer hash changed, so the following `RUN pip install -r requirements.txt` re-ran (a 91.9 MB layer) even though `requirements.txt` itself did not change.
>
> If I moved `COPY . .` **before** `RUN pip install`, the same thing happens on every build: any one-character source change invalidates the `COPY . .` layer, which invalidates the pip layer below it, so all dependencies are reinstalled every time (minutes per build instead of seconds). The rule is: copy and install the dependency manifest first, copy source last.

---

### Câu 5 — Vì sao không chạy bằng root (CP2)

Container mặc định chạy bằng root. Mô tả chuỗi sự kiện dẫn từ "một lỗ hổng
trong code Python của bạn" tới "kẻ tấn công có quyền cao trên máy host", và
lệnh `USER` cắt đứt chuỗi đó ở chỗ nào.

> Chain: a remote-code-execution bug in my Python app → the attacker runs commands in the container **as root (uid 0)**, because that is the default user. A container is not a strong security boundary on its own: if the container is privileged, if `/var/run/docker.sock` is mounted, or if the attacker has a kernel/namespace-escape exploit, uid 0 inside becomes uid 0 on the host (the docker socket alone is enough — they start a new privileged container that mounts the host filesystem). `USER agent` cuts the chain at the second link: the RCE now lands as an unprivileged `agent` user, so every escape attempt starts without root in the container and needs an additional local privilege-escalation bug on top. It does not make the app bug harmless, but it removes the free "instant root" step, which is the difference between a contained incident and a host compromise.

---

### Câu 6 — Cửa sổ trượt (CP3)

Rate limit của bạn dùng sliding window 60 giây. Nếu thay bằng cách đếm theo
phút đồng hồ (reset lúc giây 00), một người dùng có thể gửi tối đa bao nhiêu
request trong 2 giây liên tiếp khi hạn mức là 10/phút? Giải thích cách đạt được
con số đó.

> With a fixed calendar-minute counter and a limit of 10/minute, a user can get **20** requests through in ~2 seconds. Method: send 10 requests at `10:00:59` (the last second of minute 10:00) and 10 more at `10:01:01` (the first second of minute 10:01). Each calendar minute independently sees only 10 and resets at :00, so both bursts pass. I simulated it and got `fixed clock-minute window allows: 20` vs `sliding 60s window allows: 10`. The sliding window looks back 60 s from each request (Redis sorted set), so at `10:01:01` the 10 requests from `10:00:59` are still inside the window and the next request is rejected with `429` + `Retry-After: 60`.

---

### Câu 7 — Rate limit và cost guard (CP3)

Hai cơ chế này khác nhau ở điểm nào? Cho một tình huống mà rate limit cho qua
nhưng cost guard phải chặn, và một tình huống ngược lại.

> Rate limit caps the **number of requests per time window** (fairness / abuse / provider limits). Cost guard caps **money spent per month** (the bill). They are different axes: one request can be cheap or astronomically expensive, and many cheap requests still fit the budget.
> - **Rate limit passes, cost guard blocks:** a single request with a very large prompt (only 1 request, well under 10/min) whose estimated cost exceeds the remaining monthly budget → cost guard returns `402` (Payment Required). I reproduced this by running with `MONTHLY_BUDGET_USD=0.00002`: request 1 passed (cost `2.7e-05`), request 2 returned `402 {"detail":"monthly budget exceeded"}`.
> - **Cost guard passes, rate limit blocks:** a burst of 11 tiny, cheap requests inside one minute while there is plenty of budget left → the 11th is rejected with `429`. I reproduced it with limit=10: requests 1–10 returned `200`, request 11 returned `429 {"detail":"rate limit exceeded"}`.
> They are complementary: rate limit is about rate, cost guard is about total spend.

---

### Câu 8 — /health khác /ready (CP4)

Nếu gộp hai endpoint làm một và cho nó kiểm tra Redis, chuyện gì xảy ra với cụm
3 container khi Redis mất kết nối 30 giây? Trả lời theo đúng thứ tự sự kiện.

> If the merged endpoint pinged Redis, with Redis down for 30 s the sequence is:
> 1. The Redis connection drops.
> 2. Every one of the 3 containers starts returning `503` from the merged endpoint.
> 3. The orchestrator/load balancer marks **all 3 replicas unhealthy**.
> 4. Because liveness failures trigger restarts, all 3 are killed and restarted — killing in-flight requests, so users see 502s.
> 5. The restarts do not help: Redis is still down, the fresh containers fail the check again → crash/restart loop.
> 6. With every replica pulled out of the pool, the service is 100% down even though the application code is perfectly healthy — a Redis blip becomes a total outage.
> That is why `/health` must stay dependency-free (it only answers "is this process alive, should we restart it?") and `/ready` is the only one allowed to check Redis ("should the LB send traffic here?"). Then a Redis outage removes instances from traffic (degraded) instead of restarting the whole fleet.

---

### Câu 9 — Stateless (CP4)

Chạy `docker compose up --scale agent=3` rồi gọi `/ask` nhiều lần với cùng một
`X-User-Id`. Quan sát `history_length` trong response. Nếu lịch sử được lưu
trong một dict Python thay vì Redis, bạn sẽ thấy con số đó thay đổi thế nào?

> I ran `docker compose up -d --build --scale agent=3` (3 replicas on host ports 8000/8001/8002 plus Redis) and sent the same `X-User-Id: scaleuser` to rotating replicas. `history_length` returned `0 → 2 → 4 → 6` as I hit ports 8000 → 8001 → 8002 → 8000. Each replica sees the turns written by the others because history lives in Redis under `history:<user_id>`.
> With an in-process Python dict instead, each replica would have its own memory. Rotating across 3 replicas I would see `0, 0, 0, 2` — the first request on any instance always starts from an empty dict, so the number resets to 0 whenever the load balancer picks a different container, and any restart wipes it completely. That is the "agent amnesia" the lab is about.

---

### Câu 10 — Deploy thật (CP5)

Ghi lại **một** lỗi bạn gặp khi deploy lên cloud (build fail, health check
timeout, sai REDIS_URL, app không đọc `$PORT`...): thông báo lỗi là gì, bạn
tìm ra nguyên nhân bằng cách nào, và sửa ra sao?

> Error: after deploying the frontend, every API call from the browser came back `403` with body `{"error":{"code":"FORBIDDEN","message":"Origin not allowed","requestId":"..."}}`, while the same calls from `curl` worked. Cause: the gateway's `originCheck` middleware compares the browser's `Origin` header against the `ALLOWED_ORIGINS` list read from `trading-agent-infra/.env`. I had put in the wrong frontend endpoint — the custom domain `https://trading-agent-web.mastercuberskill.dev/` — but the site was actually being served from the Cloudflare Worker origin `https://trading-agent-web.mastercuberskill.workers.dev` (and the browser sends the origin with no trailing slash). Since `originCheck` does an exact string match, the real `Origin` was never in the list, so every browser request was rejected at the gateway before reaching the backend. I found it by opening the browser Network tab: the 403 with that `FORBIDDEN / Origin not allowed` body points straight at the gateway, not the backend, while `curl` (no `Origin` header, and `ALLOW_MISSING_ORIGIN=true`) still succeeded — that split is the tell-tale sign of an origin mismatch. I then confirmed in the gateway container logs, which print the allowlist on startup: `[gateway] allowed origins: ...`. Fix: set the exact deployed origin `https://trading-agent-web.mastercuberskill.workers.dev` (scheme + host, no trailing slash) in `ALLOWED_ORIGINS` in `.env` and recreate the gateway container (`docker compose up -d gateway`). Lesson: an origin allowlist is byte-for-byte matching, and a "wrong CORS/origin" error that shows up in the browser but not in `curl` is almost always an `Origin`-header problem, not a server bug.
