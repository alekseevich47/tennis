// HMAC-SHA256 по байтам: $security.hs256 возвращает hex и не принимает raw-ключ
// для вложенного HMAC (MAX/Telegram WebAppData). См. https://dev.max.ru/docs/webapps/validation
var _maxAuthSha256 = (function () {
    var K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }

    function sha256Bytes(bytes) {
        var h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
        var h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
        var l = bytes.length;
        var bitLenHi = Math.floor(l / 0x20000000);
        var bitLenLo = (l << 3) >>> 0;
        var withPad = l + 1;
        while (withPad % 64 !== 56) withPad++;
        var total = withPad + 8;
        var buf = new Array(total);
        var i;
        for (i = 0; i < l; i++) buf[i] = bytes[i] & 0xff;
        buf[l] = 0x80;
        for (i = l + 1; i < withPad; i++) buf[i] = 0;
        buf[withPad] = (bitLenHi >>> 24) & 0xff;
        buf[withPad + 1] = (bitLenHi >>> 16) & 0xff;
        buf[withPad + 2] = (bitLenHi >>> 8) & 0xff;
        buf[withPad + 3] = bitLenHi & 0xff;
        buf[withPad + 4] = (bitLenLo >>> 24) & 0xff;
        buf[withPad + 5] = (bitLenLo >>> 16) & 0xff;
        buf[withPad + 6] = (bitLenLo >>> 8) & 0xff;
        buf[withPad + 7] = bitLenLo & 0xff;

        var w = new Array(64);
        for (var off = 0; off < total; off += 64) {
            for (i = 0; i < 16; i++) {
                var j = off + i * 4;
                w[i] = ((buf[j] << 24) | (buf[j + 1] << 16) | (buf[j + 2] << 8) | buf[j + 3]) >>> 0;
            }
            for (i = 16; i < 64; i++) {
                var s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
                var s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
            }
            var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
            for (i = 0; i < 64; i++) {
                var S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
                var ch = (e & f) ^ (~e & g);
                var t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
                var S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
                var maj = (a & b) ^ (a & c) ^ (b & c);
                var t2 = (S0 + maj) >>> 0;
                h = g; g = f; f = e; e = (d + t1) >>> 0;
                d = c; c = b; b = a; a = (t1 + t2) >>> 0;
            }
            h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
            h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
        }
        return [h0, h1, h2, h3, h4, h5, h6, h7];
    }

    function wordsToBytes(words) {
        var out = [];
        for (var i = 0; i < words.length; i++) {
            var x = words[i];
            out.push((x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff);
        }
        return out;
    }

    function utf8Bytes(str) {
        var out = [];
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            if (c < 0x80) {
                out.push(c);
            } else if (c < 0x800) {
                out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
            } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
                var c2 = str.charCodeAt(++i);
                var cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
                out.push(
                    0xf0 | (cp >> 18),
                    0x80 | ((cp >> 12) & 0x3f),
                    0x80 | ((cp >> 6) & 0x3f),
                    0x80 | (cp & 0x3f)
                );
            } else {
                out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
            }
        }
        return out;
    }

    function hexToBytes(hex) {
        var out = [];
        var s = String(hex);
        for (var i = 0; i < s.length; i += 2) {
            out.push(parseInt(s.substring(i, i + 2), 16));
        }
        return out;
    }

    function bytesToHex(bytes) {
        var hex = "";
        for (var i = 0; i < bytes.length; i++) {
            var h = (bytes[i] & 0xff).toString(16);
            hex += h.length === 1 ? "0" + h : h;
        }
        return hex;
    }

    function hmacSha256Hex(keyBytes, message) {
        var block = 64;
        var key = keyBytes.slice();
        if (key.length > block) key = wordsToBytes(sha256Bytes(key));
        while (key.length < block) key.push(0);

        var oKey = new Array(block);
        var iKey = new Array(block);
        for (var i = 0; i < block; i++) {
            oKey[i] = key[i] ^ 0x5c;
            iKey[i] = key[i] ^ 0x36;
        }

        var inner = iKey.concat(utf8Bytes(message));
        var outer = oKey.concat(wordsToBytes(sha256Bytes(inner)));
        return bytesToHex(wordsToBytes(sha256Bytes(outer)));
    }

    return { hexToBytes: hexToBytes, hmacSha256Hex: hmacSha256Hex };
})();

