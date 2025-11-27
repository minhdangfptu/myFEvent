export function timeAgo(iso) {
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;

    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  } catch {
    return "";
  }
}


