"use client";

import dynamic from "next/dynamic";

const MemberDetailContent = dynamic(() => import("@/context/MemberDetailContent"), { ssr: false });
const MemberForm = dynamic(() => import("@/components/MemberForm"), { ssr: false });
import { Person } from "@/types";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Edit2, ExternalLink, Loader2, UserCheck, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMemberListView } from "@/context/MemberListContext";
import { useUser } from "@/components/UserProvider";
import { linkMyPerson } from "@/app/actions/user";

export default function MemberDetailModal() {
  const {
    memberModalId: memberId,
    setMemberModalId,
    showCreateMember,
    setShowCreateMember,
    setViewAsPersonId,
    setView,
    persons = [],
  } = useMemberListView();
  const { isEditor: canEdit, supabase, profile } = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [person, setPerson] = useState<Person | null>(null);
  const [privateData, setPrivateData] = useState<Record<
    string,
    unknown
  > | null>(null);

  const closeModal = () => {
    setMemberModalId(null);
    setShowCreateMember(false);
    setIsEditing(false);
    setFormDirty(false);
    setFormLoading(false);
  };

  const handleCancel = () => {
    if (formDirty) {
      if (confirm("Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn hủy bỏ?")) {
        if (showCreateMember) {
          setShowCreateMember(false);
        } else {
          setIsEditing(false);
        }
      }
    } else {
      if (showCreateMember) {
        setShowCreateMember(false);
      } else {
        setIsEditing(false);
      }
    }
  };

  const handleClose = () => {
    if ((isEditing || showCreateMember) && formDirty) {
      if (confirm("Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn đóng?")) {
        closeModal();
      }
    } else {
      closeModal();
    }
  };

  const handleLinkPerson = async (personId: string | null) => {
    setIsLinking(true);
    const result = await linkMyPerson(personId);
    setIsLinking(false);
    if ("error" in result) {
      console.error("Link person failed:", result.error);
      return;
    }
    router.refresh();
  };

  const personsRef = useRef(persons);
  useEffect(() => {
    personsRef.current = persons;
  }, [persons]);

  const fetchData = useCallback(
    async (id: string, forceRefetch = false) => {
      setLoading(true);
      setError(null);
      try {
        // 1. Tìm trong context persons trước (giúp tải ngay lập tức và tránh lỗi RLS cho khách)
        if (!forceRefetch) {
          const localPerson = personsRef.current.find((p) => p.id === id);
          if (localPerson) {
            setPerson(localPerson);
            setPrivateData(null);
            setLoading(false);
            return;
          }
        }

        // 2. Tải dữ liệu công khai từ Supabase (fallback)
        const { data: personData, error: personError } = await supabase
          .from("persons")
          .select("*")
          .eq("id", id)
          .single();

        if (personError || !personData) {
          throw new Error("Không thể tải thông tin thành viên.");
        }
        setPerson(personData);

        // 3. Tải thông tin riêng tư nếu là Admin hoặc Editor
        if (canEdit) {
          const { data: privData } = await supabase
            .from("person_details_private")
            .select("*")
            .eq("person_id", id)
            .maybeSingle();
          setPrivateData(privData || {});
        } else {
          setPrivateData(null);
        }
      } catch (err) {
        console.error("Error fetching member details:", err);
        // @ts-expect-error - err is caught as unknown, but we check for message
        setError(err?.message || "Đã xảy ra lỗi hệ thống.");
      } finally {
        setLoading(false);
      }
    },
    [canEdit, supabase],
  );

  // Sync state with URL parameter or create mode
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    if (memberId) {
      setIsOpen(true);
      if (!person || person.id !== memberId) {
        setIsEditing(false); // always start on detail view when opening
        fetchData(memberId);
      }
    } else if (showCreateMember) {
      setIsOpen(true);
      setIsEditing(false);
      setPerson(null);
      setPrivateData(null);
      setError(null);
    } else {
      setIsOpen(false);
      timeoutId = setTimeout(() => {
        setPerson(null);
        setPrivateData(null);
        setError(null);
        setIsEditing(false);
      }, 300);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [memberId, showCreateMember, fetchData, person]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Called by MemberForm after a successful save
  const handleEditSuccess = (savedPersonId: string) => {
    // Clear stale data first so the loading state is shown while refetching
    setIsEditing(false);
    setPerson(null);
    setPrivateData(null);
    fetchData(savedPersonId, true);
    // Revalidate Next.js server component cache so the dashboard list/members updates
    router.refresh();
  };

  // Called by MemberForm after a successful CREATE
  const handleCreateSuccess = (savedPersonId: string) => {
    setShowCreateMember(false);
    // Open the detail modal for the new member
    setMemberModalId(savedPersonId);
    // Delay refresh so React commits state changes first,
    // ensuring the server component re-fetches the updated member list.
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  // initialData for MemberForm — merge public + private
  const formInitialData = useMemo(() => {
    return person ? { ...person, ...(privateData ?? {}) } : undefined;
  }, [person, privateData]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
        >
          {/* Lớp nền tách riêng để vùng cuộn của modal được composite trên GPU
              (backdrop-filter trên ancestor sẽ chặn composited scrolling → giật khi cuộn lần đầu).
              Gộp luôn click-away: chỉ đóng khi không ở chế độ chỉnh sửa/thêm mới. */}
          <div
            className={`absolute inset-0 bg-stone-900/40 backdrop-blur-sm ${
              !isEditing && !showCreateMember ? "cursor-pointer" : ""
            }`}
            onClick={
              !isEditing && !showCreateMember ? closeModal : undefined
            }
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-stone-200"
          >
            {/* Sticky Header Actions */}
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {isEditing || showCreateMember ? (
                /* In edit/create mode — show Cancel and Save/Create buttons */
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    form="member-form"
                    disabled={formLoading || (!showCreateMember && !formDirty)}
                    className="inline-flex items-center justify-center shrink-0 gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-full shadow-xs hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    {formLoading && <Loader2 className="size-4 animate-spin" />}
                    <span>{showCreateMember ? "Thêm mới" : "Lưu thay đổi"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center shrink-0 gap-1.5 px-3 py-2 bg-stone-100/80 text-stone-700 rounded-full hover:bg-stone-200 font-semibold text-sm border border-stone-200/50 hover:-translate-y-0.5 hover:shadow-xs active:translate-y-0 transition-all duration-300 cursor-pointer"
                  >
                    <span>Hủy bỏ</span>
                  </button>
                </div>
              ) : (
                person && (
                  <>
                    {canEdit && (
                      <>
                        <Link
                          href={`/dashboard/members/${person.id}`}
                          className="btn-amber text-sm"
                        >
                          <ExternalLink className="size-4" />
                          <span className="hidden sm:inline">Xem</span>
                        </Link>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="btn-amber text-sm"
                        >
                          <Edit2 className="size-4" />
                          <span className="hidden sm:inline">Chỉnh sửa</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setViewAsPersonId(person.id);
                        setView("tree");
                        closeModal();
                      }}
                      className="btn-amber text-sm"
                      title="Xem cây gia phả với tư cách người này"
                    >
                      <UserCheck className="size-4" />
                      <span className="hidden sm:inline">Xem với tư cách</span>
                    </button>
                    {/* "Đây là tôi" / "Bỏ liên kết" */}
                    {profile && (
                      profile.person_id === person.id ? (
                        <button
                          onClick={() => handleLinkPerson(null)}
                          disabled={isLinking}
                          className="btn-amber text-sm opacity-80"
                          title="Bỏ liên kết tài khoản với người này"
                        >
                          <UserCheck className="size-4" />
                          <span className="hidden sm:inline">Bỏ liên kết</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLinkPerson(person.id)}
                          disabled={isLinking}
                          className="btn-amber text-sm"
                          title="Đánh dấu đây là tôi"
                        >
                          <UserCheck className="size-4" />
                          <span className="hidden sm:inline">Đây là tôi</span>
                        </button>
                      )
                    )}
                  </>
                )
              )}
              <button
                onClick={handleClose}
                className="size-10 flex items-center justify-center bg-stone-100/80 text-stone-600 rounded-full hover:bg-stone-200 hover:text-stone-900 shadow-sm border border-stone-200/50 transition-colors"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-[500px] flex items-center justify-center flex-col gap-4"
                >
                  <div className="size-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-stone-500 font-medium">Đang tải...</p>
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-h-[400px] flex items-center justify-center flex-col gap-4 p-8 text-center"
                >
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <AlertCircle className="size-8" />
                  </div>
                  <p className="text-red-600 font-medium text-lg">{error}</p>
                  <button
                    onClick={closeModal}
                    className="btn mt-2 rounded-full"
                  >
                    Đóng
                  </button>
                </motion.div>
              ) : isEditing && formInitialData ? (
                /* ── EDIT MODE ── */
                <motion.div
                  key="editing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8"
                >
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                    Chỉnh sửa thành viên
                  </h2>
                  <MemberForm
                    initialData={formInitialData as Person}
                    isEditing={true}
                    canEditPrivate={canEdit}
                    onSuccess={handleEditSuccess}
                    onCancel={handleCancel}
                    onDirtyChange={setFormDirty}
                    onLoadingChange={setFormLoading}
                  />
                </motion.div>
              ) : showCreateMember ? (
                /* ── CREATE MODE ── */
                <motion.div
                  key="creating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-8 pt-16 pb-8"
                >
                  <h2 className="text-xl font-serif font-bold text-stone-800 mb-6">
                    Thêm thành viên mới
                  </h2>
                  <MemberForm
                    canEditPrivate={canEdit}
                    onSuccess={handleCreateSuccess}
                    onCancel={handleCancel}
                    onDirtyChange={setFormDirty}
                    onLoadingChange={setFormLoading}
                  />
                </motion.div>
              ) : person ? (
                /* ── DETAIL MODE ── */
                <motion.div
                  key="details"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 overflow-y-auto custom-scrollbar"
                >
                  <MemberDetailContent
                    person={person}
                    privateData={privateData}
                    isAdmin={canEdit}
                    canEdit={canEdit}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
