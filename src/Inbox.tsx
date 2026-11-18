import React, { useEffect, useMemo, useRef, useState } from "react";
import type { AttachmentInfo, EmailListItem, EmailDetail, MailFolder, PickedFile, ChatMessage } from "./global";
import type { EmailAnalysis } from "../electron/providers/types";
import { theme, groupAccent } from "./theme";
import {
  IconInbox,
  IconSent,
  IconRefresh,
  IconGear,
  IconSparkle,
  IconFile,
  IconCheck,
  IconSearch,
  IconPaperclip,
  IconChevronLeft,
  IconChevronRight,
  IconChat,
} from "./icons";

const { color } = theme;

function pillButtonStyle(kind: "primary" | "outline"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 18px",
    borderRadius: theme.radius.pill,
    fontSize: 13,
    fontWeight: 650,
    border: `1px solid ${kind === "primary" ? color.accent : color.border}`,
    background: kind === "primary" ? color.accent : color.bg,
    color: kind === "primary" ? "#fff" : color.text,
  };
  return base;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 읽기창에서 첨부파일 목록 + 다운로드(다른 이름으로 저장) 버튼
function AttachmentList({ messageId, attachments }: { messageId: string; attachments: AttachmentInfo[] }) {
  const [status, setStatus] = useState<Record<string, "idle" | "downloading" | "done" | "error">>({});

  if (attachments.length === 0) return null;

  const download = async (att: AttachmentInfo) => {
    setStatus((s) => ({ ...s, [att.attachmentId]: "downloading" }));
    try {
      const result = await window.api.downloadAttachment(messageId, att.attachmentId, att.filename);
      setStatus((s) => ({
        ...s,
        [att.attachmentId]: result.canceled ? "idle" : result.ok ? "done" : "error",
      }));
    } catch {
      setStatus((s) => ({ ...s, [att.attachmentId]: "error" }));
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 750,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: color.muted,
          marginBottom: 10,
        }}
      >
        첨부파일 {attachments.length}개
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {attachments.map((att) => {
          const st = status[att.attachmentId] ?? "idle";
          return (
            <button
              key={att.attachmentId}
              onClick={() => download(att)}
              disabled={st === "downloading"}
              title={att.filename}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 13px",
                border: `1px solid ${color.border}`,
                borderRadius: 10,
                background: color.surface2,
                cursor: st === "downloading" ? "default" : "pointer",
                fontSize: 12.5,
                fontWeight: 550,
                color: color.text,
                maxWidth: 280,
              }}
            >
              <IconFile size={14} style={{ color: color.muted, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {att.filename}
              </span>
              <span style={{ color: color.muted, fontWeight: 400, flexShrink: 0 }}>
                ({formatFileSize(att.size)})
              </span>
              {st === "downloading" && <span style={{ color: color.muted, flexShrink: 0 }}>다운로드 중…</span>}
              {st === "done" && <IconCheck size={14} style={{ color: color.accent, flexShrink: 0 }} />}
              {st === "error" && <span style={{ color: color.danger, flexShrink: 0 }}>실패</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 답장 작성 시 파일 첨부(진짜 메일 보내듯) — 여기선 선택/제거만 하고, 실제 읽기/업로드는 발송 시점에 경로로 처리
function ComposeAttachments({
  files,
  onAdd,
  onRemove,
}: {
  files: PickedFile[];
  onAdd: (files: PickedFile[]) => void;
  onRemove: (path: string) => void;
}) {
  const pick = async () => {
    const picked = await window.api.pickAttachments();
    if (picked.length === 0) return;
    const existingPaths = new Set(files.map((f) => f.path));
    onAdd(picked.filter((f) => !existingPaths.has(f.path)));
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {files.map((f) => (
            <div
              key={f.path}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 8px 6px 12px",
                border: `1px solid ${color.border}`,
                borderRadius: 10,
                background: color.surface2,
                fontSize: 12.5,
                color: color.text,
                maxWidth: 280,
              }}
            >
              <IconFile size={14} style={{ color: color.muted, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.filename}
              </span>
              <span style={{ color: color.muted, flexShrink: 0 }}>({formatFileSize(f.size)})</span>
              <button
                type="button"
                onClick={() => onRemove(f.path)}
                title="제거"
                style={{
                  flexShrink: 0,
                  border: "none",
                  background: "transparent",
                  color: color.muted,
                  fontSize: 16,
                  lineHeight: 1,
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={pick}
        style={{ ...pillButtonStyle("outline"), padding: "7px 14px", fontSize: 12.5 }}
      >
        <IconPaperclip size={13} />
        파일 첨부
      </button>
    </div>
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// 목록 행에 보여줄 짧은 날짜/시간 (아웃룩/Gmail 스타일: 오늘은 시간만, 올해는 월/일, 그 외는 연도까지)
function formatItemDate(dateStr: string, now: Date): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  if (startOfDay(d).getTime() === startOfDay(now).getTime()) {
    return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  }
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

// 아웃룩처럼 오늘/어제/이번 주/지난 주/이번 달/그 이전(월별)로 묶기 위한 그룹 라벨
function getDateGroupLabel(dateStr: string, now: Date): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "날짜 없음";

  const today = startOfDay(now);
  const day = startOfDay(d);
  const diffDays = Math.round((today.getTime() - day.getTime()) / 86400000);

  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";

  const mondayOffset = (today.getDay() + 6) % 7; // 오늘 기준 이번 주 월요일까지 거리
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - mondayOffset);
  if (day.getTime() >= thisWeekStart.getTime()) return "이번 주";

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);
  if (day.getTime() >= lastWeekStart.getTime()) return "지난 주";

  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "이번 달";

  const monthsDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (monthsDiff === 1) return "지난달";

  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

// 이미 최신순으로 정렬되어 오는 목록을, 연속된 같은 날짜그룹끼리 묶음
function groupByDate(list: EmailListItem[], now: Date): { label: string; items: EmailListItem[] }[] {
  const groups: { label: string; items: EmailListItem[] }[] = [];
  for (const item of list) {
    const label = getDateGroupLabel(item.date, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

// Gmail 원본 HTML을 그대로 렌더링 (이미지/스타일 포함). 스크립트는 sandbox로 차단.
function EmailBodyView({ html, fallbackText }: { html: string; fallbackText: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  // 로드 시점 한 번만 측정하면 이미지가 늦게 로딩되거나 창을 최대화해서 폭이 바뀔 때
  // (텍스트가 다시 줄바꿈되며 높이가 변함) 실제 내용보다 iframe이 작게 남아 잘려 보이는
  // 문제가 있었음 → ResizeObserver로 내부 문서 크기를 계속 감시해서 자동으로 맞춤
  const attachAutoResize = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    const measure = () => setHeight(Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) + 24);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
  };

  if (!html) {
    return (
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 14.5,
          lineHeight: 1.85,
          color: color.text,
          marginBottom: 22,
        }}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title="email-body"
      srcDoc={html}
      onLoad={attachAutoResize}
      // allow-same-origin은 높이 자동조절을 위한 DOM 접근만 허용하고,
      // allow-scripts는 넣지 않아 메일 안의 스크립트는 실행되지 않음
      sandbox="allow-same-origin"
      style={{
        width: "100%",
        height,
        border: `1px solid ${color.border}`,
        borderRadius: 10,
        marginBottom: 22,
        background: color.bg,
      }}
    />
  );
}

const FOLDER_LABEL: Record<MailFolder, string> = { inbox: "받은메일함", sent: "보낸메일함" };

export default function Inbox({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [folder, setFolder] = useState<MailFolder>("inbox");
  const [list, setList] = useState<EmailListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<EmailDetail | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);

  const [aiTab, setAiTab] = useState<"draft" | "chat">("draft");

  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftState, setDraftState] = useState<"idle" | "loading" | "error">("idle");
  const [draftError, setDraftError] = useState("");

  const [sendState, setSendState] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [composeFiles, setComposeFiles] = useState<PickedFile[]>([]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  // 입력 내용에 맞춰 질문 입력창 높이를 자동으로 늘림(최대 160px, 그 이상은 내부 스크롤)
  useEffect(() => {
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [chatInput]);

  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef<number | null>(null);

  const groupedList = useMemo(() => groupByDate(list, new Date()), [list]);

  // 처음부터 다시 조회 (폴더/검색어 전환, 새로고침 버튼) — 목록을 통째로 교체하고 페이지 위치도 초기화
  const loadList = async (f: MailFolder = folder, q: string = searchQuery) => {
    setLoadingList(true);
    try {
      const page = await window.api.listEmails(f, q.trim() || undefined);
      setList(page.items);
      setNextPageToken(page.nextPageToken);
    } finally {
      setLoadingList(false);
    }
  };

  // "이전 메일 더 보기" — 지금 보이는 목록 뒤에 이어붙임 (Gmail의 다음 페이지 토큰 사용)
  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await window.api.listEmails(folder, searchQuery.trim() || undefined, nextPageToken);
      setList((prev) => [...prev, ...page.items]);
      setNextPageToken(page.nextPageToken);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setSelected(null);
    loadList(folder, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  // 새 메일이 오면 화면에 자동으로 뜨도록 45초마다 조용히(로딩 표시 없이) 첫 페이지를 다시 조회.
  // 통째로 교체하면 "이전 메일 더 보기"로 불러온 과거 메일이 날아가므로, 기존 목록에 없는
  // 새 항목만 맨 앞에 이어붙임 — 페이지 위치(nextPageToken)는 건드리지 않음.
  // 실패해도 다음 주기에 다시 시도하면 되니 조용히 무시. 급하면 "새로고침" 버튼으로 즉시 갱신 가능.
  useEffect(() => {
    const interval = window.setInterval(() => {
      window.api
        .listEmails(folder, searchQuery.trim() || undefined)
        .then((page) => {
          setList((prev) => {
            const existingIds = new Set(prev.map((i) => i.id));
            const freshOnes = page.items.filter((i) => !existingIds.has(i.id));
            return freshOnes.length > 0 ? [...freshOnes, ...prev] : prev;
          });
        })
        .catch(() => {});
    }, 45000);
    return () => window.clearInterval(interval);
  }, [folder, searchQuery]);

  // Gmail 검색 문법(from:, has:attachment 등) 그대로 입력 가능. 타이핑마다 요청하지 않도록 살짝 지연
  const onSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current !== null) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => loadList(folder, value), 400);
  };

  const openEmail = async (item: EmailListItem) => {
    setAiTab("draft");
    setAnalysis(null);
    setDraftText("");
    setDraftState("idle");
    setSendState("idle");
    setComposeFiles([]);
    setChatMessages([]);
    setChatInput("");
    setChatError("");
    const detail = await window.api.getEmail(item.id, folder);
    setSelected(detail);
  };

  const generateDraft = async () => {
    if (!selected) return;
    setDraftState("loading");
    try {
      const result = await window.api.generateDraft(selected);
      setAnalysis(result);
      setDraftText(result.suggestedReply);
      setDraftState("idle");
    } catch (e) {
      setDraftState("error");
      setDraftError((e as Error).message);
    }
  };

  const sendChatMessage = async () => {
    if (!selected || !chatInput.trim() || chatLoading) return;
    const nextHistory: ChatMessage[] = [...chatMessages, { role: "user", content: chatInput.trim() }];
    setChatMessages(nextHistory);
    setChatInput("");
    setChatLoading(true);
    setChatError("");
    try {
      const answer = await window.api.askAboutEmail(selected, nextHistory);
      setChatMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (e) {
      setChatError((e as Error).message);
    } finally {
      setChatLoading(false);
    }
  };

  const send = async () => {
    if (!selected) return;
    setSendState("loading");
    try {
      await window.api.sendReply(
        selected,
        draftText,
        composeFiles.map((f) => f.path)
      );
      setSendState("sent");
    } catch (e) {
      setSendState("error");
      alert("발송 실패: " + (e as Error).message);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* 사이드바 */}
      <div
        style={{
          width: 220,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: color.surface2,
          borderRight: `1px solid ${color.border}`,
          padding: "22px 14px 14px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontWeight: 750,
            fontSize: 14.5,
            letterSpacing: "-0.01em",
            marginBottom: 22,
            padding: "0 8px",
            color: color.text,
          }}
        >
          <IconSparkle size={18} style={{ color: color.accent }} />
          메일 도우미
        </div>

        {(["inbox", "sent"] as MailFolder[]).map((f) => {
          const active = folder === f;
          return (
            <button
              key={f}
              onClick={() => setFolder(f)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "9px 12px",
                marginBottom: 4,
                border: "none",
                borderRadius: 8,
                textAlign: "left",
                fontSize: 13,
                fontWeight: active ? 700 : 550,
                background: active ? color.bg : "transparent",
                color: active ? color.accent : color.muted,
                boxShadow: active ? "0 1px 2px rgba(20,20,26,0.06)" : "none",
              }}
            >
              {f === "inbox" ? <IconInbox /> : <IconSent />}
              {FOLDER_LABEL[f]}
            </button>
          );
        })}

        <div style={{ height: 1, background: color.border, margin: "12px 4px" }} />

        <button
          onClick={() => loadList()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "9px 12px",
            marginBottom: 4,
            border: "none",
            borderRadius: 8,
            textAlign: "left",
            fontSize: 13,
            fontWeight: 550,
            background: "transparent",
            color: color.muted,
          }}
        >
          <IconRefresh />
          새로고침
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={onOpenSettings}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            padding: "9px 12px",
            border: "none",
            borderRadius: 8,
            textAlign: "left",
            fontSize: 13,
            fontWeight: 550,
            background: "transparent",
            color: color.muted,
          }}
        >
          <IconGear />
          설정
        </button>
      </div>

      {/* 메일 목록 (접으면 우측 상세 화면이 그만큼 넓어짐) */}
      <div
        style={{
          width: listCollapsed ? 0 : 400,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: color.bg,
          overflow: "hidden",
          transition: "width 0.18s ease",
        }}
      >
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${color.border}` }}>
          <div style={{ position: "relative" }}>
            <IconSearch
              size={15}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: color.muted }}
            />
            <input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="메일 검색 (제목, 보낸사람, 내용...)"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "9px 12px 9px 34px",
                border: `1px solid ${color.border}`,
                borderRadius: theme.radius.pill,
                fontSize: 13,
                background: color.surface2,
                color: color.text,
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingList && <p style={{ padding: 16, color: color.muted, fontSize: 13 }}>불러오는 중...</p>}
          {!loadingList && list.length === 0 && (
            <p style={{ padding: 16, color: color.muted, fontSize: 13 }}>
              {searchQuery.trim()
                ? `"${searchQuery.trim()}"에 대한 검색 결과가 없습니다.`
                : `${FOLDER_LABEL[folder]}에 메일이 없습니다.`}
            </p>
          )}
          {groupedList.map((group) => {
          const accent = groupAccent(group.label);
          return (
            <div key={group.label + "-" + group.items[0].id}>
              <div
                style={{
                  padding: "14px 22px 8px",
                  fontSize: 11,
                  fontWeight: 750,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: accent.text,
                  background: color.bg,
                  borderBottom: `1px solid ${accent.border}`,
                  marginBottom: 2,
                }}
              >
                {group.label}
              </div>

              {group.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openEmail(item)}
                  style={{
                    padding: "13px 22px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    cursor: "pointer",
                    background: selected?.id === item.id ? color.accentSoft : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      marginTop: 6,
                      flexShrink: 0,
                      background: item.isUnread ? color.accent : "transparent",
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: item.isUnread ? 750 : 550,
                          color: color.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {folder === "sent" ? "받는사람: " : ""}
                        {item.sender}
                      </div>
                      <div style={{ fontSize: 11.5, color: color.muted, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                        {formatItemDate(item.date, new Date())}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: item.isUnread ? 700 : 400,
                        color: color.text,
                        marginTop: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.subject}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: color.muted,
                        marginTop: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.snippet}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {!loadingList && nextPageToken && (
          <div style={{ padding: 16, textAlign: "center" }}>
            <button
              onClick={loadMore}
              disabled={loadingMore}
              style={{ ...pillButtonStyle("outline"), width: "100%", justifyContent: "center" }}
            >
              {loadingMore ? "불러오는 중..." : "이전 메일 더 보기"}
            </button>
          </div>
        )}
        </div>
      </div>

      {/* 목록 접기/펼치기 토글 — 가는 구분선 위에 눈에 띄는 알약 모양 핸들을 띄움 */}
      <div style={{ flexShrink: 0, width: 1, background: color.border, position: "relative" }}>
        <button
          onClick={() => setListCollapsed((v) => !v)}
          title={listCollapsed ? "메일 목록 펼치기" : "메일 목록 접기"}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 22,
            height: 44,
            borderRadius: 8,
            border: `1px solid ${color.border}`,
            background: color.bg,
            color: color.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 4px rgba(20,20,26,0.16)",
            zIndex: 2,
          }}
        >
          {listCollapsed ? <IconChevronRight size={13} /> : <IconChevronLeft size={13} />}
        </button>
      </div>

      {/* 읽기창 */}
      <div style={{ flex: 1, overflowY: "auto", background: color.bg }}>
        {!selected && (
          <p style={{ color: color.muted, fontSize: 13, padding: "40px 24px" }}>왼쪽에서 메일을 선택하세요.</p>
        )}

        {selected && (
          <div style={{ padding: "40px 32px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-0.01em", margin: "0 0 8px", color: color.text }}>
              {selected.subject}
            </h2>
            <div
              style={{
                fontSize: 13,
                color: color.muted,
                marginBottom: 26,
                paddingBottom: 20,
                borderBottom: `1px solid ${color.border}`,
              }}
            >
              {selected.folder === "sent" ? "받는사람: " : ""}
              <strong style={{ color: color.text, fontWeight: 650 }}>{selected.sender}</strong> · {selected.date}
            </div>

            <EmailBodyView html={selected.bodyHtml} fallbackText={selected.body || selected.snippet} />

            <AttachmentList messageId={selected.id} attachments={selected.attachments} />

            {selected.folder === "inbox" && (
              <>
                <div
                  style={{
                    display: "inline-flex",
                    gap: 4,
                    padding: 3,
                    background: color.surface2,
                    borderRadius: theme.radius.pill,
                    marginBottom: 16,
                  }}
                >
                  <button
                    onClick={() => setAiTab("draft")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      padding: "7px 14px",
                      borderRadius: theme.radius.pill,
                      fontSize: 12.5,
                      fontWeight: 650,
                      background: aiTab === "draft" ? color.bg : "transparent",
                      color: aiTab === "draft" ? color.accent : color.muted,
                      boxShadow: aiTab === "draft" ? "0 1px 2px rgba(20,20,26,0.08)" : "none",
                    }}
                  >
                    <IconSparkle size={13} />
                    답장 초안
                  </button>
                  <button
                    onClick={() => setAiTab("chat")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      border: "none",
                      padding: "7px 14px",
                      borderRadius: theme.radius.pill,
                      fontSize: 12.5,
                      fontWeight: 650,
                      background: aiTab === "chat" ? color.bg : "transparent",
                      color: aiTab === "chat" ? color.accent : color.muted,
                      boxShadow: aiTab === "chat" ? "0 1px 2px rgba(20,20,26,0.08)" : "none",
                    }}
                  >
                    <IconChat size={13} />
                    질문하기
                  </button>
                </div>

                {aiTab === "draft" && (
                  <>
                    {!analysis && (
                      <div>
                        <button
                          onClick={generateDraft}
                          disabled={draftState === "loading"}
                          style={pillButtonStyle("primary")}
                        >
                          <IconSparkle size={15} />
                          {draftState === "loading" ? "분석 중..." : "AI 답장 초안 생성"}
                        </button>
                      </div>
                    )}
                    {draftState === "error" && (
                      <p style={{ color: color.danger, fontSize: 13, marginTop: 10 }}>{draftError}</p>
                    )}

                    {analysis && (
                      <div style={{ marginTop: 4 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 14,
                            flexWrap: "wrap",
                            background: color.accentSoft,
                            borderRadius: 12,
                            padding: "14px 18px",
                            fontSize: 12.5,
                            color: "#1f37a8",
                            marginBottom: 14,
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>분류 · {analysis.category}</span>
                          <span style={{ fontWeight: 700 }}>긴급도 · {analysis.urgency}</span>
                          <span>{analysis.summary}</span>
                        </div>

                        <textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          rows={10}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            padding: 16,
                            fontSize: 13.5,
                            lineHeight: 1.75,
                            border: `1px solid ${color.border}`,
                            borderRadius: 12,
                            background: color.surface2,
                            color: color.text,
                            resize: "vertical",
                          }}
                        />

                        <div style={{ marginTop: 14 }}>
                          <ComposeAttachments
                            files={composeFiles}
                            onAdd={(files) => setComposeFiles((prev) => [...prev, ...files])}
                            onRemove={(path) => setComposeFiles((prev) => prev.filter((f) => f.path !== path))}
                          />
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            onClick={generateDraft}
                            disabled={draftState === "loading"}
                            style={pillButtonStyle("outline")}
                          >
                            <IconRefresh size={15} />
                            다시 분석
                          </button>
                          <button
                            onClick={send}
                            disabled={sendState === "loading" || sendState === "sent"}
                            style={pillButtonStyle("primary")}
                          >
                            {sendState === "loading" ? "보내는 중..." : sendState === "sent" ? "발송 완료" : "보내기"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {aiTab === "chat" && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        maxHeight: 380,
                        overflowY: "auto",
                        marginBottom: 12,
                        paddingRight: 2,
                      }}
                    >
                      {chatMessages.length === 0 && (
                        <p style={{ color: color.muted, fontSize: 13, lineHeight: 1.6 }}>
                          이 메일 내용에 대해 무엇이든 물어보세요. 예: "마감일이 언제야?", "핵심만 3줄로 요약해줘"
                        </p>
                      )}
                      {chatMessages.map((m, i) => (
                        <div
                          key={i}
                          style={{
                            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: "85%",
                          }}
                        >
                          <div
                            style={{
                              padding: "10px 14px",
                              borderRadius: 14,
                              fontSize: 13.5,
                              lineHeight: 1.65,
                              whiteSpace: "pre-wrap",
                              background: m.role === "user" ? color.accent : color.surface2,
                              color: m.role === "user" ? "#fff" : color.text,
                            }}
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div style={{ alignSelf: "flex-start", color: color.muted, fontSize: 13 }}>
                          답변 작성 중...
                        </div>
                      )}
                    </div>

                    {chatError && (
                      <p style={{ color: color.danger, fontSize: 13, marginBottom: 8 }}>{chatError}</p>
                    )}

                    <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                      <textarea
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          // Enter는 줄바꿈(자동으로 칸이 늘어남), Ctrl/Cmd+Enter로 전송
                          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            sendChatMessage();
                          }
                        }}
                        placeholder="이 메일에 대해 질문해보세요... (Ctrl+Enter로 전송)"
                        rows={1}
                        style={{
                          flex: 1,
                          boxSizing: "border-box",
                          padding: "10px 14px",
                          border: `1px solid ${color.border}`,
                          borderRadius: 16,
                          fontSize: 13.5,
                          lineHeight: 1.5,
                          fontFamily: "inherit",
                          background: color.bg,
                          color: color.text,
                          resize: "none",
                          overflowY: "auto",
                          maxHeight: 160,
                        }}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        style={pillButtonStyle("primary")}
                      >
                        전송
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
