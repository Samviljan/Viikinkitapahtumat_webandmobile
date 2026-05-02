/**
 * Mobile Messages screen — three tabs:
 *   • Saapuneet (Inbox)
 *   • Lähetetyt (Sent)
 *   • Lähetä uusi (Compose)
 *
 * Visible to any logged-in user. Compose tab gates internally on
 * `paid_messaging_enabled` (admins always allowed).
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { AppBackground } from "@/src/components/AppBackground";
import { colors, radius, spacing, text } from "@/src/lib/theme";
import { useSettings } from "@/src/lib/i18n";
import { useAuth } from "@/src/lib/auth";
import { api } from "@/src/api/client";

const API = process.env.EXPO_PUBLIC_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || "";

type TabKey = "inbox" | "sent" | "compose";

interface ApiEvent {
  id: string;
  title_fi?: string;
  title_en?: string;
  title_sv?: string;
  start_date?: string;
  image_url?: string;
}

interface InboxGroup {
  event: ApiEvent;
  total: number;
  unread: number;
  last_message_at: string;
}
interface SentGroup {
  event: ApiEvent;
  batches: number;
  last_sent_at: string;
}
interface InboxMessage {
  id: string;
  batch_id: string;
  subject: string;
  body: string;
  sender_label: string;
  channel: string;
  created_at: string;
  read_at: string | null;
  recipient_id?: string;
  sender_id?: string;
}
interface SentBatch {
  batch_id: string;
  id: string;
  subject: string;
  body: string;
  channel: string;
  recipients: number;
  created_at: string;
}

const CHANNELS = ["both", "push", "email"] as const;
const TARGET_CATEGORIES = ["reenactor", "fighter", "merchant", "organizer"] as const;
type Channel = (typeof CHANNELS)[number];
type Target = (typeof TARGET_CATEGORIES)[number];

function imgSrc(u?: string): string | undefined {
  if (!u) return undefined;
  if (u.startsWith("http")) return u;
  return `${API}${u}`;
}

function eventTitle(ev: ApiEvent | undefined, lang: string): string {
  if (!ev) return "";
  const o = ev as unknown as Record<string, string | undefined>;
  return o[`title_${lang}`] || ev.title_fi || ev.title_en || ev.title_sv || ev.id;
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

// ─── Detail modal (shared) ─────────────────────────────────────────────
interface DetailProps {
  visible: boolean;
  message: InboxMessage | SentBatch | null;
  role: "recipient" | "sender";
  onClose: () => void;
  onDelete: (id: string) => void;
  t: (k: string, p?: Record<string, string>) => string;
}
function MessageDetailModal({ visible, message, role, onClose, onDelete, t }: DetailProps) {
  if (!message) return null;
  const subject = message.subject || t("messages.no_subject");
  const body = message.body || "";
  const meta =
    role === "recipient"
      ? `${t("messages.from")}: ${(message as InboxMessage).sender_label}`
      : `${(message as SentBatch).recipients} ${t("messages.recipients_unit")}`;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard} testID="message-detail">
          <Text style={styles.modalSubject}>{subject}</Text>
          <Text style={styles.modalMeta}>
            {meta} · {fmtDate(message.created_at)}
          </Text>
          <ScrollView style={styles.modalBodyScroll}>
            <Text style={styles.modalBody} testID="message-body">
              {body}
            </Text>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable
              testID="message-delete"
              onPress={() => {
                Alert.alert(
                  t("messages.delete"),
                  t("messages.delete_confirm"),
                  [
                    { text: t("messages.close"), style: "cancel" },
                    {
                      text: t("messages.delete"),
                      style: "destructive",
                      onPress: () => onDelete(message.id),
                    },
                  ],
                );
              }}
              style={({ pressed }) => [
                styles.modalDeleteBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="trash-outline" size={14} color={colors.ember} />
              <Text style={styles.modalDeleteText}>{t("messages.delete")}</Text>
            </Pressable>
            <Pressable
              testID="message-close"
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCloseBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.modalCloseText}>{t("messages.close")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Inbox view ────────────────────────────────────────────────────────
function InboxView({ onUnreadChange }: { onUnreadChange?: (n: number) => void }) {
  const { t, lang } = useSettings();
  const [groups, setGroups] = useState<InboxGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, InboxMessage[]>>({});
  const [openMsg, setOpenMsg] = useState<InboxMessage | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<InboxGroup[]>("/messages/inbox");
      setGroups(data || []);
      const totalUnread = (data || []).reduce((acc, g) => acc + g.unread, 0);
      onUnreadChange?.(totalUnread);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    reload();
  }, [reload]);

  const expand = async (eventId: string) => {
    if (expanded === eventId) {
      setExpanded(null);
      return;
    }
    setExpanded(eventId);
    if (!items[eventId]) {
      try {
        const { data } = await api.get<InboxMessage[]>(`/messages/inbox/${eventId}`);
        setItems((prev) => ({ ...prev, [eventId]: data || [] }));
      } catch {
        setItems((prev) => ({ ...prev, [eventId]: [] }));
      }
    }
  };

  const openMessage = async (id: string) => {
    try {
      const { data } = await api.get<InboxMessage>(`/messages/${id}`);
      setOpenMsg(data);
      // Optimistic local read state, then refresh group counts
      setItems((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].map((m) => (m.id === id ? { ...m, read_at: data.read_at } : m));
        }
        return next;
      });
      reload();
    } catch {
      Alert.alert(t("auth.error_generic"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      setOpenMsg(null);
      setItems((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          next[k] = next[k].filter((m) => m.id !== id);
        }
        return next;
      });
      reload();
    } catch {
      Alert.alert(t("auth.error_generic"));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (groups.length === 0) {
    return (
      <View style={styles.empty} testID="inbox-empty">
        <Ionicons name="mail-outline" size={32} color={colors.gold} />
        <Text style={styles.emptyText}>{t("messages.inbox_empty")}</Text>
      </View>
    );
  }

  return (
    <View>
      {groups.map((g) => (
        <View key={g.event.id} style={{ marginBottom: spacing.md }}>
          <Pressable
            testID={`inbox-event-${g.event.id}`}
            onPress={() => expand(g.event.id)}
            style={({ pressed }) => [styles.groupRow, pressed && { opacity: 0.7 }]}
          >
            {g.event.image_url ? (
              <Image source={{ uri: imgSrc(g.event.image_url) }} style={styles.groupImg} />
            ) : (
              <View style={[styles.groupImg, styles.groupImgFallback]}>
                <Ionicons name="mail" size={20} color={colors.gold} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle} numberOfLines={1}>
                {eventTitle(g.event, lang)}
              </Text>
              {g.event.start_date ? (
                <Text style={styles.groupDate}>{g.event.start_date}</Text>
              ) : null}
            </View>
            {g.unread > 0 ? (
              <View style={styles.unreadPill} testID={`inbox-unread-${g.event.id}`}>
                <Text style={styles.unreadPillText}>{g.unread}</Text>
              </View>
            ) : (
              <Text style={styles.groupCount}>
                {g.total} {t("messages.total_unit")}
              </Text>
            )}
            <Ionicons
              name={expanded === g.event.id ? "chevron-down" : "chevron-forward"}
              size={16}
              color={colors.gold}
            />
          </Pressable>
          {expanded === g.event.id ? (
            <View style={styles.groupChildren}>
              {(items[g.event.id] || []).map((m) => (
                <Pressable
                  key={m.id}
                  testID={`inbox-msg-${m.id}`}
                  onPress={() => openMessage(m.id)}
                  style={({ pressed }) => [
                    styles.messageRow,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.messageHeader}>
                    {!m.read_at ? <View style={styles.unreadDot} /> : null}
                    <Text
                      style={[
                        styles.messageSubject,
                        !m.read_at && { color: colors.bone, fontWeight: "700" },
                      ]}
                      numberOfLines={1}
                    >
                      {m.subject || t("messages.no_subject")}
                    </Text>
                  </View>
                  <Text style={styles.messageMeta} numberOfLines={1}>
                    {t("messages.from")}: {m.sender_label} · {fmtDate(m.created_at)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <MessageDetailModal
        visible={!!openMsg}
        message={openMsg}
        role="recipient"
        onClose={() => setOpenMsg(null)}
        onDelete={handleDelete}
        t={t}
      />
    </View>
  );
}

// ─── Sent view ─────────────────────────────────────────────────────────
function SentView() {
  const { t, lang } = useSettings();
  const [groups, setGroups] = useState<SentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, SentBatch[]>>({});
  const [openMsg, setOpenMsg] = useState<SentBatch | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<SentGroup[]>("/messages/sent");
      setGroups(data || []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);

  const expand = async (eventId: string) => {
    if (expanded === eventId) {
      setExpanded(null);
      return;
    }
    setExpanded(eventId);
    if (!items[eventId]) {
      try {
        const { data } = await api.get<SentBatch[]>(`/messages/sent/${eventId}`);
        setItems((prev) => ({ ...prev, [eventId]: data || [] }));
      } catch {
        setItems((prev) => ({ ...prev, [eventId]: [] }));
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/messages/${id}`);
      setOpenMsg(null);
      setItems({});
      reload();
    } catch {
      Alert.alert(t("auth.error_generic"));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (groups.length === 0) {
    return (
      <View style={styles.empty} testID="sent-empty">
        <Ionicons name="paper-plane-outline" size={32} color={colors.gold} />
        <Text style={styles.emptyText}>{t("messages.sent_empty")}</Text>
      </View>
    );
  }

  return (
    <View>
      {groups.map((g) => (
        <View key={g.event.id} style={{ marginBottom: spacing.md }}>
          <Pressable
            testID={`sent-event-${g.event.id}`}
            onPress={() => expand(g.event.id)}
            style={({ pressed }) => [styles.groupRow, pressed && { opacity: 0.7 }]}
          >
            {g.event.image_url ? (
              <Image source={{ uri: imgSrc(g.event.image_url) }} style={styles.groupImg} />
            ) : (
              <View style={[styles.groupImg, styles.groupImgFallback]}>
                <Ionicons name="paper-plane" size={20} color={colors.gold} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.groupTitle} numberOfLines={1}>
                {eventTitle(g.event, lang)}
              </Text>
              {g.event.start_date ? (
                <Text style={styles.groupDate}>{g.event.start_date}</Text>
              ) : null}
            </View>
            <Text style={styles.groupCount}>
              {g.batches} {t("messages.batches_unit")}
            </Text>
            <Ionicons
              name={expanded === g.event.id ? "chevron-down" : "chevron-forward"}
              size={16}
              color={colors.gold}
            />
          </Pressable>
          {expanded === g.event.id ? (
            <View style={styles.groupChildren}>
              {(items[g.event.id] || []).map((m) => (
                <Pressable
                  key={m.batch_id}
                  testID={`sent-msg-${m.batch_id}`}
                  onPress={() => setOpenMsg(m)}
                  style={({ pressed }) => [
                    styles.messageRow,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.messageSubject} numberOfLines={1}>
                    {m.subject}
                  </Text>
                  <Text style={styles.messageMeta} numberOfLines={1}>
                    {m.recipients} {t("messages.recipients_unit")} · {fmtDate(m.created_at)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      <MessageDetailModal
        visible={!!openMsg}
        message={openMsg}
        role="sender"
        onClose={() => setOpenMsg(null)}
        onDelete={handleDelete}
        t={t}
      />
    </View>
  );
}

// ─── Composer view ─────────────────────────────────────────────────────
interface QuotaState { unlimited: boolean; used: number; limit: number; remaining: number }
interface SendResult { sent_push: number; sent_email: number; recipients: number; push_eligible?: number; email_eligible?: number }
function ComposerView({ initialEventId }: { initialEventId: string }) {
  const { t, lang } = useSettings();
  const { user } = useAuth();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [channel, setChannel] = useState<Channel>("both");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [quota, setQuota] = useState<QuotaState | null>(null);

  const types = user?.user_types || [];
  const isAdmin = user?.role === "admin";
  const allowed =
    isAdmin ||
    (!!user?.paid_messaging_enabled &&
      (types.includes("merchant") || types.includes("organizer")));

  useEffect(() => {
    if (!allowed) return;
    api
      .get<{ events: ApiEvent[] }>("/users/me/messageable-events")
      .then((r) => setEvents(r.data?.events || []))
      .catch(() => setEvents([]));
  }, [allowed]);

  useEffect(() => {
    if (!allowed || !eventId || isAdmin) {
      setQuota(null);
      return;
    }
    let cancelled = false;
    api
      .get<QuotaState>(`/messages/quota/${eventId}`)
      .then((r) => { if (!cancelled) setQuota(r.data); })
      .catch(() => { if (!cancelled) setQuota(null); });
    return () => { cancelled = true; };
  }, [allowed, eventId, isAdmin, result]);

  const toggleTarget = (c: Target) =>
    setTargets((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  async function send() {
    if (!eventId || !subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post<SendResult>("/messages/send", {
        event_id: eventId,
        channel,
        subject: subject.trim(),
        body: body.trim(),
        target_categories: targets,
      });
      setResult(data);
      setSubject("");
      setBody("");
      Alert.alert(t("messaging.sent_toast"));
    } catch (e: unknown) {
      const errResp = (e as { response?: { status?: number; data?: { detail?: string } } })?.response;
      const status = errResp?.status;
      const detail = errResp?.data?.detail;
      if (status === 429 && typeof detail === "string") {
        Alert.alert(t("messaging.quota_reached_title"), detail);
      } else if (status === 403 && typeof detail === "string") {
        Alert.alert(detail);
      } else if (status === 402) {
        Alert.alert(t("messaging.blocked_title"));
      } else {
        Alert.alert(t("auth.error_generic"));
      }
    } finally {
      setSending(false);
    }
  }

  if (!allowed) {
    return (
      <View style={styles.empty} testID="messaging-blocked">
        <Ionicons name="alert-circle-outline" size={36} color={colors.gold} />
        <Text style={[text.h2, { marginTop: spacing.md, textAlign: "center" }]}>
          {t("messaging.blocked_title")}
        </Text>
        <Text style={styles.blockedHelp}>{t("messaging.blocked_help")}</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.help}>{t("messaging.consent_help")}</Text>
      <Text style={styles.label}>{t("messaging.pick_event")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {events.map((ev) => {
          const active = ev.id === eventId;
          return (
            <Pressable
              key={ev.id}
              testID={`msg-event-${ev.id}`}
              onPress={() => setEventId(ev.id)}
              style={[styles.eventChip, active && styles.eventChipActive]}
            >
              <Text
                style={[styles.eventChipText, active && styles.eventChipTextActive]}
                numberOfLines={1}
              >
                {eventTitle(ev, lang)}
              </Text>
              {ev.start_date ? <Text style={styles.eventChipDate}>{ev.start_date}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {quota && !quota.unlimited && eventId ? (
        <View
          testID="messaging-quota"
          style={[styles.quotaBox, quota.remaining === 0 && styles.quotaBoxEmpty]}
        >
          <Ionicons
            name={quota.remaining === 0 ? "lock-closed-outline" : "speedometer-outline"}
            size={14}
            color={quota.remaining === 0 ? colors.ember : colors.gold}
          />
          <Text style={[styles.quotaText, quota.remaining === 0 && { color: colors.ember }]}>
            {t("messaging.quota_used", { used: String(quota.used), limit: String(quota.limit) })}
          </Text>
        </View>
      ) : null}

      <Text style={[styles.label, { marginTop: spacing.lg }]}>{t("messaging.channel")}</Text>
      <View style={styles.chipRow}>
        {CHANNELS.map((c) => {
          const active = channel === c;
          return (
            <Pressable
              key={c}
              testID={`msg-channel-${c}`}
              onPress={() => setChannel(c)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`messaging.ch_${c}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>{t("messaging.targets")}</Text>
      <View style={styles.chipRow}>
        {TARGET_CATEGORIES.map((c) => {
          const active = targets.includes(c);
          return (
            <Pressable
              key={c}
              testID={`msg-target-${c}`}
              onPress={() => toggleTarget(c)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(`account.type_${c}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.help}>
        {targets.length === 0
          ? t("messaging.targets_help_all")
          : t("messaging.targets_help_some")}
      </Text>

      <Text style={[styles.label, { marginTop: spacing.lg }]}>{t("messaging.subject")}</Text>
      <TextInput
        testID="msg-subject"
        value={subject}
        onChangeText={setSubject}
        maxLength={120}
        style={styles.input}
        placeholderTextColor={colors.stone}
      />

      <Text style={[styles.label, { marginTop: spacing.lg }]}>{t("messaging.body")}</Text>
      <TextInput
        testID="msg-body"
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        maxLength={1500}
        style={[styles.input, styles.textarea]}
        placeholderTextColor={colors.stone}
        textAlignVertical="top"
      />
      <Text style={styles.help}>{t("messaging.body_hint")}</Text>

      <Pressable
        testID="msg-send"
        onPress={send}
        disabled={
          sending ||
          !eventId ||
          !subject.trim() ||
          !body.trim() ||
          (quota ? !quota.unlimited && quota.remaining === 0 : false)
        }
        style={({ pressed }) => [
          styles.primaryBtn,
          { marginTop: spacing.lg },
          (pressed ||
            sending ||
            !eventId ||
            !subject.trim() ||
            !body.trim() ||
            (quota ? !quota.unlimited && quota.remaining === 0 : false)) && {
            opacity: 0.6,
          },
        ]}
      >
        <Ionicons name="send" size={14} color={colors.bone} />
        <Text style={styles.primaryBtnText}>
          {sending ? "…" : t("messaging.send_btn")}
        </Text>
      </Pressable>

      {result ? (
        <View style={styles.resultCard} testID="msg-result">
          <Text style={styles.resultTitle}>{t("messaging.result")}</Text>
          <Text style={styles.resultText}>
            {t("messaging.result_text", {
              push: String(result.sent_push ?? 0),
              email: String(result.sent_email ?? 0),
              recipients: String(result.recipients ?? 0),
            })}
          </Text>
          {(channel === "push" || channel === "both") &&
          (result.sent_push ?? 0) === 0 &&
          (result.push_eligible ?? 0) === 0 ? (
            <Text style={styles.resultWarn} testID="msg-no-push-tokens">
              {t("messaging.no_push_tokens")}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Tabs shell ────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ event_id?: string | string[]; tab?: string | string[] }>();
  const initialEventId = Array.isArray(params.event_id) ? params.event_id[0] : params.event_id || "";
  const initialTabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab: TabKey =
    initialTabRaw === "sent" || initialTabRaw === "compose" ? initialTabRaw : "inbox";
  const { t } = useSettings();
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // Refresh unread count whenever screen comes back into focus.
  useFocusEffect(
    useCallback(() => {
      api
        .get<InboxGroup[]>("/messages/inbox")
        .then((r) => {
          const t2 = (r.data || []).reduce((acc, g) => acc + g.unread, 0);
          setUnreadTotal(t2);
        })
        .catch(() => setUnreadTotal(0));
    }, []),
  );

  return (
    <AppBackground>
      <SafeAreaView edges={["top"]} style={styles.safe} testID="messages-screen">
        <View style={styles.topBar}>
          <Pressable
            testID="messages-back"
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.gold} />
          </Pressable>
          <Text style={styles.topBarTitle}>{t("messages.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabBar}>
          {(["inbox", "sent", "compose"] as const).map((k) => {
            const active = tab === k;
            return (
              <Pressable
                key={k}
                testID={`messages-tab-${k}`}
                onPress={() => setTab(k)}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
              >
                <Ionicons
                  name={
                    k === "inbox" ? "mail-outline" : k === "sent" ? "send-outline" : "add-circle-outline"
                  }
                  size={14}
                  color={active ? colors.gold : colors.stone}
                />
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t(`messages.tab_${k}`)}
                </Text>
                {k === "inbox" && unreadTotal > 0 ? (
                  <View style={styles.tabBadge} testID="messages-unread-total">
                    <Text style={styles.tabBadgeText}>{unreadTotal}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {tab === "inbox" ? <InboxView onUnreadChange={setUnreadTotal} /> : null}
          {tab === "sent" ? <SentView /> : null}
          {tab === "compose" ? <ComposerView initialEventId={initialEventId} /> : null}
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "transparent" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topBarTitle: {
    color: colors.bone,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
    flex: 1,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
    paddingHorizontal: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: colors.gold },
  tabBtnText: {
    color: colors.stone,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tabBtnTextActive: { color: colors.gold },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.ember,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: { color: colors.bone, fontSize: 10, fontWeight: "700" },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { paddingVertical: spacing.xxl, alignItems: "center" },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: { color: colors.stone, marginTop: spacing.md, textAlign: "center" },
  blockedHelp: {
    color: colors.stone,
    textAlign: "center",
    marginTop: spacing.md,
    lineHeight: 20,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: "rgba(14,11,9,0.92)",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  groupImg: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
  },
  groupImgFallback: { alignItems: "center", justifyContent: "center" },
  groupTitle: { color: colors.bone, fontSize: 14, fontWeight: "700" },
  groupDate: { color: colors.stone, fontSize: 11, marginTop: 2 },
  groupCount: { color: colors.stone, fontSize: 11, marginRight: 4 },
  unreadPill: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.ember,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
  unreadPillText: { color: colors.bone, fontSize: 11, fontWeight: "700" },
  groupChildren: {
    marginTop: spacing.sm,
    marginLeft: spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.edge,
    gap: 6,
  },
  messageRow: {
    backgroundColor: "rgba(14,11,9,0.85)",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ember,
  },
  messageSubject: { color: colors.stone, fontSize: 13, fontWeight: "600", flex: 1 },
  messageMeta: { color: colors.stone, fontSize: 11, marginTop: 2 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalSubject: {
    color: colors.bone,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalMeta: {
    color: colors.gold,
    fontSize: 11,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  modalBodyScroll: { maxHeight: 360 },
  modalBody: { color: colors.bone, fontSize: 14, lineHeight: 21 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  modalDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalDeleteText: { color: colors.ember, fontSize: 12, fontWeight: "700" },
  modalCloseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  modalCloseText: { color: colors.bone, fontSize: 12, fontWeight: "700" },

  // Composer (kept identical to previous version)
  help: { color: colors.stone, marginTop: 6, lineHeight: 19 },
  label: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(14,11,9,0.95)",
    borderColor: colors.edge,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.bone,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
  },
  textarea: { minHeight: 120 },
  eventChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.7)",
    minWidth: 160,
    maxWidth: 240,
  },
  eventChipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  eventChipText: { color: colors.bone, fontSize: 13, fontWeight: "600" },
  eventChipTextActive: { color: colors.gold },
  eventChipDate: { color: colors.stone, fontSize: 11, marginTop: 2 },
  quotaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.06)",
  },
  quotaBoxEmpty: {
    borderColor: colors.ember,
    backgroundColor: "rgba(180,70,52,0.08)",
  },
  quotaText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: "rgba(14,11,9,0.7)",
  },
  chipActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.12)",
  },
  chipText: { color: colors.stone, fontSize: 12, fontWeight: "600", letterSpacing: 0.4 },
  chipTextActive: { color: colors.gold },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.ember,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.sm,
  },
  primaryBtnText: {
    color: colors.bone,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  resultCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: "rgba(201,161,74,0.08)",
  },
  resultTitle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  resultText: { color: colors.bone, fontSize: 13, lineHeight: 19 },
  resultWarn: {
    color: colors.ember,
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 17,
    marginTop: spacing.sm,
  },
});