routerAdd("POST", "/api/max-auth", (c) => {
    try {
        const info = c.requestInfo();
        const body = info.body || {};

        const initData = body.initData || "";
        if (!initData) {
            return c.json(400, { "error": "initData property is missing in JSON payload" });
        }

        const botToken = $os.getenv("MAX_BOT_TOKEN");
        if (!botToken) {
            return c.json(500, { "error": "Auth not configured" });
        }

        const cleanInitData = initData.replace(/&&+/g, '&');
        const parts = cleanInitData.split('&');

        // Валидация подписи initData (до любого find/save)
        var pairs = [];
        var receivedHash = "";
        var hashCount = 0;
        for (var pi = 0; pi < parts.length; pi++) {
            var eq = parts[pi].indexOf("=");
            if (eq <= 0) continue;
            var key = parts[pi].substring(0, eq);
            var rawVal = parts[pi].substring(eq + 1);
            if (key === "hash") {
                hashCount++;
                receivedHash = decodeURIComponent(rawVal);
                continue;
            }
            pairs.push([key, decodeURIComponent(rawVal)]);
        }
        if (hashCount !== 1 || !receivedHash) {
            return c.json(401, { "error": "invalid signature" });
        }

        pairs.sort(function (a, b) {
            if (a[0] < b[0]) return -1;
            if (a[0] > b[0]) return 1;
            return 0;
        });

        var launchLines = [];
        var authDate = 0;
        for (var li = 0; li < pairs.length; li++) {
            launchLines.push(pairs[li][0] + "=" + pairs[li][1]);
            if (pairs[li][0] === "auth_date") {
                authDate = parseInt(pairs[li][1], 10) || 0;
            }
        }
        var launchParams = launchLines.join("\n");

        var nowSec = Math.floor(Date.now() / 1000);
        if (!authDate || Math.abs(nowSec - authDate) > 300) {
            return c.json(401, { "error": "invalid signature" });
        }

        // secret_key = HMAC_SHA256(key="WebAppData", data=BOT_TOKEN) — ASCII, $security ок
        var secretKeyHex = $security.hs256(botToken, "WebAppData");
        var signature = _maxAuthSha256.hmacSha256Hex(
            _maxAuthSha256.hexToBytes(secretKeyHex),
            launchParams
        );
        if (!$security.equal(signature, receivedHash)) {
            return c.json(401, { "error": "invalid signature" });
        }

        let userRawEncoded = "";

        for (let i = 0; i < parts.length; i++) {
            if (parts[i].indexOf('user=') === 0) {
                userRawEncoded = parts[i].substring(5);
                break;
            }
        }

        if (!userRawEncoded) {
            return c.json(400, { "error": "User data object not found in initData string" });
        }

        const userRaw = decodeURIComponent(userRawEncoded);
        const userData = JSON.parse(userRaw);

        const maxId = String(userData.user_id || userData.id || "");
        if (!maxId || maxId === "undefined") {
            return c.json(400, { "error": "Valid user id property not found in user object" });
        }

        const firstName = userData.first_name || userData.username || "Игрок MAX";
        const lastName = userData.last_name || "";
        const fullName = (firstName + " " + lastName).trim();

        // Извлекаем URL аватарки из объекта User мессенджера MAX
        const maxAvatarUrl = userData.photo_url || userData.avatar || "";

        let user;
        try {
            user = $app.findFirstRecordByFilter("users", "max_id = {:maxId}", { maxId: maxId });

            // avatar_url — только если MAX передал непустую строку; full_name не перезаписываем (редактируется в приложении)
            if (maxAvatarUrl) {
                user.set("avatar_url", maxAvatarUrl);
            }
            $app.save(user);

        } catch (e) {
            const collection = $app.findCollectionByNameOrId("users");
            user = new Record(collection);
            user.set("max_id", maxId);
            user.set("full_name", fullName);
            user.set("avatar_url", maxAvatarUrl);
            user.set("role", "user");
            user.set("rating_points", 0);
            user.set("wins", 0);
            // Bool без default в схеме = false; $app.save не бьёт onRecordCreateRequest.
            user.set("is_visible", true);
            user.set("can_comment", true);
            user.set("onboarding_completed", false);
            user.set("name_set_in_onboarding", false);
            user.set("email", "max_" + maxId + "@max-app.local");
            user.setPassword($security.randomString(30));
            $app.save(user);
        }

        if (user.getBool('is_banned')) {
            return c.json(403, {
                "error": "Ваш аккаунт заблокирован",
                "ban_reason": user.get("ban_reason") || "",
                "banned_at": user.get("banned_at") || ""
            });
        }

        // В PocketBase v0.23+ токен генерируется из самой записи Record
        const token = user.newAuthToken();

        // Возвращаем фронтенду абсолютно ВСЕ поля из БД, чтобы они отображались сразу
        return c.json(200, {
            "success": true,
            "token": token,
            "user": {
                "id": user.id,
                "max_id": user.get("max_id"),
                "full_name": user.get("full_name"),
                "avatar_url": user.get("avatar_url"),
                "dominant_hand": user.get("dominant_hand"),
                "role": user.get("role"),
                "wins": user.get("wins"),
                "bot_blocked": user.getBool("bot_blocked"),
                "bot_blocked_at": user.get("bot_blocked_at") || ""
            }
        });

    } catch (error) {
        return c.json(500, { "error": "Server auth exception: " + error.message });
    }
});
console.log("--- POCKETBASE 0.23 ABSOLUTE PRODUCTION AUTH LOADED ---");
