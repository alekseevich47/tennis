// Серверный аудит «Профиль» + «Абонемент» + избранное (users → audit_events).
// PB-хуки: helper вне callback недоступен — логика inline в каждом обработчике.

onRecordUpdateRequest((e) => {
  e.next();
  try {
    var audit = require(__hooks + '/auditlib.js');
    var auth = audit.resolveAuth(e);
    var record = e.record;
    var original = record.original();
    if (!original) return;

    var subject = audit.actorInfo(auth);
    var isSelf = !!(auth && auth.id && auth.id === record.id);
    if (subject) subject.source = isSelf ? 'self' : 'moderator';

    var actorName = 'Пользователь';
    if (subject && subject.label) {
      actorName = subject.label.indexOf(' (') > -1
        ? subject.label.slice(0, subject.label.indexOf(' ('))
        : subject.label;
    }

    var targetLabel = record.getString('full_name') || original.getString('full_name') || 'Игрок';
    var target = { id: record.id, label: targetLabel };

    function membershipTypeLabel(type) {
      if (type === 'corporate') return 'Корпоративный';
      if (type === 'annual') return 'Годовой';
      if (type === 'regular') return 'Обычный';
      return type || '—';
    }

    function productObjectLabel(productId) {
      try {
        var p = $app.findRecordById('products', productId);
        var title = p.getString('title') || '';
        return title ? 'Товар "' + title + '"' : '#' + productId;
      } catch (_) {
        return '#' + productId;
      }
    }

    function freezeExtensionDetails() {
      try {
        var log = record.get('membership_freeze_log');
        if (!log || !log.length) return null;
        var last = log[log.length - 1];
        if (!last || !last.frozen_at || !last.unfrozen_at) return null;
        var frozenAt = new Date(String(last.frozen_at).replace(' ', 'T'));
        var unfrozenAt = new Date(String(last.unfrozen_at).replace(' ', 'T'));
        if (isNaN(frozenAt.getTime()) || isNaN(unfrozenAt.getTime())) return null;
        var frozenDays = Math.ceil((unfrozenAt.getTime() - frozenAt.getTime()) / 86400000);
        if (frozenDays > 0) return { frozenDays: frozenDays };
      } catch (_) {}
      return null;
    }

    // —— Профиль: данные ——
    var profileDiff = audit.diffFields(original, record, [
      'full_name', 'birth_date', 'dominant_hand', 'avatar', 'section_start_date'
    ]);
    if (profileDiff.length) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.data.update',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        diff: profileDiff,
        summaryRu: isSelf
          ? actorName + ' обновил(а) данные профиля'
          : actorName + ' отредактировал(а) профиль ' + targetLabel,
        severity: 'info'
      });
    }

    // —— Профиль: рейтинг ——
    var wasVisible = original.getBool('is_visible');
    var isVisible = record.getBool('is_visible');
    if (wasVisible && !isVisible) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.rating.hide',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        summaryRu: actorName + ' скрыл(а) ' + targetLabel + ' из рейтинга',
        severity: 'info'
      });
    } else if (!wasVisible && isVisible) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.rating.show',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        summaryRu: actorName + ' вернул(а) ' + targetLabel + ' в рейтинг',
        severity: 'info'
      });
    }

    // —— Профиль: ограничение комментариев ——
    var couldComment = original.getBool('can_comment');
    var canComment = record.getBool('can_comment');
    if (couldComment && !canComment) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.comment_restriction.set',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        details: { reason: record.getString('comment_restriction_reason') || '' },
        summaryRu: actorName + ' ограничил(а) комментарии для ' + targetLabel,
        severity: 'warning'
      });
    } else if (!couldComment && canComment) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.comment_restriction.unset',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        summaryRu: actorName + ' снял(а) ограничение комментариев для ' + targetLabel,
        severity: 'info'
      });
    }

    // —— Профиль: блокировка ——
    var wasBanned = original.getBool('is_banned');
    var isBanned = record.getBool('is_banned');
    if (!wasBanned && isBanned) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.ban.set',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        details: { reason: record.getString('ban_reason') || '' },
        summaryRu: actorName + ' заблокировал(а) ' + targetLabel,
        severity: 'critical'
      });
    } else if (wasBanned && !isBanned) {
      audit.logEvent($app, {
        category: 'profile',
        action: 'profile.ban.unset',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        summaryRu: actorName + ' разблокировал(а) ' + targetLabel,
        severity: 'info'
      });
    }

    // —— Магазин: избранное (Задача 5, п.4) ——
    var addedFavorites = audit.newlyAdded(
      original.get('favorite_products'),
      record.get('favorite_products')
    );
    var fi;
    for (fi = 0; fi < addedFavorites.length; fi++) {
      var productId = addedFavorites[fi];
      var favSubject = audit.actorInfo(auth);
      if (favSubject) favSubject.source = 'self';
      var favName = actorName;
      audit.logEvent($app, {
        category: 'shop',
        action: 'shop.product.favorite_add',
        actionKind: 'other',
        subject: favSubject,
        objectType: 'product',
        objectId: productId,
        objectLabel: productObjectLabel(productId),
        details: { article: productId },
        summaryRu: favName + ' добавил(а) в избранное ' + productObjectLabel(productId),
        severity: 'info'
      });
    }

    // —— Абонемент: тип ——
    var oldType = original.getString('membership_type') || 'regular';
    var newType = record.getString('membership_type') || 'regular';
    if (oldType !== newType) {
      audit.logEvent($app, {
        category: 'subscription',
        action: 'subscription.type.change',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        diff: [{ field: 'membership_type', from: oldType, to: newType }],
        details: {
          fromLabel: membershipTypeLabel(oldType),
          toLabel: membershipTypeLabel(newType)
        },
        summaryRu: actorName + ' изменил(а) тип абонемента ' + targetLabel
          + ': ' + membershipTypeLabel(oldType) + ' → ' + membershipTypeLabel(newType),
        severity: 'info'
      });
    }

    // —— Абонемент: даты и комментарий ——
    var subDiff = audit.diffFields(original, record, [
      'membership_start_date', 'membership_end_date', 'membership_comment'
    ]);
    if (subDiff.length) {
      audit.logEvent($app, {
        category: 'subscription',
        action: 'subscription.update',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        diff: subDiff,
        summaryRu: actorName + ' обновил(а) абонемент ' + targetLabel,
        severity: 'info'
      });
    }

    // —— Абонемент: посещения ——
    var oldSessions = Number(original.getFloat('available_sessions')) || 0;
    var newSessions = Number(record.getFloat('available_sessions')) || 0;
    if (oldSessions !== newSessions) {
      if (newSessions > oldSessions) {
        audit.logEvent($app, {
          category: 'subscription',
          action: 'subscription.sessions.add',
          actionKind: 'update',
          subject: subject,
          target: target,
          objectType: 'user',
          objectId: record.id,
          objectLabel: targetLabel,
          details: { amount: newSessions - oldSessions, newTotal: newSessions },
          summaryRu: actorName + ' добавил(а) ' + (newSessions - oldSessions)
            + ' посещений абонементу ' + targetLabel + ' (итого: ' + newSessions + ')',
          severity: 'info'
        });
      } else {
        audit.logEvent($app, {
          category: 'subscription',
          action: 'subscription.sessions.subtract',
          actionKind: 'update',
          subject: subject,
          target: target,
          objectType: 'user',
          objectId: record.id,
          objectLabel: targetLabel,
          details: { amount: oldSessions - newSessions, newTotal: newSessions },
          summaryRu: actorName + ' списал(а) ' + (oldSessions - newSessions)
            + ' посещений абонемента ' + targetLabel + ' (осталось: ' + newSessions + ')',
          severity: 'info'
        });
      }
    }

    // —— Абонемент: заморозка ——
    var wasFrozen = original.getBool('membership_frozen');
    var isFrozen = record.getBool('membership_frozen');
    if (!wasFrozen && isFrozen) {
      audit.logEvent($app, {
        category: 'subscription',
        action: 'subscription.freeze.set',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        effectiveAt: record.getString('membership_frozen_at') || undefined,
        summaryRu: actorName + ' заморозил(а) абонемент ' + targetLabel,
        severity: 'info'
      });
    } else if (wasFrozen && !isFrozen) {
      var unfreezeDetails = freezeExtensionDetails();
      audit.logEvent($app, {
        category: 'subscription',
        action: 'subscription.freeze.unset',
        actionKind: 'update',
        subject: subject,
        target: target,
        objectType: 'user',
        objectId: record.id,
        objectLabel: targetLabel,
        details: unfreezeDetails || undefined,
        summaryRu: actorName + ' разморозил(а) абонемент ' + targetLabel,
        severity: 'info'
      });
    }

    // —— Достижения (sort_order 1–3) ——
    var achievementFields = [
      { sortOrder: 1, field: 'rating_points' },
      { sortOrder: 2, field: 'wins' },
      { sortOrder: 3, field: 'attendance_count' }
    ];
    var ai;
    for (ai = 0; ai < achievementFields.length; ai++) {
      var af = achievementFields[ai];
      var oldVal = Number(original.getFloat(af.field)) || 0;
      var newVal = Number(record.getFloat(af.field)) || 0;
      if (newVal <= oldVal) continue;

      var achievements = $app.findRecordsByFilter(
        'achievements',
        'sort_order = ' + af.sortOrder,
        '',
        1,
        0
      );
      if (!achievements || !achievements.length) continue;

      var achievement = achievements[0];
      var achievementId = achievement.id;
      var achievementName = achievement.getString('name') || '';

      var levels = $app.findRecordsByFilter(
        'achievement_levels',
        'achievement = "' + achievementId + '"',
        'required_value',
        0,
        0
      );
      var li;
      for (li = 0; li < levels.length; li++) {
        var levelRec = levels[li];
        var reqVal = Number(levelRec.getFloat('required_value')) || 0;
        var levelNum = Number(levelRec.getFloat('level')) || 0;
        if (oldVal < reqVal && newVal >= reqVal) {
          var levelTitle = levelRec.getString('title') || achievementName;
          audit.logEvent($app, {
            category: 'profile',
            action: 'profile.achievement.grant',
            actionKind: 'other',
            subject: subject,
            target: target,
            objectType: 'user',
            objectId: record.id,
            objectLabel: targetLabel,
            details: {
              achievementId: achievementId,
              achievementName: achievementName,
              level: levelNum,
              levelTitle: levelTitle,
              requiredValue: reqVal,
              userValue: newVal
            },
            summaryRu: targetLabel + ' получил(а) достижение «' + levelTitle + '»',
            severity: 'info'
          });
        }
      }
    }
  } catch (err) {
    console.log('[users-audit] update: ' + err);
  }
}, 'users');
