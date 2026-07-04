routerAdd("POST", "/api/max-auth", (c) => {
    try {
        const info = c.requestInfo();
        const body = info.body || {};
        
        const initData = body.initData || "";
        if (!initData) {
            return c.json(400, { "error": "initData property is missing in JSON payload" });
        }

        const cleanInitData = initData.replace(/&&+/g, '&');
        const parts = cleanInitData.split('&');
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
                "wins": user.get("wins")
            }
        });

    } catch (error) {
        return c.json(500, { "error": "Server auth exception: " + error.message });
    }
});
console.log("--- POCKETBASE 0.23 ABSOLUTE PRODUCTION AUTH LOADED ---");
